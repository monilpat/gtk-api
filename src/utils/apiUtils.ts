import BigNumber from 'bignumber.js'
import {
  DYDX_RETRIES,
  DYDX_RETRY_DELAY,
  DydxAsset,
  DydxMarket,
  GOOD_TIL_BLOCK_BUFFER,
  HOURS_IN_YEAR,
  MAINNET_SIF_ENV,
  PROCESS,
  TESTNET_SIF_ENV,
  TRADER_APY,
  historicalFunding,
  tokenToMarket,
} from './constants/constants'
import { Trade } from '~/serverUtils/dbTypes'
import Long from 'long'
import {
  BECH32_PREFIX,
  CompositeClient,
  IndexerClient,
  LocalWallet,
  OrderStatus,
  SubaccountInfo,
  ValidatorClient,
  OrderSide,
  SubaccountClient,
  Order_TimeInForce,
} from '@dydxprotocol/v4-client-js'
import {
  BroadcastTxAsyncResponse,
  BroadcastTxSyncResponse,
} from '@cosmjs/tendermint-rpc/build/tendermint37'
import { IndexedTx } from '@cosmjs/stargate'
import { WalletKeeper } from '~/serverUtils/WalletKeeper'
import { toHexString } from '~/serverUtils/hedgeUtils'
import { sleep } from './sleep'
import {
  createClients,
  initialized,
  validatorClient,
} from '~/apiUtils/dydxClients'

// TODO: reconcile different liquidation price calcs, update expiration time
export const createHedgeTrade = async (
  compositeClient: CompositeClient,
  indexerClient: IndexerClient,
  type: 'OPEN' | 'CLOSE',
  trade: Trade,
  direction: OrderSide,
  collateralAmount: string | null,
  leverage: string | null
): Promise<any> => {
  let remainingTrade = trade
  const orders: any[] = []
  for (let i = 0; i < DYDX_RETRIES; i++) {
    const {
      id,
      targetTokenType,
      targetTokenAmount,
      leverageQuantity,
      collateralTokenPrice,
    } = remainingTrade
    const marketToTradeIn = tokenToMarket[targetTokenType]
    // console.log('marketToTradeIn', marketToTradeIn)
    const markets: any = (
      await indexerClient.markets.getPerpetualMarkets(marketToTradeIn)
    ).markets
    // console.log('markets[marketToTradeIn] ', markets[marketToTradeIn])
    let stepSize = Math.log10(Number(markets[marketToTradeIn].stepSize))
    stepSize = stepSize >= 0 ? 0 : Math.abs(stepSize)
    // To get precision since it needs to be divisible by tick size
    console.log('stepSize', stepSize)
    console.log('marketToTradeIn ', marketToTradeIn)
    let tickSize = Math.log10(Number(markets[marketToTradeIn].tickSize))
    tickSize = tickSize >= 0 ? 0 : Math.abs(tickSize)
    console.log('tickSize', tickSize)
    const hedgeTradePrice = BigNumber(
      BigNumber(markets[marketToTradeIn].oraclePrice).toFixed(tickSize)
    ).toNumber()
    console.log('hedgeTradePrice', hedgeTradePrice)
    const targetAmount =
      collateralAmount != null
        ? BigNumber(collateralAmount)
            .times(leverage != null ? leverage : leverageQuantity)
            .times(BigNumber(collateralTokenPrice).dividedBy(hedgeTradePrice))
        : BigNumber(targetTokenAmount)
    const hedgeTradeSize = BigNumber(targetAmount.toFixed(stepSize)).toNumber()
    console.log('hedgeTradeSize', hedgeTradeSize)
    const subaccount = await getSubaccountInfo(indexerClient)
    // If direction is BUY then SL SELL and TP SELL
    // If direction is SELL then SL BUY and TP BUY
    const startingTradeClientId = (id - 1) * 4 + 1
    // const takeProfitClientId = startingTradeClientId + 1
    // const stopLossClientId = startingTradeClientId + 2
    const closeTradeClientId = startingTradeClientId + 1
    let currentBlock = await validatorClient.get.latestBlockHeight()
    let nextValidBlockHeight = currentBlock + 1
    let goodTilBlock = nextValidBlockHeight + GOOD_TIL_BLOCK_BUFFER
    if (type === 'OPEN') {
      // If we close the position we should cancel the stop loss and take profit orders
      // Therefore we will need to keep track of stoploss and takeprofit order numbers
      // Create Take Profit or Max Profit Trade
      // ST of trade should be TP of hedge trade and TP of trade should be SL of hedge trade
      // Create hedge trade
      console.log('open')
      let baseTrade = await getDYDXTradeByClientId(
        indexerClient,
        PROCESS.HEDGE_DYDX_ADDRESS,
        String(startingTradeClientId)
      )
      let baseTradeTxn = null
      if (baseTrade != null) {
        console.log('baseTrade exists')
      } else {
        currentBlock = await validatorClient.get.latestBlockHeight()
        nextValidBlockHeight = currentBlock + 1
        goodTilBlock = nextValidBlockHeight + GOOD_TIL_BLOCK_BUFFER
        const baseOrderDetails: any = {
          subaccount: subaccount,
          marketId: marketToTradeIn,
          side: direction,
          price: hedgeTradePrice,
          size: hedgeTradeSize,
          clientId: startingTradeClientId,
          timeInForce: Order_TimeInForce.TIME_IN_FORCE_UNSPECIFIED,
          goodTilBlock: goodTilBlock,
          reduceOnly: false,
        }
        console.log('base trade details ', baseOrderDetails)
        baseTradeTxn = await compositeClient.placeShortTermOrder(
          baseOrderDetails.subaccount,
          baseOrderDetails.marketId,
          baseOrderDetails.side,
          baseOrderDetails.price,
          baseOrderDetails.size,
          baseOrderDetails.clientId,
          baseOrderDetails.goodTilBlock,
          baseOrderDetails.timeInForce,
          baseOrderDetails.reduceOnly
        )
        await sleep(5000)
        if (baseTradeTxn === null) {
          console.log('base trade creation failed')
          return null
        }
        console.log('baseTradeTxn ', toHexString(baseTradeTxn.hash))
      }
      baseTrade =
        baseTrade == null
          ? await getDYDXTradeByClientId(
              indexerClient,
              PROCESS.HEDGE_DYDX_ADDRESS,
              String(startingTradeClientId)
            )
          : baseTrade
      console.log('base trade response ', baseTrade)
      if (baseTrade == null) {
        console.log('baseTrade fetch failed')
        return null
      }
      const { status, totalFilled } = baseTrade
      if (
        status === OrderStatus.BEST_EFFORT_OPENED &&
        BigNumber(totalFilled).gt(0)
      ) {
        console.log(`partially filled`)
        baseTrade = { ...baseTrade, txn: baseTradeTxn }
        orders.push(baseTrade)
        console.log('total orders', orders)
        remainingTrade = {
          ...remainingTrade,
          targetTokenAmount: BigNumber(remainingTrade.targetTokenAmount)
            .minus(totalFilled)
            .toFixed(10),
        }
        console.log('remainingTrade ', remainingTrade)
        await sleep(DYDX_RETRY_DELAY)
        continue
      } else if (status === OrderStatus.FILLED) {
        console.log('trade fully filled')
        baseTrade = { ...baseTrade, txn: baseTradeTxn }
        orders.push(baseTrade)
        console.log('total orders', orders)
        break
      } else {
        console.log(
          `trade not filled with status ${status} ${JSON.stringify(baseTrade)}`
        )
        continue
      }
    } else if (type === 'CLOSE') {
      console.log('close ')
      let closeHedgeTradeOrderTxn = null
      let closeTrade = await getDYDXTradeByClientId(
        indexerClient,
        PROCESS.HEDGE_DYDX_ADDRESS,
        String(closeTradeClientId)
      )
      if (closeTrade != null) {
        console.log('closeTrade exists')
        return [closeTrade]
      }
      if (closeTrade == null) {
        console.log('need to create close hedge trade')
        currentBlock = await validatorClient.get.latestBlockHeight()
        nextValidBlockHeight = currentBlock + 1
        goodTilBlock = nextValidBlockHeight + GOOD_TIL_BLOCK_BUFFER
        const orderDetails = {
          subaccount: subaccount,
          marketId: marketToTradeIn,
          side: direction,
          price: hedgeTradePrice,
          size: hedgeTradeSize,
          clientId: closeTradeClientId,
          timeInForce: Order_TimeInForce.TIME_IN_FORCE_UNSPECIFIED,
          goodTilBlock: goodTilBlock,
          reduceOnly: false,
        }
        console.log('close hedge trade ', orderDetails)
        closeHedgeTradeOrderTxn = await compositeClient.placeShortTermOrder(
          orderDetails.subaccount,
          orderDetails.marketId,
          orderDetails.side,
          orderDetails.price,
          orderDetails.size,
          orderDetails.clientId,
          orderDetails.goodTilBlock,
          orderDetails.timeInForce,
          orderDetails.reduceOnly
        )
        await sleep(5000)
        if (closeHedgeTradeOrderTxn === null) {
          console.log('close trade creation failed')
          return null
        }
        console.log(
          'close hedge trade resp ',
          toHexString(closeHedgeTradeOrderTxn.hash)
        )
        // error checking of txn
        closeTrade =
          closeTrade == null
            ? await getDYDXTradeByClientId(
                indexerClient,
                PROCESS.HEDGE_DYDX_ADDRESS,
                String(closeTradeClientId)
              )
            : closeTrade
        console.log('closeHedgeTradeOrder ', closeTrade)
        if (closeTrade == null) {
          console.log('closeHedgeTradeOrder failed')
          return null
        }
        const { status, totalFilled } = closeTrade
        if (
          status === OrderStatus.BEST_EFFORT_OPENED &&
          BigNumber(totalFilled).gt(0)
        ) {
          console.log(`partially filled`)
          closeTrade = { ...closeTrade, txn: closeHedgeTradeOrderTxn }
          orders.push(closeTrade)
          console.log('total orders', orders)
          remainingTrade = {
            ...remainingTrade,
            targetTokenAmount: BigNumber(remainingTrade.targetTokenAmount)
              .minus(totalFilled)
              .toFixed(10),
          }
          console.log('remainingTrade ', remainingTrade)
          await sleep(DYDX_RETRY_DELAY)
          continue
        } else if (status === OrderStatus.FILLED) {
          console.log('trade fully filled')
          closeTrade = { ...closeTrade, txn: closeHedgeTradeOrderTxn }
          orders.push(closeTrade)
          console.log('total orders', orders)
          break
        } else {
          console.log(
            `trade not filled with status ${status} ${JSON.stringify(
              closeTrade
            )}`
          )
          continue
        }
      } else {
        console.log(
          'no need to create close hedge trade as stop loss or take profit took care of it'
        )
      }
    }
  }
  // Now need to reduce multiple market orders into one
  let aggregatedOrder = orders[0]
  if (orders.length > 1) {
    orders.forEach(order => {
      aggregatedOrder = {
        ...aggregatedOrder,
        size: BigNumber(aggregatedOrder.size).plus(order.size).toFixed(10),
        price: BigNumber(aggregatedOrder.price).plus(order.price).toFixed(10),
      }
    })
    aggregatedOrder = {
      ...aggregatedOrder,
      status: OrderStatus.FILLED,
      price: BigNumber(aggregatedOrder.price)
        .dividedBy(orders.length)
        .toFixed(10),
    }
  }
  console.log('aggregatedOrder ', aggregatedOrder)
  return aggregatedOrder
}

export const getDYDXTrade = async (
  client: IndexerClient,
  orderId: string
): Promise<any> => {
  const response = await client.account.getOrder(orderId)
  // console.log(response)
  return response
}

export const getDYDXTrades = async (
  client: IndexerClient,
  address: string
): Promise<any[]> => {
  const response = await client.account.getSubaccountOrders(address, 0)
  // console.log(response)
  return response
}

export const getDYDXTradeByClientId = async (
  client: IndexerClient,
  address: string,
  clientId: string
): Promise<any> => {
  // const height = await client.utility.getHeight()
  const orders = await client.account.getSubaccountOrders(address, 0)
  await sleep(2000)
  return (
    orders.find((order: { clientId: string }) => order.clientId === clientId) ??
    null
  )
}

export const getActiveDYDXTrades = async (
  client: IndexerClient,
  address: string
): Promise<any[]> => {
  const response = await client.account.getSubaccountPerpetualPositions(
    address,
    0
  )
  // console.log(response)
  return response.positions
}

export const getActiveDYDXAssetPositions = async (
  client: IndexerClient,
  address: string
): Promise<any[]> => {
  const response = await client.account.getSubaccountAssetPositions(address, 0)
  // console.log(response)
  return response.positions
}

export const getExecutedDYDXTrades = async (
  client: IndexerClient,
  address: string
): Promise<any[]> => {
  const response = await client.account.getSubaccountFills(address, 0)
  // console.log(response)
  return response.fills
}

export const getExecutedDYDXTrade = async (
  client: IndexerClient,
  address: string,
  orderId: string
): Promise<any> => {
  const response = await client.account.getSubaccountFills(address, 0)
  //  console.log(response)
  return (
    (response.fills as any[]).find(fill => fill.orderId === orderId) ?? null
  )
}

export const getDYDXTransfers = async (
  client: IndexerClient,
  address: string
): Promise<any[]> => {
  const response = await client.account.getSubaccountTransfers(address, 0)
  // console.log(response)
  return response.transfers
}

export const getAccount = async (client: IndexerClient): Promise<any> => {
  const response = await client.account.getSubaccounts(
    PROCESS.HEDGE_DYDX_ADDRESS
  )
  const subaccounts = response.subaccounts
  const subaccount = subaccounts[0]
  return subaccount
}

export const getSubaccountInfo = async (
  client: IndexerClient
): Promise<SubaccountInfo> => {
  const walletKeeper = await WalletKeeper.build()
  const wallet = await LocalWallet.fromMnemonic(
    (
      await walletKeeper.getWallet('ha')
    ).mnemonic,
    BECH32_PREFIX
  )
  const subaccount = new SubaccountClient(wallet, 0)
  return subaccount
}

// TODO: Switched to fast withdrawal since need to interface with L1 smart contract which isn't worth complexity now
// Currently only supports USDC for now
// Will need to periodically withdraw as the lowest amount is 100 USD
export const withdrawSubaccountToDYDX = async (
  indexerClient: IndexerClient,
  validatorClient: ValidatorClient,
  amount: string,
  assetId: number = 0 // USDC,
): Promise<BroadcastTxAsyncResponse | BroadcastTxSyncResponse | IndexedTx> => {
  const subaccount = await getSubaccountInfo(indexerClient)
  const tx = await validatorClient.post.withdraw(
    subaccount,
    assetId,
    new Long(Number(amount))
  )
  console.log('**Withdraw Tx**')
  console.log(tx)
  return tx as any
}

export const depositDYDXToSubaccount = async (
  indexerClient: IndexerClient,
  validatorClient: ValidatorClient,
  amount: string, // in USDC
  assetId: number = 0 // USDC
): Promise<BroadcastTxAsyncResponse | BroadcastTxSyncResponse | IndexedTx> => {
  const subaccount = await getSubaccountInfo(indexerClient)
  const tx = await validatorClient.post.deposit(
    subaccount,
    assetId,
    new Long(Number(amount))
  )
  console.log('**Deposit Tx**')
  console.log(tx)
  return tx as any
}

export const transferDYDXSubaccountToAnotherDYDXAddress = async (
  indexerClient: IndexerClient,
  validatorClient: ValidatorClient,
  amount: string, // in USDC
  assetId: number = 0, // USDC
  recipientAddress: string
): Promise<BroadcastTxAsyncResponse | BroadcastTxSyncResponse | IndexedTx> => {
  const subaccount = await getSubaccountInfo(indexerClient)
  const recipientSubaccountNumber = 0
  const tx = await validatorClient.post.transfer(
    subaccount,
    recipientAddress,
    recipientSubaccountNumber,
    assetId,
    Long.fromString(amount)
  )
  console.log('**Transfer Tx**')
  console.log(tx)
  return tx as any
}

export const cancelHedgeTradeOrder = async (
  client: CompositeClient,
  indexerClient: IndexerClient,
  clientId: string
): Promise<
  BroadcastTxAsyncResponse | BroadcastTxSyncResponse | IndexedTx | null
> => {
  const subaccount = await getSubaccountInfo(indexerClient)
  const order = await getDYDXTradeByClientId(
    indexerClient,
    PROCESS.HEDGE_DYDX_ADDRESS,
    clientId
  )
  if (order == null) {
    console.log('order not found')
    return null
  }
  const goodTilBlock = order.goodTilBlock
  let goodTilBlockTime: number | undefined
  if (order.goodTilBlockTime) {
    const datetime = new Date(order.goodTilBlockTime)
    const utcMilllisecondsSinceEpoch = datetime.getTime()
    goodTilBlockTime = Math.round(utcMilllisecondsSinceEpoch / 1000)
  }
  // const marketToTradeIn = tokenToMarket[targetTokenType]
  const tx = await client.validatorClient.post.cancelOrder(
    subaccount,
    order.clientId,
    order.orderFlags,
    order.clobPairId,
    goodTilBlock,
    goodTilBlockTime
  )
  console.log('**Cancel Order Tx**')
  console.log(tx)
  return tx as any
}

export const hedgeOrderStillActiveButUnfilled = async (
  client: IndexerClient,
  clientId: string
): Promise<boolean> => {
  const order = await getDYDXTradeByClientId(
    client,
    PROCESS.HEDGE_DYDX_ADDRESS,
    clientId
  )
  await sleep(2000)
  // It is either OPEN or UNTRIGGERED meaning it is active but hasn't been filled
  return [OrderStatus.OPEN, 'UNTRIGGERED'].includes(order.status)
}

export const getAccountBalances = async (
  validatorClient: ValidatorClient,
  address: string
): Promise<any[]> => {
  const balances = await validatorClient.get.getAccountBalances(address)
  console.log('balances ', balances)
  return balances
}

export const getHistoricalFundingRateForMarket = async (
  client: IndexerClient,
  market: DydxMarket,
  effectiveAt: string | undefined
): Promise<historicalFunding[]> => {
  try {
    const response = await client.markets.getPerpetualMarketHistoricalFunding(
      market,
      effectiveAt
    )
    console.log('historical funding')
    const funding = response.historicalFunding
    return funding
  } catch (error: any) {
    console.log(error.message)
  }
  return []
}

export const getLatestFundingRateForMarket = async (
  client: IndexerClient,
  market: DydxMarket
): Promise<string | null> => {
  try {
    const markets = await client.markets.getPerpetualMarkets(market)
    const nextFundingRate = markets.markets[market]['nextFundingRate']
    return nextFundingRate
  } catch (error: any) {
    console.log(error.message)
  }
  return null
}

export const getEffectiveAnnualizedFundingRate = async (
  client: IndexerClient,
  market: DydxMarket
) => {
  if (!initialized) {
    await createClients(
      PROCESS.USE_TESTNET === 'true' ? TESTNET_SIF_ENV : MAINNET_SIF_ENV
    )
  }
  const fundingRate = await getLatestFundingRateForMarket(client, market)
  return fundingRate == null ? TRADER_APY : Number(fundingRate) * HOURS_IN_YEAR
}
