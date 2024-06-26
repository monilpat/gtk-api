import {
  HedgeTrade,
  HedgeTradeStatus,
  Trade,
  TradeDirection,
  TradeDirectionEnum,
} from './dbTypes'
import getTokenPrecision from './getTokenPrecision'
import { OrderSide } from '@dydxprotocol/v4-client-js'
import {
  MATCHER_PERCENTAGE,
  TOTAL_SECONDS_IN_YEAR,
  tokenToMarket,
} from '@/utils/constants/constants'
import {
  calculateCurrentTraderPandL,
  formatTokenForPriceList,
  getCoinGeckoCoinPairDetailAPI,
  getHedgeTradeTokenAmountInCollateralExcludingLeverage,
  getTokenDataFromUiRegistry,
} from './marginUtils'
import { getEffectiveAnnualizedFundingRate } from '../utils/apiUtils'
import { indexerClient } from '~/apiUtils/dydxClients'
import BigNumber from 'bignumber.js'
import nullthrows from 'nullthrows'

export const getHedgeTradePandL = async (
  targetPrice: BigNumber,
  hedgeTrade: HedgeTrade,
  trade: Trade,
  collateralTokenType: string = 'uusdc',
  collateralTokenPrice: string = '1.00'
): Promise<string | null> => {
  const {
    size: targetTokenAmount,
    side: tradeDirection,
    price: targetTokenPrice,
    closeTime,
    createdAt,
    status,
    targetClosePrice,
    collateralClosePrice,
    leverage,
    collateralSize,
  } = hedgeTrade
  const market = tokenToMarket[trade.targetTokenType]
  const hedgeInterestRate =
    hedgeTrade?.interestRate != null
      ? hedgeTrade.interestRate
      : (await getEffectiveAnnualizedFundingRate(indexerClient, market)) ?? 0.1
  const tradeDurationInSeconds = BigNumber(
    (closeTime != null ? new Date(closeTime) : new Date()).getTime()
  )
    .minus(new Date(createdAt).getTime())
    .dividedBy(1000)
  const matcherHedgeCollateralPositionSize = BigNumber(
    collateralSize ?? 0
  ).times(leverage ?? 0)
  if (matcherHedgeCollateralPositionSize.eq(0)) {
    return null
  }
  const interestPaidByMatcherForHedge = BigNumber(hedgeInterestRate)
    .times(matcherHedgeCollateralPositionSize)
    .times(tradeDurationInSeconds.dividedBy(TOTAL_SECONDS_IN_YEAR))
  const { precision: collateralPrecision } = await getTokenPrecision(
    collateralTokenType
  )
  if (targetTokenAmount == null) {
    return null
  }
  const currentCollateralPrice =
    status === HedgeTradeStatus.CLOSED ? collateralClosePrice ?? 1 : '1.00'
  const currentTargetPrice =
    status === HedgeTradeStatus.CLOSED ? targetClosePrice ?? 0.0 : targetPrice
  const pAndL =
    tradeDirection === OrderSide.BUY
      ? BigNumber(
          BigNumber(targetTokenAmount)
            .times(currentTargetPrice)
            .dividedBy(currentCollateralPrice)
        ).minus(
          BigNumber(
            BigNumber(targetTokenAmount)
              .times(targetTokenPrice)
              .dividedBy(collateralTokenPrice)
          )
        )
      : BigNumber(
          BigNumber(targetTokenAmount)
            .times(targetTokenPrice)
            .dividedBy(collateralTokenPrice)
        ).minus(
          BigNumber(targetTokenAmount)
            .times(currentTargetPrice)
            .dividedBy(currentCollateralPrice)
        )
  return pAndL.minus(interestPaidByMatcherForHedge).toFixed(collateralPrecision)
}

export const getMatcherAPRonTrade = async (
  trade: Trade,
  hedgeTrade: HedgeTrade | null
): Promise<string | null> => {
  const {
    executedAt,
    closeTime,
    collateralTokenAmount,
    leverageQuantity: leverage,
    maxProfitMultiplier,
    interestSent,
    entranceFee,
    targetTokenPrice,
    tradeDirection,
    targetClosePrice,
  } = trade
  let hedgeCollateralSize = null
  let actualOpenSlippagePercentage = BigNumber(0)
  let actualCloseSlippagePercentage = BigNumber(0)
  if (hedgeTrade != null) {
    const {
      collateralSize: collateral,
      price,
      targetClosePrice: hedgeTargetClosePrice,
    } = hedgeTrade
    hedgeCollateralSize = collateral
    actualOpenSlippagePercentage = calculatePercentageSlippage(
      targetTokenPrice,
      price,
      tradeDirection
    )
    actualCloseSlippagePercentage = calculatePercentageSlippage(
      targetClosePrice,
      hedgeTargetClosePrice,
      tradeDirection === TradeDirectionEnum.LONG
        ? TradeDirectionEnum.SHORT
        : TradeDirectionEnum.LONG
    )
  }
  if (
    executedAt == null ||
    closeTime == null ||
    ((hedgeCollateralSize == null || hedgeCollateralSize == 'NaN') &&
      hedgeTrade != null)
  ) {
    return null
  }
  const counterTradeCollateralMultiplier = Math.min(
    BigNumber(leverage ?? 1).toNumber(),
    Number(maxProfitMultiplier)
  )
  const matcherCounterTradeCollateral = BigNumber(collateralTokenAmount).times(
    counterTradeCollateralMultiplier
  )
  const matcherHedgeCollateral =
    hedgeTrade?.collateralSize != null
      ? BigNumber(hedgeTrade.collateralSize)
      : getHedgeTradeTokenAmountInCollateralExcludingLeverage(trade, 2)
  const matcherHedgeCollateralPositionSize = BigNumber(
    matcherHedgeCollateral ?? 0
  ).times(hedgeTrade?.leverage != null ? hedgeTrade.leverage : leverage)
  if (matcherHedgeCollateralPositionSize.eq(0)) {
    return null
  }
  const interestCollectedByMatcherForCountertrade = interestSent ?? 0
  const entranceFeeCollectedByMatcherForCountertrade = BigNumber(
    entranceFee ?? 0
  ).times(BigNumber(MATCHER_PERCENTAGE).dividedBy(100))
  const market = tokenToMarket[trade.targetTokenType]
  const hedgeInterestRate =
    hedgeTrade?.interestRate != null
      ? hedgeTrade.interestRate
      : (await getEffectiveAnnualizedFundingRate(indexerClient, market)) ?? 0.1
  const tradeDurationInSeconds = BigNumber(new Date(closeTime).getTime())
    .minus(new Date(executedAt).getTime())
    .dividedBy(1000)
  const interestPaidByMatcherForHedge = BigNumber(hedgeInterestRate)
    .times(matcherHedgeCollateralPositionSize)
    .times(tradeDurationInSeconds.dividedBy(TOTAL_SECONDS_IN_YEAR))
  const netProfit = BigNumber(interestCollectedByMatcherForCountertrade)
    .plus(entranceFeeCollectedByMatcherForCountertrade)
    .minus(interestPaidByMatcherForHedge)
  const totalCapitalAtRisk = matcherCounterTradeCollateral.plus(
    matcherHedgeCollateral
  )
  const matcherAPR = netProfit
    .dividedBy(totalCapitalAtRisk)
    .times(TOTAL_SECONDS_IN_YEAR)
    .dividedBy(tradeDurationInSeconds)
  return matcherAPR.dividedBy(100).toFixed(4)
}

const calculatePercentageSlippage = (
  expectedPrice: string | null,
  actualPrice: string | null,
  tradeDirection: TradeDirection
): BigNumber => {
  if (expectedPrice == null || actualPrice == null) {
    return BigNumber(0)
  }
  if (tradeDirection === 'LONG') {
    return BigNumber(actualPrice).minus(expectedPrice).dividedBy(expectedPrice)
  } else if (tradeDirection === 'SHORT') {
    return BigNumber(expectedPrice).minus(actualPrice).dividedBy(expectedPrice)
  }
  return BigNumber(0)
}

export const getMatcherAPROnTradeUsingPandL = async (
  trade: Trade,
  hedgeTrade: HedgeTrade | null
): Promise<string | null> => {
  const {
    closeTime,
    executedAt,
    matcherPandL,
    hedgeTradePandL,
    collateralTokenAmount,
    collateralTokenType,
    status,
    targetTokenType,
  } = trade
  if (executedAt == null) {
    return null
  }
  let closedOrCurrentTime = closeTime != null ? new Date(closeTime) : new Date()
  const tradeDurationInSeconds = BigNumber(
    new Date(closedOrCurrentTime).getTime()
  )
    .minus(new Date(executedAt).getTime())
    .dividedBy(1000)
  const collateralTokenDisplaySymbol = (
    await getTokenDataFromUiRegistry(collateralTokenType)
  ).displaySymbol
  let collateralPrice: number | undefined
  let targetPrice: number | undefined
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
  let matcherpnl = await calculateMatcherPnlOnTrade(trade)
  let hedgepnl = hedgeTradePandL
  let matcherHedgeCollateral = BigNumber(0)
  if (hedgeTrade != null) {
    hedgepnl = await getHedgeTradePandL(
      BigNumber(nullthrows(targetPrice)),
      hedgeTrade,
      trade,
      collateralTokenType,
      String(collateralPrice ?? 1)
    )
    matcherHedgeCollateral = BigNumber(
      hedgeTrade.collateralSize != null && hedgeTrade.collateralSize != 'NaN'
        ? hedgeTrade.collateralSize
        : getHedgeTradeTokenAmountInCollateralExcludingLeverage(trade, 2)
    )
  }
  const totalPandL = BigNumber(matcherpnl ?? 0).plus(hedgepnl ?? 0)
  const totalCapitalAtRisk = BigNumber(collateralTokenAmount).plus(
    matcherHedgeCollateral
  )
  const annualizedProfit = totalPandL
    .dividedBy(totalCapitalAtRisk)
    .times(TOTAL_SECONDS_IN_YEAR)
    .dividedBy(tradeDurationInSeconds)
  const apr = annualizedProfit.dividedBy(100)
  return apr.toString()
}

export const calculateMatcherPnlOnTrade = async (
  trade: Trade
): Promise<string | null> => {
  const tradepandl = await calculateCurrentTraderPandL(trade)
  const entranceFeeCollectedByMatcher = BigNumber(
    trade.entranceFee ?? 0.0
  ).times(BigNumber(MATCHER_PERCENTAGE).dividedBy(100))
  const interestCollectedByMatcherForCountertrade = BigNumber(
    trade.interestSent ?? 0.0
  ).times(BigNumber(MATCHER_PERCENTAGE).dividedBy(100))
  const matcherPandL = interestCollectedByMatcherForCountertrade
    .plus(entranceFeeCollectedByMatcher)
    .minus(tradepandl)
    .toFixed(10)
  return matcherPandL
}
