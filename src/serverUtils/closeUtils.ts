import { DeliverTxResponse } from '@sifchain/sdk'
import BigNumber from 'bignumber.js'
import { processCloseTrade, processWithdrawMatchRequest } from './marginUtils'
import { WalletKeeper } from './WalletKeeper'
import {
  DOMAIN,
  TOKEN_PRECISION_MAP,
  MAX_PROFIT_MULTIPLIER,
} from '../utils/constants/constants'
import { constructCookie } from '../serverUtils/constructCookie'
import {
  Trade,
  TradeDirectionEnum as TradeDirection,
  MatchVault as Match,
  TradeCloseReason,
  TradeDirectionEnum,
  TradeTypeEnum,
  TradeNotOpenReason,
  TradeStatusEnum,
} from './dbTypes'
import * as Sentry from '@sentry/nextjs'
import { fetchWithRetries } from './serverUtils'

export const shouldOpenTrade = (
  trade: Trade,
  currentPrice: string
): [boolean, TradeNotOpenReason | null] => {
  const {
    takeProfit,
    stopLoss,
    targetTokenType,
    targetTokenPrice,
    tradeDirection,
    leverageQuantity,
    requestToCloseTime,
    closeTxnHash,
    closeReason,
    limitPrice,
  } = trade
  const { shouldClose } = shouldCloseTrade(
    targetTokenType,
    targetTokenPrice,
    tradeDirection,
    leverageQuantity,
    takeProfit,
    stopLoss,
    requestToCloseTime,
    closeTxnHash,
    closeReason,
    currentPrice
  )
  // Add limit price check
  let reasonToNotOpen = null
  let shouldOpen = true
  if (shouldClose) {
    reasonToNotOpen = TradeNotOpenReason.SHOULD_BE_CLOSED
  }
  if (limitPrice != null && BigNumber(limitPrice).isGreaterThan(0)) {
    if (
      (tradeDirection == TradeDirectionEnum.LONG &&
        BigNumber(currentPrice).isGreaterThan(BigNumber(limitPrice))) ||
      (tradeDirection == TradeDirectionEnum.SHORT &&
        BigNumber(currentPrice).isLessThan(BigNumber(limitPrice)))
    ) {
      // limit price set and has not been reached
      console.log('limit price has not been reached')
      reasonToNotOpen = TradeNotOpenReason.LIMIT_PRICE
      shouldOpen = false
    }
  }
  return [
    !shouldClose && shouldOpen && trade.status !== TradeStatusEnum.ACTIVE,
    reasonToNotOpen,
  ]
}

export const shouldCloseTrade = (
  targetTokenType: string,
  tradeEntryPrice: string,
  tradeDirection: TradeDirectionEnum,
  leverage: string,
  takeProfit: string | null,
  stopLoss: string | null,
  requestToCloseTime: Date | null,
  closeTxnHash: string | null,
  closeReason: TradeCloseReason | null,
  currentPrice: string
): { shouldClose: boolean; reason: TradeCloseReason } => {
  let closeTradeRequestPast = false
  // If request to close time has passed and not manually closed, then close
  if (
    requestToCloseTime !== null &&
    BigNumber(new Date(requestToCloseTime).getTime()).isLessThanOrEqualTo(
      Date.now()
    ) &&
    closeReason !== TradeCloseReason.MANUALLY_CLOSED
  ) {
    console.log(
      `closing since request to close time past ${new Date(
        requestToCloseTime
      )} and current time is ${Date.now()}`
    )
    closeTradeRequestPast = true
  }
  if (closeTradeRequestPast) {
    return {
      shouldClose: true,
      reason: TradeCloseReason.REQUEST_TO_CLOSE_WINDOW_HIT,
    }
  }
  let takeProfitHit = false
  let stopLossHit = false
  let maxProfitHit = false
  let liquidationHit = false
  let maxProfit = BigNumber(0)
  let liquidationPrice = BigNumber(0)
  const currPrice = BigNumber(currentPrice)
  const targetPrecision = TOKEN_PRECISION_MAP[targetTokenType]
  // Need to resolve SLIPPAGE_TOLERANCE discrepancy
  // longMaxProfit = shortLiquidation
  // shortMaxProfit = longLiquidation
  if (tradeDirection === TradeDirection.LONG) {
    maxProfit = BigNumber(MAX_PROFIT_MULTIPLIER - 1)
      .times(tradeEntryPrice)
      .times(BigNumber(1).plus(BigNumber(1).dividedBy(leverage)))
    maxProfitHit = currPrice.isGreaterThanOrEqualTo(maxProfit)
    if (takeProfit !== null && takeProfit != '0.0') {
      takeProfitHit = currPrice.isGreaterThanOrEqualTo(takeProfit)
    }
    if (stopLoss !== null && stopLoss != '0.0') {
      stopLossHit = currPrice.isLessThanOrEqualTo(stopLoss)
    }
    liquidationPrice = BigNumber(tradeEntryPrice).times(
      BigNumber(1).minus(BigNumber(1).dividedBy(BigNumber(leverage).plus(1)))
    )
    liquidationHit = currPrice.isLessThanOrEqualTo(liquidationPrice)
  } else if (tradeDirection === TradeDirection.SHORT) {
    maxProfit = BigNumber(MAX_PROFIT_MULTIPLIER - 1)
      .times(tradeEntryPrice)
      .times(
        BigNumber(1).minus(BigNumber(1).dividedBy(BigNumber(leverage).plus(1)))
      )
    maxProfitHit = currPrice.isLessThanOrEqualTo(maxProfit)
    if (takeProfit !== null && takeProfit != '0.0') {
      takeProfitHit = currPrice.isLessThanOrEqualTo(takeProfit)
    }
    if (stopLoss !== null && stopLoss != '0.0') {
      stopLossHit = currPrice.isGreaterThanOrEqualTo(stopLoss)
    }
    liquidationPrice = BigNumber(tradeEntryPrice).times(
      BigNumber(1).plus(BigNumber(1).dividedBy(leverage))
    )
    liquidationHit = currPrice.isGreaterThanOrEqualTo(liquidationPrice)
  }
  const shouldCloseTrade =
    (maxProfitHit || takeProfitHit || stopLossHit || liquidationHit) &&
    closeTxnHash === null
  let reason = TradeCloseReason.MANUALLY_CLOSED
  if (shouldCloseTrade) {
    if (maxProfitHit) {
      reason = TradeCloseReason.MAX_PROFIT
    } else if (takeProfitHit) {
      reason = TradeCloseReason.TAKE_PROFIT
    } else if (stopLossHit) {
      reason = TradeCloseReason.STOP_LOSS
    } else if (liquidationHit) {
      reason = TradeCloseReason.LIQUIDATION
    }
    console.log('tradeEntryPrice ', tradeEntryPrice)
    console.log('currPrice', currPrice.toFixed(targetPrecision))
    console.log('maxProfit Threshold ', maxProfit.toFixed(targetPrecision))
    console.log('maxProfitHit ', maxProfitHit)
    console.log(
      'takeProfit Threshold ',
      BigNumber(takeProfit ?? 0).toFixed(targetPrecision)
    )
    console.log('takeProfitHit ', takeProfitHit)
    console.log(
      'stopLoss Threshold ',
      BigNumber(stopLoss ?? 0).toFixed(targetPrecision)
    )
    console.log('stopLossHit ', stopLossHit)
    console.log('liquidationPrice ', liquidationPrice.toFixed(targetPrecision))
    console.log('liquidationHit ', liquidationHit)
    console.log('shouldCloseTrade ', shouldCloseTrade)
  }
  return { shouldClose: shouldCloseTrade, reason: reason }
}

/**
 * Process if stoploss, takeProfit, maxProfit, liquidation, or requestToCloseTime hit
 * @param trade
 */
export const processIfTradeIsReadyToBeClosed = async (
  trade: Trade,
  currentPrice: string,
  walletKeeper: WalletKeeper,
  token: string
): Promise<Array<DeliverTxResponse>> => {
  console.log('processIfTradeIsReadyToBeClosed ')
  const {
    takeProfit,
    stopLoss,
    targetTokenType,
    targetTokenPrice,
    tradeDirection,
    leverageQuantity,
    requestToCloseTime,
    closeTxnHash,
    closeReason,
  } = trade
  const { shouldClose, reason } = shouldCloseTrade(
    targetTokenType,
    targetTokenPrice,
    tradeDirection,
    leverageQuantity,
    takeProfit,
    stopLoss,
    requestToCloseTime,
    closeTxnHash,
    closeReason,
    currentPrice
  )
  if (shouldClose && trade.status === TradeStatusEnum.ACTIVE) {
    return await processCloseTrade(trade, walletKeeper, token, reason)
  }
  return []
}

export const processIfMatchExpiryTimeHit = async (
  walletKeeper: WalletKeeper,
  targetTokenType: string
): Promise<Array<DeliverTxResponse>> => {
  const tokenData = await fetchWithRetries(`/api/app/generate_token`)
  if (tokenData == null) {
    return []
  }
  const { token } = (await tokenData.json()) as { token: string }
  const response = await fetchWithRetries(
    DOMAIN + `/api/data/match/get_match_by_status?status=UNMATCHED`,
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
  const unmatchedMatches = (await response.json()) as Match[]
  const results: Array<DeliverTxResponse> = []

  for (let m of unmatchedMatches) {
    const {
      tokenType,
      tokenAmount,
      matcherAddress,
      expiryDatetime,
      latestTxnHash,
      type,
    } = m
    if (
      expiryDatetime &&
      BigNumber(new Date(expiryDatetime).getTime()).isLessThanOrEqualTo(
        Date.now()
      )
    ) {
      const result = await processWithdrawMatchRequest(
        type === TradeTypeEnum.HEDGED,
        tokenType,
        targetTokenType,
        tokenAmount,
        m,
        walletKeeper,
        latestTxnHash ?? '',
        token
      )
      if (result == null || result.code !== 0) {
        console.log(`ERROR: response ${result?.rawLog}`)
        Sentry.captureException(result?.rawLog)
        continue
      }
      results.push(result)
    }
  }
  return results
}
