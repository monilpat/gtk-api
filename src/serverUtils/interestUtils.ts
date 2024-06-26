import { InterestConfig, Trade } from './dbTypes'
import { DeliverTxResponse } from '@sifchain/sdk'
import {
  disperseInterestToRecepients,
  formatTokenForPriceList,
  getCoinGeckoCoinLists,
  getCoinIdsBySymbols,
  getTokenDenomFromRegistry,
  sendInterestToInterestAddress,
} from './marginUtils'
import { BigNumber } from 'bignumber.js'
import { processIfTradeIsReadyToBeClosed } from './closeUtils'
import { EncodeObject } from '@cosmjs/proto-signing'
import getTokenPrecision from './getTokenPrecision'
import {
  InterestByTokenType,
  PROCESS,
  DOMAIN,
  COMPOUNDING_PERIODS,
  CoinListOrder,
  ENV,
} from '../utils/constants/constants'
import { WalletKeeper } from './WalletKeeper'
import nullthrows from 'nullthrows'
import { constructCookie } from './constructCookie'
import _ from 'lodash'
import { delay, fetchWithRetries } from './serverUtils'
import * as Sentry from '@sentry/nextjs'
import {
  getEffectiveInterestRateForHedgeTrade,
  getEffectiveInterestRateForMarket,
} from './hedgeUtils'

export const validateInterestConfigWellFormed = (
  interestConfigs: Array<InterestConfig>
) => {
  return (
    interestConfigs.reduce(
      (acc: number, val: InterestConfig) => acc + Number(val.percentage),
      0.0
    ) === 1.0
  )
}

/**
 * Calculate interest for compounding period, given APY and # of compounding periods
 * @param apy
 * @returns
 */
export const calculateNominalInterest = (
  apy: number,
  precision: number
): string => {
  // Will need to use decimal.js for non-integer pow/exponents
  return BigNumber(
    BigNumber(
      Math.pow(
        BigNumber(1).plus(apy).toNumber(),
        BigNumber(1).dividedBy(COMPOUNDING_PERIODS).toNumber()
      )
    ).minus(1)
  ).toFixed(precision)
}

export const processInterestRequest = async (
  trade: Trade,
  syncMode: boolean = false
): Promise<Array<EncodeObject>> => {
  const { id, pendingInterest } = trade
  const { hasError, precision: collateralPrecision } = await getTokenPrecision(
    trade.collateralTokenType
  )
  if (hasError) {
    return []
  }

  // No interest to send or interest too small to send
  if (
    pendingInterest == null ||
    pendingInterest == '0.0' ||
    BigNumber(pendingInterest).isLessThan(
      BigNumber(10).exponentiatedBy(-collateralPrecision)
    )
  ) {
    console.log(' No interest to send or interest too small to send')
    return []
  }
  let result: Array<EncodeObject> = []
  if (!syncMode) {
    console.log('Creating interest dispersal messages')
    result = await createInterestDispersalMultiMsgs(trade)
  }
  return result
}

export const createInterestDispersalMultiMsgs = async (
  trade: Trade
): Promise<Array<EncodeObject>> => {
  const { id, pendingInterest, collateralTokenType } = trade
  const { hasError, precision: collateralPrecision } = await getTokenPrecision(
    collateralTokenType
  )
  if (hasError) {
    return []
  }
  if (
    pendingInterest == null ||
    pendingInterest == '0.0' ||
    BigNumber(pendingInterest).isLessThan(
      BigNumber(10).exponentiatedBy(-collateralPrecision)
    )
  ) {
    console.log(`Not enough pending interest to send: ${pendingInterest}`)
    return []
  }
  const response = await fetchWithRetries(
    DOMAIN + `/api/data/interest/get_interest_config_for_trade?id=${id}`,
    {
      headers: {
        'Content-Type': 'application/json',
        ...constructCookie(),
      },
    }
  )
  if (response == null) {
    return []
  }
  const interestConfig = (await response.json()) as Array<InterestConfig>
  if (interestConfig.length == 0) {
    return []
  }
  const anyInterestTooSmall = interestConfig.some((config: InterestConfig) => {
    const { percentage } = config
    const interestToSend = BigNumber(pendingInterest ?? '0')
      .times(percentage)
      .dividedBy(100)
      .toFixed(collateralPrecision)
    return BigNumber(interestToSend).isLessThan(
      BigNumber(10).exponentiatedBy(-collateralPrecision)
    )
  })
  if (anyInterestTooSmall) {
    console.log('Some interests are too small to send')
    return []
  }
  const tokenType = await getTokenDenomFromRegistry(collateralTokenType)
  // All interests are valid, send them all
  const messagesToSend: EncodeObject[] = interestConfig.map(
    (config: InterestConfig) => {
      const { address, percentage } = config
      const recepientAddress = address
      const interestPercentage = percentage
      const interestToSend = BigNumber(pendingInterest ?? '0')
        .times(interestPercentage)
        .dividedBy(100)
        .toFixed(collateralPrecision)
      return {
        typeUrl: '/cosmos.bank.v1beta1.MsgSend',
        value: {
          fromAddress: PROCESS.INTEREST_ADDRESS ?? '',
          toAddress: recepientAddress,
          amount: [
            {
              denom: tokenType,
              amount: BigNumber(interestToSend)
                .times(BigNumber(10).exponentiatedBy(collateralPrecision))
                .toFixed(0),
            },
          ],
          memo: JSON.stringify({
            transaction_type: 'disperse_interest',
            data: {
              trade_id: String(id),
              interest_rate: interestPercentage,
              interest_accrued: BigNumber(interestToSend).plus(
                trade.interestSent ?? '0.0'
              ),
            },
          }),
        } as unknown as EncodeObject,
      }
    }
  )
  return messagesToSend
}

/**
 * Send totalInterest from LTA => IA
 */
export const sendTotalInterestToInterestAddress = async (
  walletKeeper: WalletKeeper
): Promise<DeliverTxResponse | null> => {
  const tokenData = await fetchWithRetries(DOMAIN + `/api/app/generate_token`)
  if (tokenData == null) {
    return null
  }
  const { token } = (await tokenData.json()) as { token: string }

  const response = await fetchWithRetries(
    DOMAIN + `/api/data/trade/get_open_trades_pending_interest_by_token`,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...constructCookie(),
      },
    }
  )
  if (response == null) {
    return null
  }
  const groupedInterest = (await response.json()) as InterestByTokenType[]

  // console.log('groupedInterest ', groupedInterest)
  const messagesToSend: EncodeObject[] = []
  for (let { pendingInterest, tokenType } of groupedInterest) {
    const { hasError, precision: collateralPrecision } =
      await getTokenPrecision(tokenType)
    if (hasError) {
      return null
    }
    // If greater than minimum amount to send
    if (
      BigNumber(pendingInterest).isGreaterThan(
        BigNumber(10).exponentiatedBy(-collateralPrecision)
      )
    ) {
      const collateralTokenTypeDenom = await getTokenDenomFromRegistry(
        tokenType
      )

      messagesToSend.push({
        typeUrl: '/cosmos.bank.v1beta1.MsgSend',
        value: {
          fromAddress: PROCESS.LIVE_TRADE_ADDRESS ?? '',
          toAddress: PROCESS.INTEREST_ADDRESS ?? '',
          amount: [
            {
              denom: collateralTokenTypeDenom,
              amount: BigNumber(pendingInterest)
                .times(BigNumber(10).exponentiatedBy(collateralPrecision))
                .toFixed(0),
            },
          ],
        } as unknown as EncodeObject,
      })
    }
  }
  // console.log(
  //   'messages to send from LTA => IA for interest dispersal ',
  //   messagesToSend
  // )
  if (messagesToSend.length > 0) {
    return await sendInterestToInterestAddress(messagesToSend, walletKeeper)
  }
  return null
}

export const compoundInterest = async (
  trade: Trade,
  rpcUrl: string
): Promise<number> => {
  const {
    leverageQuantity: leverage,
    collateralTokenAmount: collateralAmount,
    targetTokenType,
    interestRate,
  } = trade
  const collateralPrecision = 20
  const totalBorrowedTrader = BigNumber(leverage).isGreaterThan('1')
    ? BigNumber(collateralAmount)
        .times(BigNumber(leverage).minus('1'))
        .toFixed(collateralPrecision)
    : BigNumber(collateralAmount).times(leverage).toFixed(collateralPrecision)
  // console.log('totalBorrowedTrader', totalBorrowedTrader)
  const interest: string = calculateNominalInterest(
    Number(
      interestRate ?? (await getEffectiveInterestRateForMarket(targetTokenType))
    ),
    collateralPrecision
  )
  // console.log('interest ', interest)
  const totalInterestAccrued = BigNumber(totalBorrowedTrader)
    .times(interest)
    .toFixed(collateralPrecision)
  // console.log('totalInterestAccrued', totalInterestAccrued)
  return Number(totalInterestAccrued)
}

export const processInterestComputation = async (): Promise<string | null> => {
  console.log('processInterestComputation ')
  const tokenData = await fetchWithRetries(DOMAIN + `/api/app/generate_token`)
  if (tokenData == null) {
    return null
  }
  const { token } = (await tokenData.json()) as { token: string }

  const response = await fetchWithRetries(
    DOMAIN + `/api/data/interest/add_interest_accrued`,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...constructCookie(),
      },
    }
  )
  if (response == null) {
    return null
  }
  return (await response.json()) as string | null
}

export const processTradeClosure = async (
  walletKeeper: WalletKeeper
): Promise<Array<DeliverTxResponse>> => {
  const tokenData = await fetchWithRetries(DOMAIN + `/api/app/generate_token`)
  if (tokenData == null) {
    return []
  }
  const { token } = (await tokenData.json()) as { token: string }

  const response = await fetchWithRetries(
    DOMAIN + `/api/data/trade/get_trade_by_status?status=ACTIVE`,
    {
      headers: {
        'Content-Type': 'application/json',
        ...constructCookie(),
      },
    }
  )
  if (response == null) {
    return []
  }
  const openTrades = (await response.json()) as Trade[]
  if (openTrades.length === 0) {
    return []
  }
  const tokenList = []
  for (let trade of openTrades) {
    const { targetTokenType } = trade
    tokenList.push(formatTokenForPriceList(targetTokenType))
  }
  // delete duplicates
  const symbolList = getCoinIdsBySymbols(_.uniq(tokenList).join(','))
  const priceList = await getCoinGeckoCoinLists(
    'usd',
    symbolList,
    CoinListOrder.MARKET_CAP_DESC,
    tokenList.length
  )
  const results = [] as Array<DeliverTxResponse>
  for (let openTrade of openTrades) {
    try {
      const { targetTokenType } = openTrade
      const targetPrice = nullthrows(
        priceList.find(f => f.symbol == targetTokenType)?.current_price
      )
      results.push(
        ...(await processIfTradeIsReadyToBeClosed(
          openTrade,
          String(nullthrows(targetPrice)),
          walletKeeper,
          token
        ))
      )
    } catch (e) {
      const errorMessage = `Error checking if trade #${
        openTrade.id
      } is ready to be closed. Error: ${JSON.stringify(
        e
      )} Moving onto next trade.`
      console.error(errorMessage)
      Sentry.captureException(errorMessage)
      continue
    }
  }
  return results
}

export const processInterestCollection = async (
  walletKeeper: WalletKeeper
): Promise<DeliverTxResponse | null> => {
  const tokenData = await fetchWithRetries(DOMAIN + `/api/app/generate_token`)
  if (tokenData == null) {
    return null
  }
  const { token } = (await tokenData.json()) as { token: string }
  const response = await fetchWithRetries(
    DOMAIN + `/api/data/trade/get_trade_by_status?status=ACTIVE`,
    {
      headers: {
        'Content-Type': 'application/json',
        ...constructCookie(),
      },
    }
  )
  if (response == null) {
    return null
  }
  const openTrades = (await response.json()) as Trade[]
  if (openTrades.length === 0) {
    return null
  }
  const txns: DeliverTxResponse[] = []
  // LTA => IA multi message by token type
  const sendingInterestTxn = await sendTotalInterestToInterestAddress(
    walletKeeper
  )
  if (sendingInterestTxn === null || sendingInterestTxn?.code !== 0) {
    return null
  } else {
    txns.push(sendingInterestTxn)
  }
  // IA => InterestConfig for each open trade.
  // TODO: we should simplify this to be less frequently as a waste.
  const messagesToSend: Array<EncodeObject> = []
  const tradesWithInterestToSend: Trade[] = []
  for (let openTrade of openTrades) {
    try {
      const messageToSend = await processInterestRequest(openTrade)
      if (messageToSend.length > 0) {
        messagesToSend.push(...messageToSend)
        tradesWithInterestToSend.push(openTrade)
      }
    } catch (e) {
      const errorMessage = `Error generating trade #${
        openTrade.id
      } interest message. Error: ${JSON.stringify(e)} Moving onto next trade.`
      console.error(errorMessage)
      Sentry.captureException(errorMessage)
      continue
    }
  }
  // Actually send the transaction
  if (messagesToSend.length === 0) {
    console.log('No messages to send')
    return null
  }
  console.log('disperseInterestToRecepients ')
  const txn = await disperseInterestToRecepients(
    walletKeeper,
    tradesWithInterestToSend.map(t => t.id).join(','),
    messagesToSend
  )
  if (txn !== null && txn.code === 0) {
    for (let tradeWithInterestToSend of tradesWithInterestToSend) {
      try {
        // clear out pendingInterest and update total interest sent for each trade that we actually sent interest for
        const response = await fetchWithRetries(
          DOMAIN +
            `/api/data/interest/clear_pending_interest_and_update_interest_sent?id=${tradeWithInterestToSend.id}`,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
              ...constructCookie(),
            },
          }
        )
        if (response == null) {
          return null
        }
      } catch (e) {
        const errorMessage = `Error updating interest sent #${
          tradeWithInterestToSend.id
        } interest message. Error: ${JSON.stringify(e)} Moving onto next trade.`
        console.error(errorMessage)
        Sentry.captureException(errorMessage)
        continue
      }
    }
    return txn
  }
  return null
}
