import { DEFAULT_FEE, DeliverTxResponse } from '@sifchain/sdk'
import nullthrows from 'nullthrows'
import { DirectSecp256k1HdWallet, EncodeObject } from '@cosmjs/proto-signing'
import { OfflineSigner } from '@cosmjs/launchpad'
import {
  MsgTransferEncodeObject,
  SigningStargateClient,
} from '@cosmjs/stargate'
import { TxRaw } from 'cosmjs-types/cosmos/tx/v1beta1/tx'
// import { isEvmBridgedCoin } from '../common/utils/isEvmBridgedToken'
import { SifEncodeObject, SifSigningStargateClient } from '@sifchain/stargate'
import {
  Trade,
  MatchVault as Match,
  TradeStatusEnum,
  TradeDirectionEnum,
  MatchStatusEnum,
  TradeTypeEnum,
  TradeCloseReason,
  TradeNotOpenReason,
} from './dbTypes'
import { BigNumber } from 'bignumber.js'
import getTokenPrecision from './getTokenPrecision'
import * as Sentry from '@sentry/nextjs'
import { CoinMarket } from 'coingecko-api-v3'
import {
  CLOSE_TRADE_WINDOW,
  Memo,
  transactionType,
  ENTRANCE_FEE_PERCENTAGE,
  PROCESS,
  DOMAIN,
  CoinListOrder,
  TARGET_COIN_LIST,
  TRADES_RATE_LIMIT,
  TXN_ERR_MESSAGE,
  MATCHER_MULTIPLIER,
  ETH_CHAIN_ID,
  ETH_CONTRACT_TOKEN_ADDRESS,
  DEFAULT_MAINNET_BRIDGEBANK_CONTRACT_ADDRESS,
  ETH_GAS_LIMIT,
  BLOCK_TIME,
  TOKEN_PRECISION_MAP,
  tokenToLeverage,
  DYDX_RETRIES,
  DYDX_RETRY_DELAY,
  UBI_PERCENTAGE,
  REWARDS_PERCENTAGE,
  MATCHER_PERCENTAGE,
  HEDGE_LIQUIDITY_MULTIPLIER,
} from '../utils/constants/constants'
import {
  getUiTokenRegistry,
  getSingleUiAssetData,
  getBalance,
  getTokenRegistryEntry,
  delay,
  fetchWithRetries,
  hasMinimumTradeOpenWindowBeenHit,
} from './serverUtils'
import { WalletKeeper } from './WalletKeeper'
import { constructCookie } from './constructCookie'
// import { AppCookies } from '~/common/config/AppCookies'
// import customPricingData from '../../custom-prices.json'
import Long from 'long'
import {
  BigNumberish,
  ContractReceipt,
  ContractTransaction,
  ethers,
  providers,
} from 'ethers'
import { NetworkEnv } from './types'
import { getSifRpcUrl } from './serverUtils'
import { Mutex } from 'async-mutex'
import { shouldOpenTrade } from './closeUtils'

// Conflicts with server imports so need resolve this separately
// import { getSdk } from 'packages/evm/src'
const mutex = new Mutex()
/**
 *
 * Response protocol has to receiving an transaction with a specifically configured memo.
 * @param senderAddress
 * @param tokenType
 * @param tokenAmount
 * @param memo
 * @returns
 */
export const validateAndProcessMessage = async (
  senderAddress: string,
  receiverAddress: string,
  tokenType: string,
  tokenAmount: string,
  memo: Memo,
  txnHash: string,
  walletKeeper: WalletKeeper | null,
  syncMode: boolean = false
): Promise<boolean> => {
  console.log('made it validateAndProcessMessage')
  const tokenData = await fetchWithRetries(DOMAIN + `/api/app/generate_token`)
  console.log('made it tokenData')
  if (tokenData == null) {
    return false
  }
  console.log('made it after tokenData')

  const { token } = (await tokenData.json()) as { token: string }
  let isFromExpectedSenderToReceiver = false
  let trade: Trade | null = null
  console.log('made it here')

  if (memo['transaction_type'] && memo['data']) {
    const transactionType: transactionType = memo['transaction_type']
    console.log('transactionType ', transactionType)
    const data = memo['data']
    const {
      trade_id,
      trade_direction,
      target_token_type,
      collateral_token_amount,
      collateral_token_type,
      match_id,
      expiration_date,
      leverage_quantity,
      stop_loss,
      take_profit,
      limit_price,
      auto_hedged,
    } = data
    const autoHedged = auto_hedged != null && auto_hedged == 'true'
    console.log('autoHedged, ', autoHedged)
    const response = await fetchWithRetries(
      DOMAIN +
        `/api/data/match/get_match?tokenType=${tokenType}&address=${senderAddress}&type=${TradeTypeEnum.UNHEDGED}`,
      {
        headers: {
          'Content-Type': 'application/json',
          ...constructCookie(),
        },
      }
    )
    if (response == null) {
      return true
    }
    const match = (await response.json()) as Match | null
    console.log('match in validateAndProcessMessage', match)
    if (trade_id) {
      trade = (await (
        await fetchWithRetries(
          DOMAIN + `/api/data/trade/get_trade?id=${Number(trade_id)}`,
          {
            headers: {
              'Content-Type': 'application/json',
              ...constructCookie(),
            },
          }
        )
      )?.json()) as Trade | null
      console.log('trade ', trade)
      if (trade == null) {
        return true
      }
    }
    if (match_id) {
      if (match == null) {
        return true
      }
    }
    // validate from expected recepient
    if (
      trade &&
      ['close_trade', 'cancel_trade_request', 'update_trade_request'].includes(
        transactionType
      ) &&
      receiverAddress === PROCESS.PENDING_TRADE_ADDRESS
    ) {
      isFromExpectedSenderToReceiver = senderAddress === trade?.traderAddress
    } else if (
      match &&
      ['update_match', 'withdraw_match', 'request_close_trade'].includes(
        transactionType
      ) &&
      receiverAddress === PROCESS.MATCH_VAULT_ADDRESS
    ) {
      isFromExpectedSenderToReceiver = senderAddress === match?.matcherAddress
    } else if (
      trade &&
      ['request_interest'].includes(transactionType) &&
      receiverAddress === PROCESS.MATCH_VAULT_ADDRESS
    ) {
      isFromExpectedSenderToReceiver = senderAddress === match?.matcherAddress
    } else {
      isFromExpectedSenderToReceiver = true
    }
    if (isFromExpectedSenderToReceiver) {
      let txn: DeliverTxResponse | null
      let txns: Array<DeliverTxResponse>
      switch (transactionType) {
        case 'open_trade':
          const isInvalidLeverage = !(
            (leverage_quantity &&
              BigNumber(leverage_quantity).isGreaterThanOrEqualTo(0) &&
              BigNumber(leverage_quantity).isLessThanOrEqualTo(
                target_token_type != null
                  ? BigNumber(tokenToLeverage[target_token_type] ?? 5).times(
                      HEDGE_LIQUIDITY_MULTIPLIER
                    )
                  : 20
              )) ||
            !leverage_quantity
          )
          if (!target_token_type || !trade_direction || isInvalidLeverage) {
            return true
          }
          const tokenTypeAssetData = await getTokenDataFromUiRegistry(tokenType)
          const coinPairDetail = await getCoinGeckoCoinPairDetail(
            'usd',
            formatTokenForPriceList(tokenTypeAssetData.displaySymbol),
            formatTokenForPriceList(target_token_type)
          )
          const collateralPrice = nullthrows(
            coinPairDetail.find(
              coin =>
                coin.symbol ===
                formatTokenForPriceList(
                  tokenTypeAssetData.displaySymbol
                ).toLowerCase()
            )
          )['current_price']
          const targetPrice = nullthrows(
            coinPairDetail.find(
              coin =>
                coin.symbol ===
                formatTokenForPriceList(target_token_type).toLowerCase()
            )
          )['current_price']
          const collateralTokenPrice = collateralPrice
            ? BigNumber(collateralPrice)
            : BigNumber(0.0)
          const collateralPrecision = tokenTypeAssetData.decimals
          let hasError, targetPrecision
          ;({ hasError, precision: targetPrecision } = await getTokenPrecision(
            target_token_type
          ))
          if (hasError) {
            return true
          }
          const targetTokenPrice = targetPrice
            ? BigNumber(targetPrice)
            : BigNumber(0.0)
          let liquidationPrice = BigNumber(0).toFixed(20)
          let maxProfit = BigNumber(0).toFixed(20)
          // TODO: Not immediately needed since UI limits these values, will debug later
          // Get limit price check tested
          // if (trade_direction == String(TradeDirectionEnum.LONG)) {
          // liquidationPrice = BigNumber(targetPrice).times(
          //   BigNumber(1).minus(
          //     BigNumber(1).dividedBy(BigNumber(leverage).plus(1))
          //   )
          // )
          // maxProfit = BigNumber(targetTokenPrice).times(
          //   BigNumber(1).plus(BigNumber(1).dividedBy(leverage))
          // )
          //   console.log('stopLoss ', stop_loss)
          //   console.log('take_profit ', take_profit)
          //   console.log('limit_price ', limit_price)
          //   console.log('liquidationPrice ', liquidationPrice)
          //   console.log('maxProfit ', maxProfit)
          //   console.log(
          //     'targetTokenPrice ',
          //     BigNumber(targetTokenPrice).toFixed(20)
          //   )
          //   if (
          //     !(
          //       (stop_loss &&
          //         BigNumber(stop_loss).isGreaterThanOrEqualTo(
          //           liquidationPrice
          //         ) &&
          //         BigNumber(stop_loss).isLessThanOrEqualTo(targetTokenPrice)) ||
          //       !stop_loss ||
          //       BigNumber(stop_loss).isEqualTo(0)
          //     ) ||
          //     !(
          //       (take_profit &&
          //         BigNumber(take_profit).isGreaterThanOrEqualTo(
          //           targetTokenPrice
          //         ) &&
          //         BigNumber(take_profit).isLessThanOrEqualTo(maxProfit)) ||
          //       !take_profit ||
          //       BigNumber(take_profit).isEqualTo(0)
          //     ) ||
          //     !(
          //       (limit_price &&
          //         BigNumber(limit_price).isGreaterThanOrEqualTo(
          //           targetTokenPrice
          //         ) &&
          //         BigNumber(limit_price).isLessThanOrEqualTo(maxProfit)) ||
          //       !limit_price ||
          //       (limit_price && BigNumber(limit_price).isEqualTo(0.0))
          //     )
          //   ) {
          //     return true
          //   }
          // } else if (trade_direction == String(TradeDirectionEnum.SHORT)) {
          // liquidationPrice = BigNumber(targetTokenPrice).times(
          //   BigNumber(1).plus(BigNumber(1).dividedBy(leverage))
          // )
          // maxProfit = BigNumber(targetPrice).times(
          //   BigNumber(1).minus(
          //     BigNumber(1).dividedBy(BigNumber(leverage).plus(1))
          //   )
          // )
          //   if (
          //     !(
          //       (stop_loss &&
          //         BigNumber(stop_loss).isGreaterThanOrEqualTo(
          //           targetTokenPrice
          //         ) &&
          //         BigNumber(stop_loss).isLessThanOrEqualTo(liquidationPrice)) ||
          //       !stop_loss ||
          //       BigNumber(stop_loss).isEqualTo(0)
          //     ) ||
          //     !(
          //       (take_profit &&
          //         BigNumber(take_profit).isGreaterThanOrEqualTo(maxProfit) &&
          //         BigNumber(take_profit).isLessThanOrEqualTo(
          //           targetTokenPrice
          //         )) ||
          //       !take_profit ||
          //       BigNumber(take_profit).isEqualTo(0)
          //     ) ||
          //     !(
          //       (limit_price &&
          //         BigNumber(limit_price).isGreaterThanOrEqualTo(maxProfit) &&
          //         BigNumber(limit_price).isLessThanOrEqualTo(
          //           targetTokenPrice
          //         )) ||
          //       !limit_price ||
          //       (limit_price && BigNumber(limit_price).isEqualTo(0.0))
          //     )
          //   ) {
          //     return true
          //   }
          // }
          console.log('ready to process open trade')
          const resp = await fetchWithRetries(
            DOMAIN + `/api/data/trade/get_trade_by_txn_hash?txnHash=${txnHash}`,
            {
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
                ...constructCookie(),
              },
            }
          )
          if (resp == null) {
            return true
          }
          trade = (await resp.json()) as Trade | null
          if (trade) {
            // Trade has been created, will look for match through processTradeRequests
            return true
          }
          txns = await processOpenTrade(
            tokenType,
            tokenAmount,
            collateralTokenPrice.toFixed(collateralPrecision),
            target_token_type,
            targetTokenPrice.toFixed(targetPrecision),
            senderAddress,
            trade_direction,
            walletKeeper,
            txnHash,
            String(MATCHER_MULTIPLIER),
            token,
            stop_loss,
            take_profit,
            leverage_quantity,
            limit_price == null ? null : limit_price,
            syncMode
          )
          if (
            txns.findIndex(txn => [5, 12, 13, 32].includes(txn.code)) !== -1
          ) {
            // Insufficient funds, gas, fee, or sequence # mismatch so protocol errors that should be reprocessed
            console.log(TXN_ERR_MESSAGE)
            Sentry.captureException(TXN_ERR_MESSAGE)
            return false
          }
          break
        case 'cancel_trade_request':
          if (!trade || trade.status !== TradeStatusEnum.PENDING) {
            return true
          }
          txn = await processCancelTradeRequest(
            trade,
            walletKeeper,
            token,
            syncMode
          )
          if (txn !== null && [5, 12, 13, 32].includes(txn.code)) {
            // Insufficient funds, gas, fee, or sequence # mismatch so protocol errors that should be reprocessed
            console.log(TXN_ERR_MESSAGE)
            Sentry.captureException(TXN_ERR_MESSAGE)
            return false
          }
          break
        case 'deposit_match':
          const success = await processMatchRequest(
            autoHedged,
            tokenType,
            tokenAmount,
            senderAddress,
            match?.id ?? null,
            expiration_date ? expiration_date : null,
            walletKeeper,
            txnHash,
            token,
            syncMode
          )
          return success
          break
        case 'withdraw_match':
          if (!collateral_token_type || !collateral_token_amount) {
            return true
          }
          const derivedMatch = (await (
            await fetchWithRetries(
              DOMAIN +
                `/api/data/match/get_match?tokenType=${collateral_token_type}&address=${senderAddress}&type=${
                  autoHedged == true
                    ? TradeTypeEnum.HEDGED
                    : TradeTypeEnum.UNHEDGED
                }`,
              {
                headers: {
                  'Content-Type': 'application/json',
                  ...constructCookie(),
                },
              }
            )
          )?.json()) as Match | null
          const unencumberedAmount = BigNumber(
            derivedMatch?.tokenAmount ?? 0
          ).minus(derivedMatch?.encumberedTokenAmount ?? 0)
          if (
            !derivedMatch ||
            derivedMatch.status === MatchStatusEnum.INACTIVE ||
            BigNumber(collateral_token_amount).isGreaterThan(unencumberedAmount)
          ) {
            return true
          }
          txn = await processWithdrawMatchRequest(
            autoHedged,
            collateral_token_type,
            formatTokenForPriceList(target_token_type as string),
            collateral_token_amount,
            derivedMatch,
            walletKeeper,
            txnHash,
            token,
            syncMode
          )
          if (txn !== null && [5, 12, 13, 32].includes(txn.code)) {
            // Insufficient funds, gas, fee, or sequence # mismatch so protocol errors that should be reprocessed
            console.log(TXN_ERR_MESSAGE)
            Sentry.captureException(TXN_ERR_MESSAGE)
            return false
          }
          break
        case 'close_trade':
          if (
            !trade ||
            trade.status !== TradeStatusEnum.ACTIVE ||
            !hasMinimumTradeOpenWindowBeenHit(trade)
          ) {
            return true
          }
          txns = await processCloseTrade(
            trade,
            walletKeeper,
            token,
            TradeCloseReason.MANUALLY_CLOSED,
            syncMode
          )
          if (
            txns.findIndex(txn => [5, 12, 13, 32].includes(txn.code)) !== -1
          ) {
            // Insufficient funds, gas, fee, or sequence # mismatch so protocol errors that should be reprocessed
            console.log(TXN_ERR_MESSAGE)
            Sentry.captureException(TXN_ERR_MESSAGE)
            return false
          }
          break
        case 'request_close_trade':
          // going to repeatedly run so we need a way to identify when incorrect / request vs already processed or doesn't need to be processed
          if (
            !trade ||
            trade.status !== TradeStatusEnum.ACTIVE ||
            trade.requestToCloseTime !== null
          ) {
            // already processed
            return true
          }
          txn = await processRequestToCloseTrade(
            trade,
            walletKeeper,
            token,
            syncMode
          )
          if (txn !== null && [5, 12, 13, 32].includes(txn.code)) {
            // Insufficient funds, gas, fee, or sequence # mismatch so protocol errors that should be reprocessed
            console.log(TXN_ERR_MESSAGE)
            Sentry.captureException(TXN_ERR_MESSAGE)
            return false
          }
          break
        // Not implemented
        case 'update_trade_request':
          if (
            !trade ||
            trade.status !== TradeStatusEnum.PENDING ||
            !collateral_token_amount
          ) {
            return true
          }
          // Less flexibility
          await processUpdateTradeRequest(
            collateral_token_amount,
            trade,
            walletKeeper,
            token,
            syncMode
          )
          break
        case 'get_trade_status':
          await processGetTradeStatus(
            [nullthrows(trade_id)],
            walletKeeper,
            token,
            syncMode
          )
          break
        default:
          break
      }
    }
  }
  return true
}

export const processMessageAsMatchVault = async (
  senderAddress: string,
  tokenType: string,
  tokenAmount: string,
  memo: string,
  txnHash: string,
  walletKeeper: WalletKeeper | null,
  syncMode: boolean = false
): Promise<boolean> => {
  const processed = await processMessage(
    senderAddress,
    PROCESS.MATCH_VAULT_ADDRESS,
    tokenType,
    tokenAmount,
    memo,
    txnHash,
    walletKeeper
  )
  // console.log('processed ', processed)
  if (!processed) {
    console.log(
      `ERROR: processMessageAsMatchVault ${senderAddress} ${tokenType} ${tokenAmount} ${memo} ${txnHash}`
    )
    Sentry.captureException(
      `ERROR: processMessageAsMatchVault ${senderAddress} ${tokenType} ${tokenAmount} ${memo} ${txnHash}`
    )
  }
  return processed
}

export const processMessageAsPendingTradeAddress = async (
  senderAddress: string,
  tokenType: string,
  tokenAmount: string,
  memo: string,
  txnHash: string,
  walletKeeper: WalletKeeper,
  syncMode: boolean = false
): Promise<boolean> => {
  const processed = await processMessage(
    senderAddress,
    PROCESS.PENDING_TRADE_ADDRESS,
    tokenType,
    tokenAmount,
    memo,
    txnHash,
    walletKeeper
  )
  console.log('processed ', processed)
  if (!processed) {
    console.log(
      `ERROR: processMessageAsPendingTradeAddress ${senderAddress} ${tokenType} ${tokenAmount} ${memo} ${txnHash}`
    )
    Sentry.captureException(
      `ERROR: processMessageAsPendingTradeAddress ${senderAddress} ${tokenType} ${tokenAmount} ${memo} ${txnHash}`
    )
  }
  return processed
}

export const processMessage = async (
  senderAddress: string,
  receiverAddress: string,
  tokenType: string,
  tokenAmount: string,
  memo: string,
  txnHash: string,
  walletKeeper: WalletKeeper | null,
  syncMode: boolean = false
): Promise<boolean> => {
  const parsedJSON = getParsedJSON(memo)
  console.log('parsedJSON ', parsedJSON)
  if (parsedJSON !== null) {
    if ('transaction_type' in parsedJSON) {
      return await validateAndProcessMessage(
        senderAddress,
        receiverAddress,
        tokenType,
        tokenAmount,
        parsedJSON as Memo,
        txnHash,
        walletKeeper,
        syncMode
      )
    }
  }
  // invalid so should return processed true
  return true
}

// Protocol Responses to Trader / Matcher Messages/Transactions
/**
 * If matched MVA => LTA and PTA => LTA,
 * else broadcast to liquidity matchers that new position is available
 * @param tokenType
 * @param tokenAmount
 * @returns
 */
export const processOpenTrade = async (
  collateralTokenType: string,
  collateralTokenAmount: string,
  collateralTokenPrice: string,
  targetTokenType: string,
  targetTokenPrice: string,
  traderAddress: string,
  tradeDirection: string,
  walletKeeper: WalletKeeper | null,
  txnHash: string,
  maxProfitMultiplier: string,
  token: string,
  stopLoss?: string | null,
  takeProfit?: string | null,
  leverageQuantity?: string | null,
  limitPrice?: string | null,
  syncMode?: boolean | null
): Promise<Array<DeliverTxResponse>> => {
  // trade already exists skip
  console.log('made it to processOpenTrade')
  const resp = await fetchWithRetries(
    DOMAIN +
      `/api/data/trade/create_trade_request?tokenType=${collateralTokenType}&tokenAmount=${collateralTokenAmount}&tokenPrice=${collateralTokenPrice}&targetTokenType=${targetTokenType}&targetTokenPrice=${targetTokenPrice}&traderAddress=${traderAddress}&tradeDirection=${tradeDirection}&&stopLoss=${stopLoss}&takeProfit=${takeProfit}&leverageQuantity=${leverageQuantity}&txnHash=${txnHash}&limitPrice=${
        limitPrice == null ? '0.0' : limitPrice
      }&maxProfitMultiplier=${maxProfitMultiplier}`,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...constructCookie(),
      },
    }
  )
  if (resp == null) {
    return []
  }
  const trade = (await resp.json()) as Trade | null
  console.log('processOpenTrade created trade ', trade)
  if (trade === null) {
    return []
  }
  const coinPairDetail = await getCoinGeckoCoinPairDetail(
    'usd',
    formatTokenForPriceList(targetTokenType)
  )
  const targetPrice = coinPairDetail[0]['current_price']
  const currentTargetPrice = targetPrice ? BigNumber(targetPrice) : BigNumber(0)
  const [shouldOpen, reason] = shouldOpenTrade(
    trade,
    currentTargetPrice.toFixed(20)
  )
  if (!shouldOpen) {
    // should update trade not to open reason if not already updated
    await updateNotOpenReason(trade, token, reason)
    return []
  }
  const collateralMultiplier = Math.min(
    BigNumber(leverageQuantity ?? 1).toNumber(),
    Number(maxProfitMultiplier)
  )
  const response = await fetchWithRetries(
    DOMAIN +
      `/api/data/match/top_match?tokenType=${collateralTokenType}&tokenAmount=${BigNumber(
        trade.collateralTokenAmount
      ).times(collateralMultiplier)}&traderAddress=${trade.traderAddress}`,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...constructCookie(),
      },
    }
  )
  if (response == null) {
    return []
  }
  const match = (await response.json()) as Match | null
  console.log('top match in processOpenTrade', match)
  if (match == null) {
    // broadcast to liquidity matchers that a new position is available
    await updateNotOpenReason(trade, token, TradeNotOpenReason.NO_MATCH)
    return []
  }
  // console.log('made it to execute trade on finding match')
  let txs: Array<DeliverTxResponse> = []
  if (!syncMode && walletKeeper) {
    const collateralTokenTypeDenom = await getTokenDenomFromRegistry(
      trade.collateralTokenType
    )
    const tradeBalance = await getBalance(
      walletKeeper,
      'pta',
      PROCESS.PENDING_TRADE_ADDRESS,
      collateralTokenTypeDenom
    )
    if (
      tradeBalance &&
      BigNumber(tradeBalance).isLessThan(trade.collateralTokenAmount)
    ) {
      console.log('not enough balance to complete trade')
      console.log(
        `processOpenTrade: mv balance= ${tradeBalance}, collateral token amount= ${collateralTokenAmount}`
      )
      Sentry.captureException(`not enough balance to complete trade`)
      await updateNotOpenReason(
        trade,
        token,
        TradeNotOpenReason.NOT_ENOUGH_FUNDS_PTA
      )
      return []
    }
    const matchBalance = await getBalance(
      walletKeeper,
      'mv',
      PROCESS.MATCH_VAULT_ADDRESS,
      collateralTokenTypeDenom
    )
    if (
      matchBalance &&
      BigNumber(matchBalance).isLessThan(collateralTokenAmount)
    ) {
      console.log('not enough balance in match vault to complete trade')
      console.log(
        `processOpenTrade: mv balance= ${matchBalance}, collateral token amount= ${collateralTokenAmount}`
      )
      Sentry.captureException(
        `not enough balance in match vault to complete trade`
      )
      await updateNotOpenReason(
        trade,
        token,
        TradeNotOpenReason.NOT_ENOUGH_FUNDS_MVA
      )
      return []
    }
    txs = await executeTradeOnFindingMatch(trade, match, walletKeeper, token)
  }

  return txs
}

export const executeTradeOnFindingMatch = async (
  trade: Trade,
  match: Match,
  walletKeeper: WalletKeeper,
  token: string
): Promise<Array<DeliverTxResponse>> => {
  const {
    collateralTokenType,
    collateralTokenAmount,
    limitPrice,
    tradeDirection,
    leverageQuantity,
    targetTokenType,
  } = trade
  const collateralTokenDisplaySymbol = (
    await getTokenDataFromUiRegistry(collateralTokenType)
  ).displaySymbol
  const coinPairDetail = await getCoinGeckoCoinPairDetail(
    'usd',
    formatTokenForPriceList(collateralTokenDisplaySymbol),
    formatTokenForPriceList(targetTokenType)
  )
  const collateralPrice = nullthrows(
    coinPairDetail.find(
      coin =>
        coin.symbol ===
        formatTokenForPriceList(collateralTokenDisplaySymbol).toLowerCase()
    )
  )['current_price']
  const targetPrice = nullthrows(
    coinPairDetail.find(
      coin =>
        coin.symbol === formatTokenForPriceList(targetTokenType).toLowerCase()
    )
  )['current_price']
  const currentCollateralPrice = collateralPrice
    ? BigNumber(collateralPrice)
    : BigNumber(0)
  const currentTargetPrice = targetPrice ? BigNumber(targetPrice) : BigNumber(0)
  let hasError, targetPrecision, collateralPrecision
  ;({ hasError, precision: targetPrecision } = await getTokenPrecision(
    targetTokenType
  ))
  if (hasError) {
    return []
  }
  const currentTargetPriceFixed = currentTargetPrice.toFixed(targetPrecision)
  console.log('currentTargetPrice ', currentTargetPriceFixed)
  console.log('limitPrice ', limitPrice)
  if (
    (limitPrice != null &&
      BigNumber(limitPrice).isGreaterThan(0) &&
      tradeDirection == TradeDirectionEnum.LONG &&
      currentTargetPrice.isGreaterThan(BigNumber(limitPrice))) ||
    (tradeDirection == TradeDirectionEnum.SHORT &&
      currentTargetPrice.isLessThan(BigNumber(limitPrice!)))
  ) {
    // limit price has not been reached
    console.log('limit check failed')
    return []
  }
  ;({ hasError, precision: collateralPrecision } = await getTokenPrecision(
    collateralTokenType
  ))
  if (hasError) {
    return []
  }
  // console.log('made it past limit order check')
  const targetAmount = BigNumber(BigNumber(1).minus(ENTRANCE_FEE_PERCENTAGE))
    .times(collateralTokenAmount)
    .times(leverageQuantity)
    .times(
      BigNumber(currentCollateralPrice).dividedBy(
        limitPrice != null && BigNumber(limitPrice).isGreaterThan(0)
          ? limitPrice
          : currentTargetPrice
      )
    )
  console.log('targetAmount ', targetAmount.toFixed(20))
  const entranceFee = await calculateEntranceFee(trade, coinPairDetail)
  const updatedCollateralAmount = BigNumber(collateralTokenAmount)
    .minus(entranceFee)
    .toFixed(collateralPrecision)
  // console.log('entranceFee ', entranceFee)

  const collateralMultiplier = Math.min(
    BigNumber(leverageQuantity).toNumber(),
    MATCHER_MULTIPLIER
  )
  const collateralTokenTypeDenom = await getTokenDenomFromRegistry(
    collateralTokenType
  )
  const matchBalance = await getBalance(
    walletKeeper,
    'mv',
    PROCESS.MATCH_VAULT_ADDRESS,
    collateralTokenTypeDenom
  )
  if (
    matchBalance &&
    BigNumber(matchBalance).isLessThan(collateralTokenAmount)
  ) {
    console.log('not enough balance in match vault to complete trade')
    console.log(
      `executeTradeOnFindingMatch: mv balance= ${matchBalance}, collateral token amount= ${collateralTokenAmount}`
    )
    Sentry.captureException(
      `not enough balance in match vault to complete trade`
    )
    return []
  }
  // Since there is enough in MVA, start match side of things
  // MVA => LTA
  const matchResult = await executeMatch(
    collateralTokenType,
    BigNumber(updatedCollateralAmount)
      .times(collateralMultiplier)
      .toFixed(collateralPrecision),
    String(trade.id),
    String(match.id),
    walletKeeper
  )
  if (matchResult == null || matchResult.code !== 0) {
    return []
  }
  console.log('MVA => LTA ', matchResult)

  const tradeBalance = await getBalance(
    walletKeeper,
    'pta',
    PROCESS.PENDING_TRADE_ADDRESS,
    collateralTokenTypeDenom
  )
  if (
    tradeBalance &&
    BigNumber(tradeBalance).isLessThan(collateralTokenAmount)
  ) {
    console.log('not enough balance to complete trade')
    console.log(
      `executeTradeOnFindingMatch: pta balance= ${tradeBalance}, collateral token amount= ${collateralTokenAmount}`
    )
    Sentry.captureException(`not enough balance to complete trade`)
    return []
  }
  // PTA => LTA and PTA => Entrance Fee
  const tradeResult = await executeTrade(
    collateralTokenType,
    updatedCollateralAmount,
    entranceFee,
    String(trade.id),
    String(match.id),
    match.matcherAddress,
    walletKeeper
  )
  if (tradeResult == null || tradeResult.code !== 0) {
    return []
  }
  console.log('PTA => LTA ', tradeResult)
  const collateralAmountIncludingLeverageDifference =
    getHedgeTradeTokenAmountInCollateralIncludingLeverageDiscrepancy(
      trade,
      collateralPrecision
    )
  const resp = await fetchWithRetries(
    DOMAIN +
      `/api/data/match/max_to_autohedge?address=${match.matcherAddress}&tokenType=${trade.collateralTokenType}&tokenAmount=${collateralAmountIncludingLeverageDifference}`,
    {
      headers: {
        'Content-Type': 'application/json',
        ...constructCookie(),
      },
    }
  )
  if (resp === null || resp.status !== 200) {
    const data = await resp?.json()
    console.log(`ERROR: response= ${JSON.stringify(data)}`)
    Sentry.captureException(`ERROR: response= ${JSON.stringify(data)}`)
    return []
  }
  const autoHedgeMatchVault = (await resp.json()) as Match | null
  console.log('autoHedgeMatchVault ', autoHedgeMatchVault)

  const res = await fetchWithRetries(
    DOMAIN +
      `/api/data/common/connect_match_and_trade?tradeId=${trade.id}&matchId=${
        match.id
      }&targetAmount=${targetAmount}&collateralAmount=${updatedCollateralAmount}&type=${
        autoHedgeMatchVault?.type != null
          ? autoHedgeMatchVault?.type
          : match.type
      }&targetPrice=${currentTargetPriceFixed}`,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...constructCookie(),
      },
    }
  )
  if (res == null || res.status !== 200) {
    // how to handle this partial
    return []
  }

  // If not enough for now we do not automatically hedge even if they want us to. In the future we can make it so
  // This accounts for discrepancy between DYDX max leverage by market and our platform
  if (autoHedgeMatchVault == null) {
    // Not enough liquidity to autohedge
    console.log('not enough liquidity to autohedge')
    // TODO: toggle back type to unhedged
    return [tradeResult, matchResult]
  }
  console.log('auto hedge enabled, creating hedged trade')
  const maxLeverageForMarket = tokenToLeverage[targetTokenType]
  const amountToHedge = BigNumber.min(
    BigNumber(autoHedgeMatchVault.dydxTokenAmount ?? 0).minus(
      autoHedgeMatchVault.encumberedTokenAmount
    ),
    collateralAmountIncludingLeverageDifference
  ).toFixed(2)
  const leverageMultiplier = BigNumber(amountToHedge).dividedBy(
    updatedCollateralAmount
  )
  let overallLeverage = BigNumber(leverageMultiplier)
    .times(leverageQuantity)
    .toFixed(0)
  if (BigNumber(overallLeverage).gt(maxLeverageForMarket)) {
    overallLeverage = BigNumber(maxLeverageForMarket).toFixed(0)
  }
  const response = await fetchWithRetries(
    DOMAIN +
      `/api/data/trade/create_hedge_trade?id=${trade.id}&txnHash=${autoHedgeMatchVault.latestTxnHash}&address=${autoHedgeMatchVault.matcherAddress}&amount=${amountToHedge}&leverage=${overallLeverage}`,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...constructCookie(),
      },
    },
    DYDX_RETRIES,
    DYDX_RETRY_DELAY
  )
  console.log('create_hedge_trade response ', await response?.json())
  if (response === null || response.status !== 200) {
    // how to handle this partial result where original trade closed but hedge trade didn't
    // TODO: toggle back type to unhedged
    const data = await response?.json()
    console.log(`ERROR: response= ${JSON.stringify(data)}`)
    Sentry.captureException(`ERROR: response= ${JSON.stringify(data)}`)
  }
  return [tradeResult, matchResult]
}

export const processRequestToCloseTrade = async (
  trade: Trade,
  walletKeeper: WalletKeeper | null,
  token: string,
  syncMode: boolean = false
): Promise<DeliverTxResponse | null> => {
  const closeTradeThresholdDate = new Date()
  closeTradeThresholdDate.setDate(
    closeTradeThresholdDate.getDate() + CLOSE_TRADE_WINDOW
  )

  const { hasError, precision: collateralPrecision } = await getTokenPrecision(
    trade.collateralTokenType
  )

  if (hasError) {
    return null
  }

  let result: DeliverTxResponse | null = null

  if (!syncMode && walletKeeper) {
    result = await sendTokens(
      await walletKeeper.getWallet('pta'),
      PROCESS.PENDING_TRADE_ADDRESS,
      trade.traderAddress,
      trade.collateralTokenType,
      BigNumber(10)
        .exponentiatedBy(-collateralPrecision)
        .toFixed(collateralPrecision),
      {
        transaction_type: 'request_close_trade',
        data: {
          trade_id: String(trade.id),
          close_trade_time: closeTradeThresholdDate.toISOString(),
          details: `Trade ${
            trade.id
          } will auto close on, ${closeTradeThresholdDate.toDateString()}, if no action is taken as requested by lender`,
        },
      }
    )
    if (result === null || result.code !== 0) {
      return null
    }
    printTransactionResponse(result)
    if (result.code !== 0) {
      console.log(`ERROR: response ${result.rawLog}`)
      Sentry.captureException(`ERROR: response ${result.rawLog}`)
      return result
    }
  }
  const response = await fetchWithRetries(
    DOMAIN + `/api/data/trade/update_trade_request_close_time?id=${trade.id}`,
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
  return result
}

export const calculateCurrentTraderPandL = async (
  trade: Trade,
  coinMarketList?: CoinMarket[]
) => {
  const {
    targetTokenAmount,
    interestSent,
    pendingInterest,
    tradeDirection,
    targetTokenPrice,
    collateralTokenPrice,
    collateralTokenType,
    targetTokenType,
    status,
    targetClosePrice,
    collateralClosePrice,
  } = trade
  const { precision: collateralPrecision } = await getTokenPrecision(
    collateralTokenType
  )
  const collateralTokenDisplaySymbol = (
    await getTokenDataFromUiRegistry(collateralTokenType)
  ).displaySymbol
  let collateralPrice: number | undefined
  let targetPrice: number | undefined
  if (coinMarketList) {
    collateralPrice = coinMarketList.find(
      e =>
        e.symbol === formatTokenForPriceList(collateralTokenType).toLowerCase()
    )?.current_price

    targetPrice = coinMarketList.find(
      e => e.symbol === formatTokenForPriceList(targetTokenType).toLowerCase()
    )?.current_price
  } else {
    // Have to call API directly as we can't call one nextjs api route from another one
    const coinPairDetail = await getCoinGeckoCoinPairDetailAPI(
      'usd',
      formatTokenForPriceList(collateralTokenDisplaySymbol),
      formatTokenForPriceList(targetTokenType)
    )
    collateralPrice = nullthrows(
      coinPairDetail.find(
        coin =>
          coin.symbol ===
          formatTokenForPriceList(collateralTokenDisplaySymbol).toLowerCase()
      )
    )['current_price']
    targetPrice = nullthrows(
      coinPairDetail.find(
        coin =>
          coin.symbol === formatTokenForPriceList(targetTokenType).toLowerCase()
      )
    )['current_price']
  }
  const currentCollateralPrice =
    status === TradeStatusEnum.COMPLETED
      ? collateralClosePrice
      : collateralPrice
  const currentTargetPrice =
    status === TradeStatusEnum.COMPLETED
      ? targetClosePrice ?? 0.0
      : targetPrice ?? 0.0
  const currentTargetAmount = targetTokenAmount
  return tradeDirection === TradeDirectionEnum.LONG
    ? BigNumber(
        BigNumber(currentTargetAmount)
          .times(currentTargetPrice ?? 1.0)
          .dividedBy(currentCollateralPrice ?? 1.0)
      )
        .minus(
          BigNumber(
            BigNumber(targetTokenAmount)
              .times(targetTokenPrice)
              .dividedBy(collateralTokenPrice)
          )
        )
        .minus(interestSent ?? '0.0')
        .toFixed(collateralPrecision)
    : BigNumber(
        BigNumber(targetTokenAmount)
          .times(targetTokenPrice)
          .dividedBy(collateralTokenPrice)
      )
        .minus(
          BigNumber(currentTargetAmount)
            .times(currentTargetPrice ?? 1.0)
            .dividedBy(currentCollateralPrice ?? 1.0)
        )
        .minus(interestSent ?? '0.0')
        .toFixed(collateralPrecision)
}

export const calculateEntranceFee = async (
  trade: Trade,
  coinMarketList?: CoinMarket[]
) => {
  const {
    collateralTokenType,
    collateralTokenAmount,
    targetTokenType,
    leverageQuantity,
    limitPrice,
  } = trade

  let collateralPrice: number | undefined
  let targetPrice: number | undefined
  const collateralTokenDisplaySymbol = (
    await getTokenDataFromUiRegistry(collateralTokenType)
  ).displaySymbol
  if (coinMarketList) {
    collateralPrice = coinMarketList.find(
      e =>
        e.symbol ===
        formatTokenForPriceList(collateralTokenDisplaySymbol).toLowerCase()
    )?.current_price

    targetPrice = coinMarketList.find(
      e => e.symbol === formatTokenForPriceList(targetTokenType).toLowerCase()
    )?.current_price
  } else {
    // Have to call API directly as we can't call one nextjs api route from another one
    const coinPairDetail = await getCoinGeckoCoinPairDetailAPI(
      'usd',
      formatTokenForPriceList(collateralTokenDisplaySymbol),
      formatTokenForPriceList(targetTokenType)
    )
    collateralPrice = nullthrows(
      coinPairDetail.find(
        coin =>
          coin.symbol ===
          formatTokenForPriceList(collateralTokenDisplaySymbol).toLowerCase()
      )
    )['current_price']
    targetPrice = nullthrows(
      coinPairDetail.find(
        coin =>
          coin.symbol === formatTokenForPriceList(targetTokenType).toLowerCase()
      )
    )['current_price']
  }

  const tokenPrecision = 20
  const currentCollateralPrice = collateralPrice
    ? BigNumber(collateralPrice)
    : BigNumber(0)
  const currentTargetPrice = targetPrice ? BigNumber(targetPrice) : BigNumber(0)
  const targetAmount = BigNumber(BigNumber(1).minus(ENTRANCE_FEE_PERCENTAGE))
    .times(collateralTokenAmount)
    .times(leverageQuantity)
    .times(
      BigNumber(currentCollateralPrice).dividedBy(
        limitPrice != null && BigNumber(limitPrice).isGreaterThan(0)
          ? limitPrice
          : currentTargetPrice
      )
    )
  return BigNumber(ENTRANCE_FEE_PERCENTAGE)
    .times(targetAmount)
    .times(currentTargetPrice)
    .dividedBy(currentCollateralPrice)
    .toFixed(tokenPrecision)
}

/**
 * LTA => MA
 * LTA => TA
 * IA => MA
 * IA => TA
 * @param tokenType
 * @param tokenAmount
 * @returns
 */
export const processCloseTrade = async (
  trade: Trade,
  walletKeeper: WalletKeeper | null,
  token: string,
  reason: TradeCloseReason,
  syncMode: boolean = false
): Promise<Array<DeliverTxResponse>> => {
  let interestResults: Array<DeliverTxResponse> = []
  let closeTxn: DeliverTxResponse | null = null
  const {
    collateralTokenType,
    targetTokenType,
    id,
    closeTxnHash,
    maxProfitMultiplier,
  } = trade
  let tradeClosed = closeTxnHash !== null
  if (!tradeClosed) {
    if (!syncMode && walletKeeper) {
      const collateralTokenTypeDenom = await getTokenDenomFromRegistry(
        trade.collateralTokenType
      )
      const ltaBalance = await getBalance(
        walletKeeper,
        'lta',
        PROCESS.LIVE_TRADE_ADDRESS,
        collateralTokenTypeDenom
      )
      if (
        ltaBalance &&
        BigNumber(ltaBalance).isLessThan(
          BigNumber(trade.collateralTokenAmount).times(
            BigNumber(maxProfitMultiplier).plus(1)
          )
        )
      ) {
        console.log('not enough balance to close trade')
        console.log(
          `processCloseTrade: lta balance= ${ltaBalance}, collateral token amount= ${BigNumber(
            trade.collateralTokenAmount
          )
            .times(BigNumber(maxProfitMultiplier).plus(1))
            .toString()}`
        )
        Sentry.captureException(
          `processCloseTrade: lta balance= ${ltaBalance}, collateral token amount= ${BigNumber(
            trade.collateralTokenAmount
          )
            .times(BigNumber(maxProfitMultiplier).plus(1))
            .toString()}`
        )
        return []
      }
      closeTxn = await processCloseTradeTransaction(trade, walletKeeper, token)
      if (closeTxn === null || closeTxn.code !== 0) {
        return []
      }
    }
    // Update txn that closed trade
    const response = await fetchWithRetries(
      DOMAIN +
        `/api/data/trade/add_close_txn_hash?txnHash=${
          syncMode ? trade.closeTxnHash : closeTxn?.transactionHash
        }&id=${id}`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...constructCookie(),
        },
      }
    )
    if (response == null) {
      return []
    }
    const { hasError, precision: collateralPrecision } =
      await getTokenPrecision(collateralTokenType)
    if (hasError) {
      return []
    }
    tradeClosed = true
  }
  const collateralTokenDisplaySymbol = (
    await getTokenDataFromUiRegistry(collateralTokenType)
  ).displaySymbol
  const coinPairDetail = await getCoinGeckoCoinPairDetail(
    'usd',
    formatTokenForPriceList(collateralTokenDisplaySymbol),
    formatTokenForPriceList(targetTokenType)
  )
  const collateralPrice = nullthrows(
    coinPairDetail.find(
      coin =>
        coin.symbol ===
        formatTokenForPriceList(collateralTokenDisplaySymbol).toLowerCase()
    )
  )['current_price']
  const targetPrice = nullthrows(
    coinPairDetail.find(
      coin =>
        coin.symbol === formatTokenForPriceList(targetTokenType).toLowerCase()
    )
  )['current_price']
  // Need to validate based off of size of interest config # of valid responses
  const response = await fetchWithRetries(
    DOMAIN +
      `/api/data/trade/update_status?id=${id}&status=COMPLETED&collateralPrice=${collateralPrice}&targetPrice=${targetPrice}&reason=${reason}`,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...constructCookie(),
      },
    }
  )
  const results = tradeClosed && closeTxn !== null ? [closeTxn] : []
  if (response == null) {
    // How should we handle this case
    return interestResults.length! == 0
      ? results.concat(interestResults)
      : results
  }
  if (trade.type === TradeTypeEnum.HEDGED) {
    console.log('auto hedge enabled, closing hedged trade')
    const res = await fetchWithRetries(
      DOMAIN + `/api/data/trade/close_hedge_trade?id=${trade.id}`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...constructCookie(),
        },
      },
      DYDX_RETRIES,
      DYDX_RETRY_DELAY
    )
    console.log('closing hedged trade response ', await res?.json())
    // Note: We withdraw funds periodically from DYDX using chron job processWithdrawalFromDYDX in hedgeUtils daily since minimum amount required 100 USDC then we send the tokens from ETH => Sifchain
    if (res === null || res.status !== 200) {
      // how to handle this partial result where original trade closed but hedge trade didn't
      const data = await res?.json()
      console.log(`ERROR: response= ${JSON.stringify(data)}`)
      Sentry.captureException(`ERROR: response= ${JSON.stringify(data)}`)
    }
  }
  return interestResults.length! == 0
    ? results.concat(interestResults)
    : results
}

/**
 * Add match to db + check for trades to match, if so execute trade/match
 */
export const processMatchRequest = async (
  autoHedged: boolean,
  tokenType: string,
  tokenAmount: string,
  matcherAddress: string,
  id: number | null,
  expirationDate: string | null,
  walletKeeper: WalletKeeper | null,
  txnHash: string,
  token: string,
  syncMode: boolean = false
): Promise<boolean> => {
  console.log('made it to processMatchRequest')
  if (BigNumber(tokenAmount).isLessThanOrEqualTo(0)) {
    return true
  }
  if (autoHedged && walletKeeper) {
    // Transfer to separate address hedging
    const result = await sendTokens(
      await walletKeeper.getWallet('mv'),
      PROCESS.MATCH_VAULT_ADDRESS,
      PROCESS.HEDGE_ADDRESS,
      tokenType,
      tokenAmount,
      {
        transaction_type: 'transfer_to_hedge',
        data: {
          match_id: String(id),
        },
      }
    )
    if (result === null || result.code !== 0) {
      return false
    }
    printTransactionResponse(result)
  }
  const resp = await fetchWithRetries(
    DOMAIN +
      `/api/data/match/deposit_match?tokenType=${tokenType}&tokenAmount=${tokenAmount}&matcherAddress=${matcherAddress}${
        expirationDate ? '&expirationDate=' + expirationDate : ''
      }&txnHash=${txnHash}&type=${
        autoHedged == true ? TradeTypeEnum.HEDGED : TradeTypeEnum.UNHEDGED
      }`,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...constructCookie(),
      },
    }
  )
  if (resp == null || resp.status !== 200) {
    return false
  }
  const match = (await resp.json()) as Match | null
  // console.log('match ', match)
  if (match === null) {
    return false
  }
  return true
}

/**
 *  If increasing trade amount just update
 *  else want to decrease that amount send difference from pending trade address => trade address
 */
export const processUpdateTradeRequest = async (
  updatedCollateralAmount: string,
  trade: Trade,
  walletKeeper: WalletKeeper | null,
  token: string,
  syncMode: boolean = false
): Promise<DeliverTxResponse | null> => {
  const { hasError, precision: collateralPrecision } = await getTokenPrecision(
    trade.collateralTokenType
  )
  if (hasError) {
    return null
  }

  const originalCollateralAmount = trade?.collateralTokenAmount
  const isDecreasing = BigNumber(
    nullthrows(originalCollateralAmount)
  ).isGreaterThan(updatedCollateralAmount)
  let result = null
  if (isDecreasing) {
    const difference = BigNumber(nullthrows(originalCollateralAmount))
      .minus(updatedCollateralAmount)
      .toFixed(collateralPrecision)
    if (!syncMode && walletKeeper) {
      result = await sendTokens(
        await walletKeeper.getWallet('pta'),
        PROCESS.PENDING_TRADE_ADDRESS,
        trade.traderAddress,
        trade.collateralTokenType,
        difference,
        {
          transaction_type: 'update_trade_request',
          data: {
            trade_id: String(trade.id),
            collateral_token_amount: updatedCollateralAmount,
            trade_status: String(TradeStatusEnum.PENDING),
          },
        }
      )
      if (result === null || result.code !== 0) {
        return null
      }
      printTransactionResponse(result)
      if (result.code !== 0) {
        return result
      }
    }
  }
  const resp = await fetchWithRetries(
    DOMAIN +
      `/api/data/trade/update_trade_request?tokenAmount=${updatedCollateralAmount}&tradeId=${trade.id}`,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...constructCookie(),
      },
    }
  )
  if (resp == null) {
    return null
  }
  return result
}

/**
 * PTA => TA technically could come from anyone
 * @param tradeIds
 * @returns
 */
export const processGetTradeStatus = async (
  tradeIds: Array<string>,
  walletKeeper: WalletKeeper | null,
  token: string,
  syncMode: boolean = false
): Promise<DeliverTxResponse | null> => {
  const response = await fetchWithRetries(
    DOMAIN +
      `/api/data/trade/get_trades?ids=${tradeIds}&limit=${TRADES_RATE_LIMIT}`,
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
  const trades = (await response.json()) as Trade[]
  if (trades.length === 0) {
    return null
  }

  const { hasError, precision: collateralPrecision } = await getTokenPrecision(
    trades[0].collateralTokenType
  )

  if (hasError) {
    return null
  }

  // Send message instead
  let result: DeliverTxResponse | null = null
  if (!syncMode && walletKeeper) {
    result = await sendTokens(
      await walletKeeper.getWallet('pta'),
      PROCESS.PENDING_TRADE_ADDRESS,
      trades[0].traderAddress,
      trades[0].collateralTokenType,
      BigNumber(10)
        .exponentiatedBy(-collateralPrecision)
        .toFixed(collateralPrecision),
      {
        transaction_type: 'get_trade_status',
        data: {
          trade_id: tradeIds[0],
          trade_status: String(trades[0].status),
        },
      }
    )
    if (result === null || result.code !== 0) {
      return null
    }
    printTransactionResponse(result)
  }
  return result
}

// Protocol to Protocol Messaging

/**
 * PTA => LTA
 * @param tokenType
 * @param tokenAmount
 * @returns
 */
export const executeTrade = async (
  tokenType: string,
  tokenAmount: string,
  entranceFee: string,
  tradeId: string,
  matchId: string,
  matcherAddress: string,
  walletKeeper: WalletKeeper
): Promise<DeliverTxResponse | null> => {
  console.log('made it to executeTrade')
  const { hasError, precision: collateralPrecision } = await getTokenPrecision(
    tokenType
  )
  if (hasError) {
    return null
  }
  tokenType = await getTokenDenomFromRegistry(tokenType)
  const tradeBalance = await getBalance(
    walletKeeper,
    'pta',
    PROCESS.PENDING_TRADE_ADDRESS,
    tokenType
  )
  console.log('tradeBalance pta=', tradeBalance, tokenType, tokenAmount)
  if (tradeBalance && BigNumber(tradeBalance).isLessThan(tokenAmount)) {
    console.log('not enough balance in match vault to complete trade')
    console.log(
      `executeTrade: pta balance= ${tradeBalance}, collateral token amount= ${tokenAmount}`
    )
    Sentry.captureException(
      `not enough balance in match vault to complete trade`
    )
    return null
  }
  const rewardsAmount = BigNumber(entranceFee).times(
    BigNumber(REWARDS_PERCENTAGE).div(100)
  )
  const matcherAmount = BigNumber(entranceFee).times(
    BigNumber(MATCHER_PERCENTAGE).div(100)
  )
  const ubiAmount = BigNumber(entranceFee).times(
    BigNumber(UBI_PERCENTAGE).div(100)
  )
  const transferFromPendingTradeAddressToLiveTradeAddress = sendTokensMultiMsg(
    await walletKeeper.getWallet('pta'),
    PROCESS.PENDING_TRADE_ADDRESS,
    BigNumber(entranceFee).isLessThan(
      BigNumber(10).exponentiatedBy(-collateralPrecision)
    )
      ? []
      : ([
          {
            typeUrl: '/cosmos.bank.v1beta1.MsgSend',
            value: {
              fromAddress: PROCESS.PENDING_TRADE_ADDRESS,
              toAddress: PROCESS.ENTRANCE_FEE_ADDRESS,
              amount: [
                {
                  denom: tokenType,
                  amount: rewardsAmount
                    .times(BigNumber(10).exponentiatedBy(collateralPrecision))
                    .toFixed(0),
                },
              ],
              memo: JSON.stringify({
                transaction_type: 'collect_entrance_fee',
                data: {
                  collateral_token_amount:
                    rewardsAmount.toFixed(collateralPrecision),
                },
              }),
            } as unknown as EncodeObject,
          },
          {
            typeUrl: '/cosmos.bank.v1beta1.MsgSend',
            value: {
              fromAddress: PROCESS.PENDING_TRADE_ADDRESS,
              toAddress: PROCESS.UBI_ADDRESS,
              amount: [
                {
                  denom: tokenType,
                  amount: ubiAmount
                    .times(BigNumber(10).exponentiatedBy(collateralPrecision))
                    .toFixed(0),
                },
              ],
              memo: JSON.stringify({
                transaction_type: 'collect_entrance_fee',
                data: {
                  collateral_token_amount:
                    ubiAmount.toFixed(collateralPrecision),
                },
              }),
            } as unknown as EncodeObject,
          },
          {
            typeUrl: '/cosmos.bank.v1beta1.MsgSend',
            value: {
              fromAddress: PROCESS.PENDING_TRADE_ADDRESS,
              toAddress: matcherAddress,
              amount: [
                {
                  denom: tokenType,
                  amount: matcherAmount
                    .times(BigNumber(10).exponentiatedBy(collateralPrecision))
                    .toFixed(0),
                },
              ],
              memo: JSON.stringify({
                transaction_type: 'collect_entrance_fee',
                data: {
                  collateral_token_amount:
                    matcherAmount.toFixed(collateralPrecision),
                },
              }),
            } as unknown as EncodeObject,
          },
          // execute trade
          {
            typeUrl: '/cosmos.bank.v1beta1.MsgSend',
            value: {
              fromAddress: PROCESS.PENDING_TRADE_ADDRESS,
              toAddress: PROCESS.LIVE_TRADE_ADDRESS,
              amount: [
                {
                  denom: tokenType,
                  amount: BigNumber(tokenAmount)
                    .times(BigNumber(10).exponentiatedBy(collateralPrecision))
                    .toFixed(0),
                },
              ],
              // Need way to get memo for each message if possible
              memo: JSON.stringify({
                transaction_type: 'execute_trade',
                data: {
                  trade_id: tradeId,
                  match_id: matchId,
                },
              }),
            } as unknown as EncodeObject,
          },
        ] as EncodeObject[]),
    {
      transaction_type: 'execute_trade',
      data: {
        trade_id: tradeId,
        match_id: matchId,
      },
    }
  )
  const result = await transferFromPendingTradeAddressToLiveTradeAddress
  if (result === null || result.code !== 0) {
    return null
  }
  printTransactionResponse(result)
  return result
}

/**
 * LTA => IA
 * @param tokenType
 * @param tokenAmount
 * @returns
 */
export const sendInterestToInterestAddress = async (
  messages: EncodeObject[],
  walletKeeper: WalletKeeper
): Promise<DeliverTxResponse | null> => {
  // console.log('sendInterestToInterestAddress ')
  const result = await sendTokensMultiMsg(
    await walletKeeper.getWallet('lta'),
    PROCESS.LIVE_TRADE_ADDRESS,
    messages,
    {
      transaction_type: 'collect_interest',
      data: {},
    }
  )
  if (result === null || result.code !== 0) {
    return null
  }
  printTransactionResponse(result)
  return result
}

/**
 * IA => TA
 * @param tokenType
 * @param tokenAmount
 * @returns
 */
export const disperseInterestToRecepients = async (
  walletKeeper: WalletKeeper,
  tradeId: string,
  messages: EncodeObject[]
): Promise<DeliverTxResponse | null> => {
  const result = await sendTokensMultiMsg(
    await walletKeeper.getWallet('ia'),
    PROCESS.INTEREST_ADDRESS,
    messages,
    {
      transaction_type: 'disperse_interest',
      data: {
        trade_id: tradeId,
      },
    }
  )
  if (result === null || result.code !== 0) {
    return null
  }
  printTransactionResponse(result)
  return result
}

/**
 * MVA => LTA
 * @param tokenType
 * @param tokenAmount
 * @returns
 */
export const executeMatch = async (
  collateralTokenType: string,
  tokenAmount: string,
  tradeId: string,
  matchId: string,
  walletKeeper: WalletKeeper
): Promise<DeliverTxResponse | null> => {
  console.log('made it to executeMatch')
  console.log('tokenAmountFromTrade ', tokenAmount)
  const { hasError, precision: collateralPrecision } = await getTokenPrecision(
    collateralTokenType
  )
  if (hasError) {
    return null
  }
  const collateralTokenTypeDenom = await getTokenDenomFromRegistry(
    collateralTokenType
  )
  const matchBalance = await getBalance(
    walletKeeper,
    'mv',
    PROCESS.MATCH_VAULT_ADDRESS,
    collateralTokenTypeDenom
  )
  if (matchBalance && BigNumber(matchBalance).isLessThan(tokenAmount)) {
    console.log('not enough balance in match vault to complete trade')
    console.log(
      `executeMatch: mv balance= ${matchBalance}, collateral token amount= ${tokenAmount}`
    )
    Sentry.captureException(
      `not enough balance in match vault to complete trade`
    )
    return null
  }
  const transferFromPendingTradeAddressToLiveTradeAddress = sendTokensMultiMsg(
    await walletKeeper.getWallet('mv'),
    PROCESS.MATCH_VAULT_ADDRESS,
    [
      {
        typeUrl: '/cosmos.bank.v1beta1.MsgSend',
        value: {
          fromAddress: PROCESS.MATCH_VAULT_ADDRESS,
          toAddress: PROCESS.LIVE_TRADE_ADDRESS,
          amount: [
            {
              denom: collateralTokenTypeDenom,
              amount: BigNumber(tokenAmount)
                .times(BigNumber(10).exponentiatedBy(collateralPrecision))
                .toFixed(0),
            },
          ],
          memo: JSON.stringify({
            transaction_type: 'execute_match',
            data: {
              trade_id: tradeId,
              match_id: matchId,
            },
          }),
        } as unknown as EncodeObject,
      },
    ] as EncodeObject[],
    {
      transaction_type: 'execute_match',
      data: {
        trade_id: tradeId,
        match_id: matchId,
      },
    }
  )
  const result = await transferFromPendingTradeAddressToLiveTradeAddress
  if (result === null || result.code !== 0) {
    return null
  }
  printTransactionResponse(result)
  return result
}

/**
 * MVA => MA
 * @param tokenType
 * @param tokenAmount
 * @returns
 */
export const processWithdrawMatchRequest = async (
  autoHedged: boolean,
  tokenType: string,
  targetTokenType: string,
  tokenAmount: string,
  match: Match,
  walletKeeper: WalletKeeper | null,
  txnHash: string,
  token: string,
  syncMode: boolean = false
): Promise<DeliverTxResponse | null> => {
  // match vault address => matcher address on withdrawal
  // Send token amount if enough in vault, otherwise don't send anything (like how banks work)
  // Should reconsider storing amount in live trades as computed field on match
  const { hasError, precision: tokenPrecision } = await getTokenPrecision(
    tokenType
  )
  if (hasError) {
    return null
  }
  const balanceLeft = BigNumber(match.tokenAmount)
    .minus(tokenAmount)
    .toFixed(tokenPrecision)
  console.log('balanceLeft=', balanceLeft)
  const enoughInVault = BigNumber(balanceLeft)
    .minus(
      BigNumber.max(match.encumberedTokenAmount, match.dydxTokenAmount ?? 0)
    )
    .isGreaterThanOrEqualTo(0)
  console.log('enoughInVault=', enoughInVault)
  let result: DeliverTxResponse | null = null
  let success = false
  const matcherVaultAbbr = autoHedged ? 'ha' : 'mv'
  const matcherVaultAddress = autoHedged
    ? PROCESS.HEDGE_ADDRESS
    : PROCESS.MATCH_VAULT_ADDRESS
  const tokenTypeDenom = await getTokenDenomFromRegistry(tokenType)
  if (!syncMode && walletKeeper && enoughInVault) {
    const matchBalance = await getBalance(
      walletKeeper,
      matcherVaultAbbr,
      matcherVaultAddress,
      tokenTypeDenom
    )
    if (matchBalance && BigNumber(matchBalance).isLessThan(tokenAmount)) {
      console.log('not enough balance in match vault to withdraw')
      console.log(
        `processWithdrawMatchRequest: mv balance= ${matchBalance}, token amount= ${tokenAmount}`
      )
      Sentry.captureException(
        `not enough balance in match vault to complete trade`
      )
      return null
    }
    console.log('sending directly from match vault to matcher address')
    result = await sendTokens(
      await walletKeeper.getWallet(matcherVaultAbbr),
      matcherVaultAddress,
      match.matcherAddress,
      match.tokenType,
      tokenAmount,
      {
        transaction_type: 'withdraw_match',
        data: {
          // In future can give insight into how held up in trade in response
          match_id: String(match.id),
          collateral_token_amount: balanceLeft,
          collateral_token_type: match.tokenType,
          auto_hedged: String(autoHedged),
        },
      }
    )
    if (result === null || result.code !== 0) {
      return null
    }
    printTransactionResponse(result)
    success = true
  } else if (!syncMode && walletKeeper && !enoughInVault && autoHedged) {
    console.log(
      'autoHedged=true, but not enough in vault to withdraw so checking dydx amount'
    )
    // Check if dydxTokenAmount has enough if so we withdraw from dydx and ibc transfer to matcher address directly
    const unencumberedDYDX = BigNumber(match.dydxTokenAmount ?? 0).minus(
      match.encumberedTokenAmount
    )
    console.log('unencumberedDYDX=', unencumberedDYDX.toFixed(10))
    const unencumberedSif = BigNumber(match.tokenAmount).minus(
      BigNumber.max(match.encumberedTokenAmount, match.dydxTokenAmount ?? 0)
    )
    console.log('unencumberedSif=', unencumberedSif.toFixed(10))
    const amountToWithdrawFromDYDX =
      BigNumber(tokenAmount).minus(unencumberedSif)
    console.log(
      'amountToWithdrawFromDYDX=',
      amountToWithdrawFromDYDX.toFixed(10)
    )
    const amountToWithdrawFromSif = BigNumber(tokenAmount).minus(
      amountToWithdrawFromDYDX
    )
    console.log('amountToWithdrawFromSif=', amountToWithdrawFromSif.toFixed(10))
    if (
      amountToWithdrawFromDYDX.isGreaterThan(0) &&
      unencumberedDYDX.isGreaterThanOrEqualTo(amountToWithdrawFromDYDX)
    ) {
      console.log('trying to withdraw from dydx')
      // send sif token amount to matcher
      const matchBalance = await getBalance(
        walletKeeper,
        matcherVaultAbbr,
        matcherVaultAddress,
        tokenTypeDenom
      )
      if (
        matchBalance &&
        BigNumber(matchBalance).isLessThan(amountToWithdrawFromSif)
      ) {
        console.log('not enough balance in match vault to withdraw')
        console.log(
          `processWithdrawMatchRequest: mv balance= ${matchBalance}, token amount= ${tokenAmount}`
        )
        Sentry.captureException(
          `not enough balance in match vault to complete trade`
        )
        return null
      }
      if (
        amountToWithdrawFromSif.isGreaterThanOrEqualTo(
          BigNumber(10).exponentiatedBy(-tokenPrecision)
        )
      ) {
        console.log('sending directly from match vault to matcher address')
        result = await sendTokens(
          await walletKeeper.getWallet(matcherVaultAbbr),
          matcherVaultAddress,
          match.matcherAddress,
          match.tokenType,
          amountToWithdrawFromSif.toFixed(tokenPrecision),
          {
            transaction_type: 'withdraw_match',
            data: {
              // In future can give insight into how held up in trade in response
              match_id: String(match.id),
              collateral_token_amount: BigNumber(match.tokenAmount)
                .minus(amountToWithdrawFromSif)
                .toFixed(tokenPrecision),
              collateral_token_type: match.tokenType,
              auto_hedged: String(autoHedged),
            },
          }
        )
        if (result === null || result.code !== 0) {
          return null
        }
        printTransactionResponse(result)
        const resp = await fetchWithRetries(
          DOMAIN +
            `/api/data/match/withdraw_match?tokenType=${tokenType}&tokenAmount=${BigNumber(
              match.tokenAmount
            )
              .minus(amountToWithdrawFromSif)
              .toFixed(tokenPrecision)}&matcherAddress=${
              match.matcherAddress
            }&txnHash=${txnHash}&type=${
              autoHedged == true ? TradeTypeEnum.HEDGED : TradeTypeEnum.UNHEDGED
            }`,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
              ...constructCookie(),
            },
          }
        )
        if (resp == null || resp.status !== 200) {
          const data = await resp?.json()
          console.log(`ERROR: response= ${JSON.stringify(data)}`)
          Sentry.captureException(`ERROR: response= ${JSON.stringify(data)}`)
          return null
        }
      }
      // withdraw that amount from dydx and ibc transfer back to sifchain
      console.log('withdrawing from dydx')
      const resp = await fetchWithRetries(
        DOMAIN +
          `/api/data/trade/withdraw_funds_from_dydx_specific_account?tokenType=${tokenType}&tokenAmount=${amountToWithdrawFromDYDX}&matcherAddress=${match.matcherAddress}`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            ...constructCookie(),
          },
        }
      )
      if (resp === null || resp.status !== 200) {
        const data = await resp?.json()
        console.log(`ERROR: response= ${JSON.stringify(data)}`)
        Sentry.captureException(`ERROR: response= ${JSON.stringify(data)}`)
        return null
      }
      success = true
    }
  }

  if (success) {
    const resp = await fetchWithRetries(
      DOMAIN +
        `/api/data/match/withdraw_match?tokenType=${tokenType}&tokenAmount=${balanceLeft}&matcherAddress=${
          match.matcherAddress
        }&txnHash=${txnHash}&type=${
          autoHedged == true ? TradeTypeEnum.HEDGED : TradeTypeEnum.UNHEDGED
        }`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...constructCookie(),
        },
      }
    )
    if (resp == null || resp.status !== 200) {
      const data = await resp?.json()
      console.log(`ERROR: response= ${JSON.stringify(data)}`)
      Sentry.captureException(`ERROR: response= ${JSON.stringify(data)}`)
      return null
    }
  }
  return result
}

/**
 * LTA => TA
 * @param trade
 */
const createCloseTradeMsg = async (
  trade: Trade,
  amountToSend: BigNumber
): Promise<EncodeObject | null> => {
  const { collateralTokenType, traderAddress } = trade
  const { hasError, precision: collateralPrecision } = await getTokenPrecision(
    collateralTokenType
  )
  console.log('amountToSend ', amountToSend.toFixed(20))
  if (
    hasError ||
    BigNumber(amountToSend).isLessThan(
      BigNumber(10).exponentiatedBy(-collateralPrecision)
    )
  ) {
    return null
  }

  const memo: Memo = {
    transaction_type: 'close_trade',
    data: {
      trade_id: String(trade.id),
      // should show current price interest taken net gain etc
    },
  }
  const collateralTokenTypeDenom = await getTokenDenomFromRegistry(
    collateralTokenType
  )
  return {
    typeUrl: '/cosmos.bank.v1beta1.MsgSend',
    value: {
      fromAddress: PROCESS.LIVE_TRADE_ADDRESS,
      toAddress: traderAddress,
      amount: [
        {
          denom: collateralTokenTypeDenom,
          amount: amountToSend
            .times(BigNumber(10).exponentiatedBy(collateralPrecision))
            .toFixed(0),
        },
      ],
      memo: memo,
    } as unknown as EncodeObject,
  }
}

/**
 *
 * @param trade
 * @param amountToSend
 * @param walletKeeper
 * @returns
 */
export const createCloseMatchMsg = async (
  trade: Trade,
  amountToSend: BigNumber,
  token: string
): Promise<EncodeObject | null> => {
  const { id, collateralTokenType } = trade
  const { hasError, precision: collateralPrecision } = await getTokenPrecision(
    collateralTokenType
  )
  console.log('collateralPrecision ', collateralPrecision)
  console.log(' amountToSend ', amountToSend.toFixed(20))
  if (
    hasError ||
    BigNumber(amountToSend).isLessThan(
      BigNumber(10).exponentiatedBy(-collateralPrecision)
    )
  ) {
    return null
  }
  const resp = await fetchWithRetries(
    DOMAIN + `/api/data/trade/get_match_for_trade?id=${id}`,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...constructCookie(),
      },
    }
  )
  if (resp == null) {
    return null
  }
  const match = (await resp.json()) as Match | null
  if (match === null) {
    return null
  }
  const memo: Memo = {
    transaction_type: 'close_match',
    data: {
      trade_id: String(id),
      match_id: String(match.id),
    },
  }
  const collateralTokenTypeDenom = await getTokenDenomFromRegistry(
    collateralTokenType
  )

  return {
    typeUrl: '/cosmos.bank.v1beta1.MsgSend',
    value: {
      fromAddress: PROCESS.LIVE_TRADE_ADDRESS,
      toAddress: PROCESS.MATCH_VAULT_ADDRESS,
      amount: [
        {
          denom: collateralTokenTypeDenom,
          amount: amountToSend
            .times(BigNumber(10).exponentiatedBy(collateralPrecision))
            .toFixed(0),
        },
      ],
      memo: memo,
    } as unknown as EncodeObject,
  }
}

export const processCloseTradeTransaction = async (
  trade: Trade,
  walletKeeper: WalletKeeper,
  token: string
): Promise<DeliverTxResponse | null> => {
  const { collateralTokenAmount, id, maxProfitMultiplier } = trade
  const traderPandL = BigNumber(await calculateCurrentTraderPandL(trade))
  const amountToSendToTrader = BigNumber(collateralTokenAmount).plus(
    traderPandL
  )
  // We should use maxProfitMultiplier from trade
  const amountToSendToMatcher = BigNumber(
    BigNumber(maxProfitMultiplier).plus(1)
  )
    .times(collateralTokenAmount)
    .minus(amountToSendToTrader)
  let closeTradeMsg = null
  if (amountToSendToTrader.isGreaterThan(0)) {
    console.log('LTA => TA')
    closeTradeMsg = await createCloseTradeMsg(
      trade,
      BigNumber(
        Math.min(
          BigNumber(BigNumber(maxProfitMultiplier).plus(1))
            .times(collateralTokenAmount)
            .toNumber(),
          amountToSendToTrader.toNumber()
        )
      )
    )
  }
  console.log('closeTradeMsg', closeTradeMsg)
  let closeMatchMsg = null
  if (amountToSendToMatcher.isGreaterThan(0)) {
    console.log('LTA => MVA')
    closeMatchMsg = await createCloseMatchMsg(
      trade,
      BigNumber(
        Math.min(
          BigNumber(BigNumber(maxProfitMultiplier).plus(1))
            .times(collateralTokenAmount)
            .toNumber(),
          amountToSendToMatcher.toNumber()
        )
      ),
      token
    )
    console.log('closeMatchMsg', closeMatchMsg)
  }

  // Okay for 1 to be null if Max Profit or sharp price change surpasses Max Profit
  if (closeMatchMsg === null && closeTradeMsg === null) {
    return null
  }
  // todo 2nd in order to update
  const result = await sendTokensMultiMsg(
    await walletKeeper.getWallet('lta'),
    PROCESS.LIVE_TRADE_ADDRESS,
    [closeTradeMsg, closeMatchMsg].filter(
      val => val !== null
    ) as EncodeObject[],
    {
      transaction_type: 'close_trade',
      data: {
        trade_id: String(id),
      },
    }
  )
  if (result === null || result.code !== 0) {
    return null
  }
  printTransactionResponse(result)
  return result
}

/**
 * PTA => TA
 * @returns
 */
export const processCancelTradeRequest = async (
  trade: Trade,
  walletKeeper: WalletKeeper | null,
  token: string,
  syncMode: boolean = false
): Promise<DeliverTxResponse | null> => {
  const {
    id,
    collateralTokenType,
    traderAddress,
    collateralTokenAmount,
    targetTokenType,
  } = trade
  const tradeId = String(id)
  const collateralTokenDisplaySymbol = (
    await getTokenDataFromUiRegistry(collateralTokenType)
  ).displaySymbol
  const coinPairDetail = await getCoinGeckoCoinPairDetail(
    'usd',
    formatTokenForPriceList(collateralTokenDisplaySymbol),
    formatTokenForPriceList(targetTokenType)
  )
  const { hasError, precision: collateralPrecision } = await getTokenPrecision(
    collateralTokenType
  )
  const currentCollateralPrice = nullthrows(
    coinPairDetail.find(
      coin =>
        coin.symbol ===
        formatTokenForPriceList(collateralTokenDisplaySymbol).toLowerCase()
    )
  )['current_price']
  const currentTargetPrice = nullthrows(
    coinPairDetail.find(
      coin =>
        coin.symbol === formatTokenForPriceList(targetTokenType).toLowerCase()
    )
  )['current_price']
  const collateralPrice = currentCollateralPrice
    ? BigNumber(currentCollateralPrice).toFixed(collateralPrecision)
    : BigNumber(0).toFixed(collateralPrecision)
  const targetPrice = currentTargetPrice
    ? BigNumber(currentTargetPrice).toFixed(collateralPrecision)
    : BigNumber(0).toFixed(collateralPrecision)
  const entranceFee = await calculateEntranceFee(trade, coinPairDetail)
  const updatedCollateralAmount = BigNumber(collateralTokenAmount)
    .minus(entranceFee)
    .toFixed(collateralPrecision)
  console.log('entranceFee ', entranceFee)
  console.log('updatedCollateralAmount ', updatedCollateralAmount)
  if (
    hasError ||
    BigNumber(updatedCollateralAmount).isLessThan(
      BigNumber(10).exponentiatedBy(-collateralPrecision)
    )
  ) {
    return null
  }
  console.log('valid token amount')
  let result: DeliverTxResponse | null = null
  if (!syncMode && walletKeeper) {
    const collateralTokenTypeDenom = await getTokenDenomFromRegistry(
      trade.collateralTokenType
    )
    const tradeBalance = await getBalance(
      walletKeeper,
      'pta',
      PROCESS.PENDING_TRADE_ADDRESS,
      collateralTokenTypeDenom
    )
    if (
      tradeBalance &&
      BigNumber(tradeBalance).isLessThan(trade.collateralTokenAmount)
    ) {
      console.log('not enough balance to complete trade')
      console.log(
        `processCancelTradeRequest: pta balance= ${tradeBalance}, collateral token amount= ${trade.collateralTokenAmount}`
      )
      Sentry.captureException(`not enough balance to complete trade`)
      return null
    }
    result = await sendTokensMultiMsg(
      await walletKeeper.getWallet('pta'),
      PROCESS.PENDING_TRADE_ADDRESS,
      [
        BigNumber(entranceFee).isLessThan(
          BigNumber(10).exponentiatedBy(-collateralPrecision)
        )
          ? null
          : {
              typeUrl: '/cosmos.bank.v1beta1.MsgSend',
              value: {
                fromAddress: PROCESS.PENDING_TRADE_ADDRESS,
                toAddress: `${PROCESS.ENTRANCE_FEE_ADDRESS}`,
                amount: [
                  {
                    denom: collateralTokenTypeDenom,
                    amount: BigNumber(entranceFee)
                      .times(BigNumber(10).exponentiatedBy(collateralPrecision))
                      .toFixed(0),
                  },
                ],
                memo: JSON.stringify({
                  transaction_type: 'collect_entrance_fee',
                  data: {
                    collateral_token_amount: entranceFee,
                  },
                }),
              } as unknown as EncodeObject,
            },
        // cancel trade
        {
          typeUrl: '/cosmos.bank.v1beta1.MsgSend',
          value: {
            fromAddress: PROCESS.PENDING_TRADE_ADDRESS,
            toAddress: traderAddress,
            amount: [
              {
                denom: collateralTokenTypeDenom,
                amount: BigNumber(updatedCollateralAmount)
                  .times(BigNumber(10).exponentiatedBy(collateralPrecision))
                  .toFixed(0),
              },
            ],
            // Need way to get memo for each message if possible
            memo: JSON.stringify({
              transaction_type: 'cancel_trade_request',
              data: {
                trade_id: tradeId,
              },
            }),
          } as unknown as EncodeObject,
        },
      ].filter(x => x !== null) as EncodeObject[],
      {
        transaction_type: 'cancel_trade_request',
        data: {
          trade_id: tradeId,
        },
      }
    )
    if (result === null || result.code !== 0) {
      return null
    }
    printTransactionResponse(result)
    if (result.code !== 0) {
      console.log(`ERROR: response ${result.rawLog}`)
      Sentry.captureException(`ERROR: response ${result.rawLog}`)
      return result
    }
  }
  const resp = await fetchWithRetries(
    DOMAIN +
      `/api/data/trade/update_status?id=${trade.id}&status=CANCELLED&collateralPrice=${collateralPrice}&targetPrice=${targetPrice}`,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...constructCookie(),
      },
    }
  )
  if (resp == null) {
    return null
  }
  return result
}

export const sendTokens = async (
  offlineSigner: OfflineSigner | DirectSecp256k1HdWallet,
  sendingAddress: string,
  receivingAddress: string,
  collateralTokenType: string,
  collateralTokenAmount: string,
  memo: Memo | null
): Promise<DeliverTxResponse | null> => {
  return await mutex.runExclusive(async () => {
    console.log('made it to send tokens ')
    const { hasError, precision: collateralPrecision } =
      await getTokenPrecision(collateralTokenType)
    if (
      hasError ||
      BigNumber(collateralTokenAmount).isLessThan(
        BigNumber(10).exponentiatedBy(-collateralPrecision)
      )
    ) {
      console.log(
        `trying to send less than minimum token amount ${collateralTokenAmount}`
      )
      Sentry.captureException(
        `trying to send less than minimum token amount ${collateralTokenAmount}`
      )
      return null
    }

    const sifRpcUrl = await getSifRpcUrl()
    const client = await SigningStargateClient.connectWithSigner(
      sifRpcUrl!,
      offlineSigner
    )

    const rowanPrecision = (
      await getTokenRegistryEntry('rowan', sifRpcUrl!)
    ).decimals.toNumber()
    // console.log('sendingAddress ', sendingAddress)
    // console.log('collateralPrecision ', collateralPrecision)
    // console.log('receivingAddress ', receivingAddress)
    // console.log('collateralTokenType ', tokenType)
    // console.log('collateralTokenAmount ', collateralTokenAmount)
    // console.log('memo ', memo)
    const collateralTokenTypeDenom = await getTokenDenomFromRegistry(
      collateralTokenType
    )
    const maxRetries = 3 // Set the maximum number of retries
    let attempt = 0

    while (attempt < maxRetries) {
      try {
        const signedTx = await client.sign(
          sendingAddress,
          [
            {
              typeUrl: '/cosmos.bank.v1beta1.MsgSend',
              value: {
                fromAddress: sendingAddress,
                toAddress: receivingAddress,
                amount: [
                  {
                    denom: collateralTokenTypeDenom,
                    amount: BigNumber(collateralTokenAmount)
                      .times(BigNumber(10).exponentiatedBy(collateralPrecision))
                      .toFixed(0),
                  },
                ],
              },
            },
          ],
          {
            amount: [
              {
                denom: 'rowan',
                amount: BigNumber(10)
                  .exponentiatedBy(rowanPrecision)
                  .toFixed(0),
              },
            ],
            gas: '250000',
          },
          JSON.stringify(memo)
        )
        const txBytes = TxRaw.encode(signedTx).finish()
        const txn = await client.broadcastTx(txBytes)
        await client.getTx(txn.transactionHash)
        if (txn.code !== 0) {
          console.log(`ERROR: response ${txn.rawLog}`)
          Sentry.captureException(txn.rawLog)
          continue
        }
        return txn
      } catch (error) {
        console.error('Attempt', attempt + 1, 'failed:', error)
        Sentry.captureException(error)
        attempt++
        if (attempt >= maxRetries) {
          return null // Max retries reached, return null
        }
        await delay(3) // Wait for 3 second before retrying
      }
    }
    return null
  })
}

export const sendTokensMultiMsg = async (
  offlineSigner: OfflineSigner | DirectSecp256k1HdWallet,
  sendingAddress: string,
  messages: EncodeObject[],
  memo: Memo
): Promise<DeliverTxResponse | null> => {
  return await mutex.runExclusive(async () => {
    const sifRpcUrl = await getSifRpcUrl()
    const client = await SigningStargateClient.connectWithSigner(
      sifRpcUrl!,
      offlineSigner
    )
    console.log('made it to send tokens multi-msg')
    const rowanPrecision = (
      await getTokenRegistryEntry('rowan', sifRpcUrl!)
    ).decimals.toNumber()
    // console.log('sendingAddress ', sendingAddress)
    // console.log('messages ', messages)
    // console.log('memo ', memo)
    const maxRetries = 3 // Set the maximum number of retries
    let attempt = 0

    while (attempt < maxRetries) {
      try {
        const signedTx = await client.sign(
          sendingAddress,
          messages,
          {
            amount: [
              /* Todo: it should be dynamic tokenType array amount? like below?
              {
                denom: 'rowan',
                amount: BigNumber(10).exponentiatedBy(precision).toFixed(0),
              },
              {
                denom: 'cusdc',
                amount: BigNumber(10).exponentiatedBy(precision).toFixed(0),
              }

              also if the gas fee will be same the amount ('100000000')
              */
              {
                denom: 'rowan',
                amount: BigNumber(10)
                  .exponentiatedBy(rowanPrecision)
                  .toFixed(0),
              },
            ],
            gas: '100000000',
          },
          JSON.stringify(memo)
        )
        const txBytes = TxRaw.encode(signedTx).finish()
        const txn = await client.broadcastTx(txBytes)
        await client.getTx(txn.transactionHash)
        if (txn.code !== 0) {
          console.log(`ERROR: response ${txn.rawLog}`)
          Sentry.captureException(txn.rawLog)
          continue
        }
        return txn
      } catch (error) {
        console.error('Attempt', attempt + 1, 'failed:', error)
        Sentry.captureException(error)
        attempt++
        if (attempt >= maxRetries) {
          return null // Max retries reached, return null
        }
        await delay(3) // Wait for 3 second before retrying
      }
    }
    return null
  })
}

export const getParsedJSON = (jsonString: string): any | null => {
  // remove outer quotes
  try {
    if (jsonString.length < 2) {
      return null
    }
    const trimmedString = jsonString.substring(1, jsonString.length - 1)
    let parsedJSON = JSON.parse(trimmedString)
    if (typeof parsedJSON === 'object') {
      return parsedJSON
    } else {
      // Margin Transaction as embedded string
      parsedJSON = JSON.parse(parsedJSON)
      return parsedJSON
    }
  } catch (e) {
    console.log('error parsing JSON ', e)
    return null
  }
}

export const printTransactionResponse = (
  transaction: DeliverTxResponse
): void => {
  console.log(`Transaction response:
  ${
    transaction.code === 0
      ? `transaction hash ${transaction.transactionHash}`
      : `failure code ${transaction.code}`
  } data: ${transaction.rawLog}
  `)
}

export const getCoinGeckoCoinLists = async (
  vsCurrency: string,
  ids: string,
  order?: string,
  perPage?: number
): Promise<Array<CoinMarket>> => {
  const defaultOrder = order ? order : CoinListOrder.MARKET_CAP_DESC
  const defaultPerPage = perPage ? perPage : 100
  const response = await fetchWithRetries(
    DOMAIN +
      `/api/data/common/get_coingecko_coin_lists?vsCurrency=${vsCurrency}&ids=${ids}&order=${defaultOrder}&perPage=${defaultPerPage}`,
    {
      headers: {
        ...constructCookie(),
      },
    }
  )
  return ((await response?.json()) ?? []) as Array<CoinMarket>
}

export const getCoinIdsBySymbols = (symbols: string): string => {
  const symbolList = symbols.split(',').map(symbol => symbol.toLowerCase())
  const coinIds = TARGET_COIN_LIST.filter(coin => {
    let symbol = coin.symbol
    if (symbol == 'erowan') {
      return symbolList.includes('erowan') || symbolList.includes('rowan')
    } else if (symbol == 'usdc')
      // in case of uusdc, return usd-coin as well as uusdc
      return symbolList.includes('uusdc') || symbolList.includes('usdc')
    return symbolList.includes(symbol)
  }).map(coin => coin.id)
  return coinIds.join(',')
}

export const formatTokenForPriceList = (symbol: string): string => {
  if (symbol === 'rowan') {
    return 'erowan'
  }
  return symbol
}

export const getCoinGeckoCoinPairDetail = async (
  vsCurrency: string,
  tokenType: string,
  pairTokenType?: string
): Promise<Array<CoinMarket>> => {
  const isPairSymbol = pairTokenType ? true : false
  let ids = ''
  tokenType = formatTokenForPriceList(tokenType)
  if (pairTokenType) {
    pairTokenType = formatTokenForPriceList(pairTokenType)
    ids = getCoinIdsBySymbols(tokenType + ',' + pairTokenType)
  } else {
    ids = getCoinIdsBySymbols(tokenType)
  }
  let coinMarkets = await getCoinGeckoCoinLists(
    vsCurrency,
    ids,
    CoinListOrder.MARKET_CAP_DESC,
    isPairSymbol ? 2 : 1
  )
  return coinMarkets
}

export const getCoinGeckoCoinPairDetailAPI = async (
  vsCurrency: string,
  tokenType: string,
  pairTokenType?: string
): Promise<Array<CoinMarket>> => {
  const isPairSymbol = pairTokenType ? true : false
  let ids = ''
  if (tokenType === 'rowan') {
    tokenType = 'erowan'
  }
  if (pairTokenType) {
    if (pairTokenType === 'rowan') {
      pairTokenType = 'erowan'
    }
    ids = getCoinIdsBySymbols(tokenType + ',' + pairTokenType)
  } else {
    ids = getCoinIdsBySymbols(tokenType)
  }
  const resp = await fetchWithRetries(
    `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${
      vsCurrency as string
    }&ids=${ids as string}&order=${CoinListOrder.MARKET_CAP_DESC}&per_page=${
      isPairSymbol ? 2 : 1
    }`
  )
  if (resp == null) {
    return []
  }
  let coinMarkets = (await resp.json()) as CoinMarket[]
  // if (!PROCESS.USE_COOKIE) {
  //   const sifEnv = AppCookies().getEnv()
  //   const sifCustomPricing = AppCookies().getCustomPricing()
  //   coinList = await overrideCgPricing(
  //     sifEnv,
  //     sifCustomPricing,
  //     coinList,
  //     customPricingData
  //   )
  // }
  // special handling for "uusdc": duplicate "usd-coin"
  if ((ids as string).includes('uusdc')) {
    const usdCoinIndex = coinMarkets.findIndex(coin => coin.id === 'usd-coin')

    if (usdCoinIndex !== -1) {
      const usdCoin = coinMarkets[usdCoinIndex]
      const uusdcCoin = { ...usdCoin, symbol: 'uusdc' }
      coinMarkets.push(uusdcCoin)
    }
  }
  return coinMarkets
}

export async function getTokenDataFromUiRegistry(tokenName: string) {
  const uiAssetsRegistry = await getUiTokenRegistry()
  const tokenData = getSingleUiAssetData(uiAssetsRegistry, tokenName)
  return tokenData
}

export async function getTokenDenomFromRegistry(tokenName: string) {
  const sifRpcUrl = await getSifRpcUrl()
  const tokenData = await getTokenDataFromUiRegistry(tokenName)
  const tokenRegistryData = await getTokenRegistryEntry(
    tokenData.label?.toLowerCase()!,
    sifRpcUrl!
  )
  return tokenRegistryData.denom
}

export async function overrideCgPricing(
  sifEnv: string | undefined,
  sifCustomPricing: string | undefined,
  coinList: CoinMarket[],
  customPricingData: Array<CoinMarketCustomPrice>
) {
  if (sifEnv !== 'mainnet' && sifCustomPricing === '1') {
    customPricingData.forEach(({ id, current_price }) => {
      coinList.forEach((entry, index) => {
        if (entry.id === id) {
          coinList[index].current_price = current_price
        }
      })
    })
  }
  return coinList
}

export type CoinMarketCustomPrice = {
  id: string
  current_price: number
}

// export const exportToEth = async (
//   signer: OfflineSigner,
//   collateralTokenType: string,
//   collateralTokenAmount: string,
//   memo: Memo | null
// ): Promise<DeliverTxResponse | null> => {
//   if (isEvmBridgedCoin(collateralTokenType)) {
//     const response = await fetchWithRetries(
//       DOMAIN + `/api/data/common/get_rpc_url`,
//       {
//         headers: {
//           ...constructCookie(),
//         },
//       }
//     )
//     const sifRpcUrl = await getSifRpcUrl()
//     const client = await SifSigningStargateClient.connectWithSigner(
//       sifRpcUrl!,
//       signer
//     )
//     // TODO Given that Gas from Sifchain => Eth is ~ $65 how is this feasible?
//     try {
//       const sendToEthTxnResponse = await client.signAndBroadcast(
//         PROCESS.HEDGE_ADDRESS,
//         [
//           {
//             typeUrl: '/sifnode.ethbridge.v1.MsgBurn',
//             value: {
//               cosmosSender: PROCESS.HEDGE_ADDRESS,
//               amount: collateralTokenAmount,
//               symbol: collateralTokenType,
//               ethereumChainId: Long.fromNumber(ETH_CHAIN_ID),
//               ethereumReceiver: PROCESS.HEDGE_TRADE_ETH_ADDRESS,
//               cethAmount: '353700000000000000',
//             },
//           } as SifEncodeObject,
//         ],
//         DEFAULT_FEE,
//         JSON.stringify(memo ?? {})
//       )
//       console.log('sendToEthTxnResponse ', sendToEthTxnResponse)
//       if (sendToEthTxnResponse.code !== 0 || sendToEthTxnResponse === null) {
//         console.log(`ERROR: response ${sendToEthTxnResponse.rawLog}`)
//         Sentry.captureException(
//           `ERROR: response ${sendToEthTxnResponse.rawLog}`
//         )
//         return null
//       }
//       return sendToEthTxnResponse
//     } catch (error: any) {
//       console.log(`ERROR: response ${error}`)
//       Sentry.captureException(`ERROR: response ${error}`)
//       return null
//     }
//   }
//   return null
// }

// Currently using Eth only
// export const importToSifFromEth = async (
//   senderAddress: string,
//   receiverAddress: string,
//   clientEnv: NetworkEnv | undefined,
//   amount: BigNumberish
// ): Promise<Array<ContractReceipt>> => {
//   const provider = ethers.getDefaultProvider(
//     clientEnv === 'mainnet' ? 'homestead' : 'goerli',
//     {
//       etherscan: process.env.ETHERSCAN_API_KEY,
//       infura: process.env.INFURA_API_KEY,
//       alchemy: process.env.ALCHEMY_API_KEY,
//       pocket: {
//         applicationId: process.env.POCKET_APP_ID,
//         applicationSecretKey: process.env.POCKET_APP_SECRET,
//       },
//     }
//   )
//   const signer = new ethers.Wallet(
//     process.env.HEDGE_TRADE_PRIVATE_KEY as string,
//     provider
//   )
//   const erc20Abi = [
//     'function approve(address _spender, uint256 _value) public returns (bool success)',
//   ]
//   const contract = new ethers.Contract(
//     ETH_CONTRACT_TOKEN_ADDRESS,
//     erc20Abi,
//     signer
//   )
//   const txn = (await contract['approve'](
//     DEFAULT_MAINNET_BRIDGEBANK_CONTRACT_ADDRESS,
//     amount
//   )) as ContractTransaction
//   const txnReceipt = await txn.wait()
//   console.log('txnReceipt1', txnReceipt)
//   if (txnReceipt.status !== 1) {
//     console.log(`ERROR: response ${txnReceipt.logs}`)
//     Sentry.captureException(`ERROR: response ${txnReceipt.logs}`)
//     return []
//   }
//   const evmSdk = getSdk(signer, {
//     bridgeBankContractAddress: DEFAULT_MAINNET_BRIDGEBANK_CONTRACT_ADDRESS,
//   })
//   // Working up until here first transaction address => smart
//   const result: ContractTransaction = await evmSdk.peggy.sendTokensToCosmos(
//     ethers.utils.toUtf8Bytes(receiverAddress),
//     DEFAULT_MAINNET_BRIDGEBANK_CONTRACT_ADDRESS,
//     amount
//   )
//   const txn2Receipt: ContractReceipt = await result.wait()
//   console.log('txn2Receipt ', txn2Receipt)
//   if (txn2Receipt.status !== 1) {
//     console.log(`ERROR: response ${txn2Receipt.logs}`)
//     Sentry.captureException(`ERROR: response ${txn2Receipt.logs}`)
//     return [txn2Receipt]
//   }
//   return [txn2Receipt]
// }

// either collateralTokenAmount if less than max leverage or leverage/max_leverage_for_market * collateralTokenAmount
export const getHedgeTradeTokenAmountInCollateralIncludingLeverageDiscrepancy =
  (trade: Trade, collateralPrecision: number): string => {
    return BigNumber(trade.leverageQuantity).isLessThanOrEqualTo(
      tokenToLeverage[trade.targetTokenType]
    )
      ? BigNumber(trade.collateralTokenAmount).toFixed(collateralPrecision)
      : BigNumber(
          BigNumber(trade.leverageQuantity).dividedBy(
            tokenToLeverage[trade.targetTokenType]
          )
        )
          .times(trade.collateralTokenAmount)
          .toFixed(collateralPrecision)
  }

export const getHedgeTradeTokenAmountInCollateralExcludingLeverage = (
  trade: Trade,
  collateralPrecision: number
): string => {
  return BigNumber(trade.leverageQuantity).isLessThanOrEqualTo(
    tokenToLeverage[trade.targetTokenType]
  )
    ? trade.collateralTokenAmount
    : BigNumber(
        BigNumber(trade.collateralTokenAmount).times(trade.leverageQuantity)
      )
        .dividedBy(tokenToLeverage[trade.targetTokenType])
        .toFixed(collateralPrecision)
}

export const getHedgeTradeLeverage = (trade: Trade): string => {
  return BigNumber(trade.leverageQuantity).isLessThanOrEqualTo(
    tokenToLeverage[trade.targetTokenType]
  )
    ? trade.leverageQuantity
    : String(tokenToLeverage[trade.targetTokenType])
}

export const updateNotOpenReason = async (
  trade: Trade,
  token: string,
  reason: TradeNotOpenReason | null
) => {
  if (trade.notOpenReason != null) {
    return
  }
  await fetchWithRetries(
    DOMAIN +
      `/api/data/trade/update_trade_not_open_reason?reason=${reason}&id=${trade.id}`,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...constructCookie(),
      },
    }
  )
}
