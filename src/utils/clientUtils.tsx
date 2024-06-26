import { CoinMarket } from 'coingecko-api-v3'
import { CreateToastFnReturn } from '@chakra-ui/react'
import {
  MatchVault,
  NotificationStatusEnum,
  NotifType,
  NotifTypeEnum,
  PersonaEnum,
  PersonaType,
  Trade,
  TradeDirectionEnum,
  TradeType,
} from '~/serverUtils/dbTypes'
import BigNumber from 'bignumber.js'
import { DeliverTxResponse } from '@sifchain/sdk'
import {
  DirectSecp256k1HdWallet,
  OfflineDirectSigner,
  OfflineSigner,
} from '@cosmjs/proto-signing'
import { SigningStargateClient } from '@cosmjs/stargate'
import { TxRaw } from 'cosmjs-types/cosmos/tx/v1beta1/tx'
import nullthrows from 'nullthrows'
import { Coin } from '@keplr-wallet/types/build/cosmjs'
import dayjs from 'dayjs'
import { getConfig, IAsset, NetworkEnv, PROFILE_LOOKUP } from '~/common'
import { SdkConfig } from '~/domains/core/envs'
import {
  DEFAULT_TOKEN_PRECISION,
  DEFAULT_TRANSACTION_TOKEN_DENOM,
  DOMAIN,
  FIAT_INPUT_PRECISION,
  FIAT_PRECISION,
  fiatFormatType,
  MAX_TOKEN_PRECISION,
  Memo,
  NOTIF_RELOAD_INTERVAL,
  ReportingByTokenResults,
  ReportingResultsByDirection,
  TRADER_APY,
} from '@/utils/constants/constants'
import { RegistryEntry } from '@sifchain/sdk/build/typescript/generated/proto/sifnode/tokenregistry/v1/types'
import calculateExpirationDate from '@/utils/calculateExpirationDate'
import { fetchWithRetries } from '~/serverUtils/serverUtils'
import getTokenPrecision from '~/serverUtils/getTokenPrecision'
import { sleep } from './sleep'

export const onProcessTransaction = async (
  txRaw: TxRaw,
  env: SdkConfig
): Promise<DeliverTxResponse | null> => {
  if (!window.keplr) {
    alert('Please install keplr extension')
  } else {
    try {
      const offlineSigner = window.keplr.getOfflineSigner(env?.sifChainId!)
      const broadcastResult = await broadcastTransaction(
        offlineSigner,
        txRaw,
        env?.sifRpcUrl!
      )

      return broadcastResult
    } catch (ex) {
      console.error(ex)
    }
  }
  return null
}

export const onRequestToCloseTrade = async (
  trade: Trade,
  collateralType: RegistryEntry[],
  matcherAddress: string,
  env: SdkConfig
): Promise<TxRaw | null> => {
  const { id } = trade
  const rowanPrecision = getPrecisionFromTokenRegistryEntry(
    collateralType,
    DEFAULT_TRANSACTION_TOKEN_DENOM
  )
  const minAmount = BigNumber(10)
    .exponentiatedBy(-rowanPrecision)
    .toFixed(rowanPrecision)
  if (!window.keplr) {
    alert('Please install keplr extension')
  } else {
    try {
      const offlineSigner = window.keplr.getOfflineSigner(env?.sifChainId!)
      const result = await signTransaction(
        offlineSigner,
        matcherAddress,
        `${process.env.NEXT_PUBLIC_MATCH_VAULT_ADDRESS}`,
        DEFAULT_TRANSACTION_TOKEN_DENOM,
        minAmount,
        {
          transaction_type: 'request_close_trade',
          data: {
            trade_id: String(id),
          },
        },
        rowanPrecision,
        env?.sifRpcUrl!
      )
      return result
    } catch (ex) {
      console.error(ex)
    }
  }
  return null
}

export const onWithdraw = async (
  autoHedged: boolean,
  matcher: MatchVault,
  collateralType: RegistryEntry[],
  env: SdkConfig,
  amount?: string
): Promise<TxRaw | null> => {
  const { tokenType, encumberedTokenAmount, tokenAmount, matcherAddress } =
    matcher
  const collateralPrecision = getPrecisionFromTokenRegistryEntry(
    collateralType,
    tokenType
  )
  const rowanPrecision = getPrecisionFromTokenRegistryEntry(
    collateralType,
    DEFAULT_TRANSACTION_TOKEN_DENOM
  )
  const unencumberedTokenAmount = BigNumber(tokenAmount)
    .minus(encumberedTokenAmount)
    .toFixed(collateralPrecision)
  const minAmount = BigNumber(10)
    .exponentiatedBy(-rowanPrecision)
    .toFixed(rowanPrecision)
  if (!window.keplr) {
    alert('Please install keplr extension')
  } else {
    try {
      const offlineSigner = window.keplr.getOfflineSigner(env?.sifChainId!)
      const txRawResult = await signTransaction(
        offlineSigner,
        matcherAddress,
        `${process.env.NEXT_PUBLIC_MATCH_VAULT_ADDRESS}`,
        DEFAULT_TRANSACTION_TOKEN_DENOM,
        minAmount,
        {
          transaction_type: 'withdraw_match',
          data: {
            collateral_token_type: tokenType,
            collateral_token_amount: amount ? amount : unencumberedTokenAmount,
            auto_hedged: String(autoHedged),
          },
        },
        rowanPrecision,
        env?.sifRpcUrl!
      )
      return txRawResult
    } catch (ex) {
      console.error(ex)
    }
  }
  return null
}

export const onCloseTrade = async (
  trade: Trade,
  collateralType: RegistryEntry[],
  env: SdkConfig
): Promise<TxRaw | null> => {
  const { id, traderAddress } = trade
  const rowanPrecision = getPrecisionFromTokenRegistryEntry(
    collateralType,
    DEFAULT_TRANSACTION_TOKEN_DENOM
  )
  const minAmount = BigNumber(10)
    .exponentiatedBy(-rowanPrecision)
    .toFixed(rowanPrecision)
  if (!window.keplr) {
    alert('Please install keplr extension')
  } else {
    try {
      const offlineSigner = window.keplr.getOfflineSigner(env?.sifChainId!)
      const txRawResult = await signTransaction(
        offlineSigner,
        traderAddress,
        `${process.env.NEXT_PUBLIC_PENDING_TRADE_ADDRESS}`,
        DEFAULT_TRANSACTION_TOKEN_DENOM,
        minAmount,
        {
          transaction_type: 'close_trade',
          data: {
            trade_id: String(id),
          },
        },
        rowanPrecision,
        env?.sifRpcUrl!
      )
      return txRawResult
      // const success = transactions.length >= 2 && transactions.findIndex(txn => txn.code !== 0) === -1
    } catch (ex) {
      console.error(ex)
    }
  }
  return null
}

export const onCloseTradeAPI = async (
  trade: Trade,
  offlineSigner: DirectSecp256k1HdWallet,
  rpcUrl: string
): Promise<DeliverTxResponse | null> => {
  const { id, traderAddress } = trade
  const rowanPrecision = 18
  const minAmount = BigNumber(10)
    .exponentiatedBy(-rowanPrecision)
    .toFixed(rowanPrecision)
  try {
    const txn = await signAndBroadcastTransaction(
      offlineSigner,
      traderAddress,
      `${process.env.NEXT_PUBLIC_PENDING_TRADE_ADDRESS}`,
      DEFAULT_TRANSACTION_TOKEN_DENOM,
      minAmount,
      {
        transaction_type: 'close_trade',
        data: {
          trade_id: String(id),
        },
      },
      rowanPrecision,
      rpcUrl
    )
    return txn
  } catch (ex) {
    console.error(ex)
  }
  return null
}

export const onCancelTradeRequest = async (
  trade: Trade,
  collateralType: RegistryEntry[],
  env: SdkConfig
): Promise<TxRaw | null> => {
  const { id, traderAddress } = trade
  const rowanPrecision = getPrecisionFromTokenRegistryEntry(
    collateralType,
    DEFAULT_TRANSACTION_TOKEN_DENOM
  )
  const minAmount = BigNumber(10)
    .exponentiatedBy(-rowanPrecision)
    .toFixed(rowanPrecision)
  if (!window.keplr) {
    alert('Please install keplr extension')
  } else {
    try {
      const offlineSigner = window.keplr.getOfflineSigner(env?.sifChainId!)
      const txRawResult = await signTransaction(
        offlineSigner,
        traderAddress,
        `${process.env.NEXT_PUBLIC_PENDING_TRADE_ADDRESS}`,
        DEFAULT_TRANSACTION_TOKEN_DENOM,
        minAmount,
        {
          transaction_type: 'cancel_trade_request',
          data: {
            trade_id: String(id),
          },
        },
        rowanPrecision,
        env?.sifRpcUrl!
      )

      return txRawResult
    } catch (ex) {
      console.error(ex)
    }
  }
  return null
}

export const onCancelTradeRequestAPI = async (
  trade: Trade,
  offlineSigner: DirectSecp256k1HdWallet,
  rpcUrl: string
): Promise<DeliverTxResponse | null> => {
  const { id, traderAddress } = trade
  const rowanPrecision = 18
  const minAmount = BigNumber(10)
    .exponentiatedBy(-rowanPrecision)
    .toFixed(rowanPrecision)
  try {
    const txn = await signAndBroadcastTransaction(
      offlineSigner,
      traderAddress,
      `${process.env.NEXT_PUBLIC_PENDING_TRADE_ADDRESS}`,
      DEFAULT_TRANSACTION_TOKEN_DENOM,
      minAmount,
      {
        transaction_type: 'cancel_trade_request',
        data: {
          trade_id: String(id),
        },
      },
      rowanPrecision,
      rpcUrl
    )

    return txn
  } catch (ex) {
    console.error(ex)
  }
  return null
}

export const onUpdateTrade = async (
  toast: CreateToastFnReturn,
  trade: Trade
) => {
  // try {
  //   console.log('trade to update id', trade.id)
  //   // const result = await processUpdateTradeRequest('1.0', trade)
  //   const successfulIncrease = result !== null && result.code === 0
  //   const successfulDecrease = result === null
  //   if (successfulIncrease) {
  //     toast({
  //       title: 'Trade Request has been successfully updated!',
  //       description: (
  //         <>
  //           See{' '}
  //           <a
  //             href={`https://www.mintscan.io/sifchain/txs/${result.transactionHash}`}
  //             target="_blank"
  //           >
  //             Transaction. Trader has been notified and trade will close within
  //             7 days.
  //           </a>
  //         </>
  //       ),
  //       status: 'success',
  //       duration: 9000,
  //       isClosable: true,
  //     })
  //   } else if (successfulDecrease) {
  //     toast({
  //       title: 'Trade Request has been successfully updated!',
  //       status: 'success',
  //       duration: 9000,
  //       isClosable: true,
  //     })
  //   } else {
  //     toast({
  //       title: 'Trade Request update has failed!',
  //       status: 'error',
  //       duration: 9000,
  //       isClosable: true,
  //     })
  //   }
  //   console.log('finished trade request update')
  // } catch (ex) {
  //   console.error(ex)
  // }
  // return null
}

export const signTransaction = async (
  offlineSigner: OfflineSigner | DirectSecp256k1HdWallet,
  sendingAddress: string,
  receivingAddress: string,
  collateralTokenType: string,
  collateralTokenAmount: string,
  memo: Memo,
  collateralPrecision: number,
  rpcUrl: string
): Promise<TxRaw> => {
  const client = await SigningStargateClient.connectWithSigner(
    rpcUrl,
    offlineSigner
  )
  return await client.sign(
    sendingAddress,
    [
      {
        typeUrl: '/cosmos.bank.v1beta1.MsgSend',
        value: {
          fromAddress: sendingAddress,
          toAddress: receivingAddress,
          amount: [
            {
              denom: collateralTokenType,
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
          denom: collateralTokenType,
          amount: BigNumber(10).exponentiatedBy(collateralPrecision).toFixed(0),
        },
      ],
      gas: '250000',
    },
    JSON.stringify(memo)
  )
}

export const signAndBroadcastTransaction = async (
  offlineSigner: DirectSecp256k1HdWallet,
  sendingAddress: string,
  receivingAddress: string,
  collateralTokenType: string,
  collateralTokenAmount: string,
  memo: Memo,
  collateralPrecision: number,
  rpcUrl: string
): Promise<DeliverTxResponse> => {
  const client = await SigningStargateClient.connectWithSigner(
    rpcUrl,
    offlineSigner
  )
  const txnRaw = await client.sign(
    sendingAddress,
    [
      {
        typeUrl: '/cosmos.bank.v1beta1.MsgSend',
        value: {
          fromAddress: sendingAddress,
          toAddress: receivingAddress,
          amount: [
            {
              denom: collateralTokenType,
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
          amount: BigNumber(10).exponentiatedBy(18).toFixed(0),
        },
      ],
      gas: '250000',
    },
    JSON.stringify(memo)
  )
  const txBytes = TxRaw.encode(txnRaw).finish()
  const txn = await client.broadcastTx(txBytes)
  await client.getTx(txn.transactionHash)
  console.log('txn ', txn)
  return txn
}

export const broadcastTransaction = async (
  offlineSigner: OfflineSigner | DirectSecp256k1HdWallet,
  txRaw: TxRaw,
  rpcUrl: string,
  timeoutMs = 60_000,
  pollIntervalMs = 3_000
): Promise<DeliverTxResponse> => {
  const client = await SigningStargateClient.connectWithSigner(
    rpcUrl,
    offlineSigner
  )
  const txBytes = TxRaw.encode(txRaw).finish()
  return await client.broadcastTx(txBytes)
}

export const getUiAssetData = (
  envConfig: SdkConfig,
  tokenDisplayName: string
): IAsset => {
  const asset = nullthrows(
    envConfig?.assets.find(x => {
      return (
        x.displaySymbol === tokenDisplayName ||
        x.symbol === tokenDisplayName.toUpperCase()
      )
    }),
    `token ${tokenDisplayName} is not found in UI registry`
  )
  return asset
}

export const getTokenRegistryEntry = (
  collateralTokenType: RegistryEntry[],
  tokenType: string
): RegistryEntry => {
  return nullthrows(
    collateralTokenType?.find(x => {
      return x.baseDenom === tokenType || x.denom === tokenType
    }),
    `token ${tokenType} is not found in registry`
  )
}

const tokenPrecisionCache: { [key: string]: number } = {}
export const getPrecisionForToken = (tokenData: RegistryEntry): number => {
  let tokenPrecision: number
  if (tokenPrecisionCache[tokenData.baseDenom]) {
    tokenPrecision = tokenPrecisionCache[tokenData.baseDenom]
  } else {
    tokenPrecision = Number(
      BigInt(tokenData.decimals.high) + BigInt(tokenData.decimals.low)
    )
    tokenPrecisionCache[tokenData.baseDenom] = tokenPrecision
  }
  return tokenPrecision
}

export const getPrecisionFromTokenRegistryEntry = (
  collateralTokenType: RegistryEntry[],
  tokenType: string
): number => {
  const tokenRegistryEntry = nullthrows(
    collateralTokenType?.find(x => {
      return x.baseDenom === tokenType || x.denom === tokenType
    }),
    `token ${tokenType} is not found in registry`
  )

  return getPrecisionForToken(tokenRegistryEntry)
}

export const onDepositAMatch = async (
  autoHedged: boolean,
  accountAddress: string,
  expirationDate: string,
  collateralType: string,
  collateralAmount: string,
  collateralPrecision: number,
  env: SdkConfig
): Promise<TxRaw | null> => {
  if (!window.keplr) {
    alert('Please install keplr extension')
  } else {
    try {
      const offlineSigner = window.keplr.getOfflineSigner(env?.sifChainId!)
      const expiryDate: string =
        expirationDate !== ''
          ? expirationDate
          : calculateExpirationDate(new Date())
      const txRawResult = await signTransaction(
        offlineSigner,
        accountAddress,
        `${process.env.NEXT_PUBLIC_MATCH_VAULT_ADDRESS}`,
        collateralType,
        collateralAmount,
        {
          transaction_type: 'deposit_match',
          data: {
            expiration_date: expiryDate,
            auto_hedged: String(autoHedged),
          },
        },
        collateralPrecision,
        env?.sifRpcUrl!
      )
      return txRawResult
    } catch (ex) {
      console.error(ex)
    }
  }
  return null
}

export const onRequestATrade = async (
  accountAddress: string,
  collateralType: string,
  collateralAmount: string,
  tradeData: Memo['data'],
  collateralPrecision: number,
  env: SdkConfig
): Promise<TxRaw | null> => {
  if (!window.keplr) {
    alert('Please install keplr extension')
  } else {
    try {
      const offlineSigner = window.keplr.getOfflineSigner(env?.sifChainId!)
      const txRawResult = await signTransaction(
        offlineSigner,
        accountAddress,
        `${process.env.NEXT_PUBLIC_PENDING_TRADE_ADDRESS}`,
        collateralType,
        collateralAmount,
        {
          transaction_type: 'open_trade',
          data: tradeData,
        },
        collateralPrecision,
        env?.sifRpcUrl!
      )
      return txRawResult
    } catch (ex) {
      console.error(ex)
    }
  }
  return null
}

export const onRequestATradeAPI = async (
  offlineSigner: DirectSecp256k1HdWallet,
  accountAddress: string,
  collateralType: string,
  collateralAmount: string,
  tradeData: Memo['data'],
  collateralPrecision: number,
  rpcUrl: string
): Promise<DeliverTxResponse | null> => {
  try {
    const txn = await signAndBroadcastTransaction(
      offlineSigner,
      accountAddress,
      `${process.env.NEXT_PUBLIC_PENDING_TRADE_ADDRESS}`,
      collateralType,
      collateralAmount,
      {
        transaction_type: 'open_trade',
        data: tradeData,
      },
      collateralPrecision,
      rpcUrl
    )
    console.log('txn', txn)
    return txn
  } catch (ex) {
    console.error(ex)
  }
  return null
}

export const getImageUrlFromPriceList = (
  pricesList: string,
  tokenName: string
): string => {
  const priceList = JSON.parse(pricesList).data as Array<CoinMarket>
  // Note: Handle rowan token from priceList symbol (erowan)
  if (tokenName === 'rowan') {
    tokenName = 'e' + tokenName
  }
  const imageUrl = priceList?.find(x => x.symbol === tokenName)?.image ?? ''

  return imageUrl
}

export const formatAsToken = (
  value: string | null,
  precision: number,
  formatForInput: Boolean = false
): string => {
  const formattedValue = new Intl.NumberFormat('en-US', {
    maximumFractionDigits:
      precision > MAX_TOKEN_PRECISION ? MAX_TOKEN_PRECISION : precision,
  }).format(Number(value))
  if (BigNumber(formattedValue).isZero() && !formatForInput) {
    return '-'
  }
  return formattedValue
}

export const formatAsFiat = (
  value: string | null,
  formatType: fiatFormatType = fiatFormatType.LONG
): string => {
  if (value == null) {
    return '-'
  }
  if (formatType === fiatFormatType.LONG) {
    let longFormat = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: DEFAULT_TOKEN_PRECISION,
    }).format(Number(value ?? 0.0))
    if (longFormat === '$0.000000') {
      return '$0.00'
    }
    return longFormat
  } else {
    let smallFormat = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: FIAT_PRECISION,
    }).format(Number(value ?? 0.0))

    return smallFormat
  }
}

export const formatAsPercent = (value: string | null): string => {
  if (value == null) {
    return '-'
  }
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    maximumFractionDigits: 2,
  }).format(Number(value))
}

export const getAllBalances = async (
  offlineSigner: OfflineSigner | DirectSecp256k1HdWallet,
  rpcUrl: string,
  walletAddress: string
): Promise<readonly Coin[]> => {
  const client = await SigningStargateClient.connectWithSigner(
    rpcUrl,
    offlineSigner
  )
  return client.getAllBalances(walletAddress)
}

export const getFormattedDecimal = (
  collateralTokenTypes: RegistryEntry[],
  tokenName: string,
  amount: string
): BigNumber => {
  const precision = BigNumber(10).exponentiatedBy(
    BigNumber(
      collateralTokenTypes?.find(x => x.denom === tokenName)?.decimals.low ?? 0
    )
  )
  return BigNumber(amount).dividedBy(precision)
}

const envConfigCache: { [key: string]: SdkConfig } = {}
export async function getEnvConfig(params: {
  environment: NetworkEnv
}): Promise<SdkConfig> {
  let envConfig: SdkConfig
  if (envConfigCache[params.environment]) {
    envConfig = envConfigCache[params.environment]
  } else {
    const {
      kind: tag,
      ethAssetTag,
      sifAssetTag,
    } = PROFILE_LOOKUP[params.environment]

    if (typeof tag === 'undefined') {
      throw new Error(`environment "${params.environment}" not found`)
    }
    // @ts-ignore: TS2322
    envConfig = await getConfig(tag, sifAssetTag, ethAssetTag)
    envConfigCache[params.environment] = envConfig
  }
  return envConfig
}

export const convertToUSD = (
  token: string,
  amount: string,
  priceList: Array<CoinMarket>
) => {
  if (token === 'rowan') {
    token = 'erowan'
  }
  let coin = priceList.find(
    e => e.symbol?.toLowerCase() === token.toLowerCase()
  )

  if (coin == null) {
    throw new Error(`Could not find price for coin '${token}'`)
  }

  let currentPrice = BigNumber(coin.current_price || '0.0')
  let tokenAmount = BigNumber(amount)

  let total = currentPrice.multipliedBy(tokenAmount)
  return total.toFixed(2)
}

export const convertFiat = (
  token: string,
  amount: string,
  priceList: Array<CoinMarket>
) => {
  if (token === 'rowan') {
    token = 'erowan'
  }
  let coin = priceList.find(
    e => e.symbol?.toLowerCase() === token.toLowerCase()
  )

  if (coin == null) {
    throw new Error(`Could not find price for coin '${token}'`)
  }

  let currentPrice = BigNumber(coin.current_price || '0.0')
  let tokenAmount = BigNumber(amount)

  let total = currentPrice.multipliedBy(tokenAmount)

  return formatAsFiat(total.toString(), fiatFormatType.SMALL)
}

const onCloseNotification = async (id: number, type: NotifType) => {
  await (
    await fetchWithRetries(
      DOMAIN +
        `/api/data/common/update_notif_status_to_send?id=${id}&notifType=${type}`
    )
  )?.json()
}

export const showNotification = async (
  toast: CreateToastFnReturn,
  trade: Trade,
  side: PersonaType
) => {
  const {
    id,
    notifStatusLenderOnOpen,
    notifStatusLenderOnClose,
    notifStatusTraderOnRequestToClose,
    requestToCloseTime,
    interestRate,
  } = trade
  if (
    notifStatusLenderOnOpen === NotificationStatusEnum.PENDING &&
    side === PersonaEnum.MATCHER
  ) {
    toast({
      id: 'notifStatusLenderOnOpen',
      title: `Your deposited liquidity has been matched to Trade #${id}!`,
      description: `You are earning ${BigNumber(interestRate ?? TRADER_APY)
        .times(100)
        .toFixed(
          2
        )}% APY on this trade. You can request to close the trade at any time, and the trader will be let know and automatically closed within 7 days from the request!`,
      status: 'info',
      duration: NOTIF_RELOAD_INTERVAL,
      isClosable: true,
      onCloseComplete: async () =>
        await onCloseNotification(id, NotifTypeEnum.LENDER_OPEN),
    })
  }
  if (
    notifStatusLenderOnClose === NotificationStatusEnum.PENDING &&
    side === PersonaEnum.MATCHER
  ) {
    toast({
      id: 'notifStatusLenderOnClose',
      title: `Your liquidity in Trade #${id} has become unencumbered!`,
      description: `You can withdraw it at any time. Your pandl from this trade is ${trade.matcherPandL} ${trade.collateralTokenType}`,
      status: 'info',
      duration: NOTIF_RELOAD_INTERVAL,
      isClosable: true,
      onCloseComplete: async () =>
        await onCloseNotification(id, NotifTypeEnum.LENDER_CLOSE),
    })
  }
  if (
    notifStatusTraderOnRequestToClose === NotificationStatusEnum.PENDING &&
    side === PersonaEnum.TRADER
  ) {
    toast({
      id: 'notifStatusTraderOnRequestToClose',
      title: `The lender has requested to close Trade #${id}!`,
      description: `Trade #${id} will automatically close on ${
        requestToCloseTime != null
          ? new Date(requestToCloseTime).toLocaleDateString()
          : ''
      } if no action is taken, as the lender has requested to close it!`,
      status: 'info',
      duration: NOTIF_RELOAD_INTERVAL,
      isClosable: true,
      onCloseComplete: async () =>
        await onCloseNotification(id, NotifTypeEnum.TRADER_ON_REQUEST_TO_CLOSE),
    })
  }
}

export const aggregateInUSDForTimePeriod = (
  data: ReportingByTokenResults,
  key: 'total' | 'day' | 'week',
  envConfigData: SdkConfig,
  priceList: Array<CoinMarket>
) => {
  const aggregatedValue = data[key]
    .map(row => {
      let token = ''
      try {
        token = getUiAssetData(
          envConfigData,
          row.k.toLowerCase() ?? ''
        ).displaySymbol
      } catch (e) {
        token = row.k.toUpperCase()
      }
      let amount = row.v ?? '0.0'
      return convertToUSD(token, amount, priceList)
    })
    .reduce((a, b) => BigNumber(a).plus(b).toNumber(), 0)
  return formatAsFiat(String(aggregatedValue), fiatFormatType.SMALL)
}

export const aggregateInUSDForDirection = (
  data: ReportingResultsByDirection,
  key: 'long' | 'short',
  envConfigData: SdkConfig,
  priceList: Array<CoinMarket>
) => {
  const aggregatedValue = data[key]
    .map(row => {
      let token = ''
      try {
        token = getUiAssetData(
          envConfigData,
          row.k.toLowerCase() ?? ''
        ).displaySymbol
      } catch (e) {
        token = row.k.toUpperCase()
      }
      let amount = row.v ?? '0.0'
      return convertToUSD(token, amount, priceList)
    })
    .reduce((a, b) => BigNumber(a).plus(b).toNumber(), 0)
  return formatAsFiat(String(aggregatedValue), fiatFormatType.SMALL)
}

export const getFormattedAPRPercentage = (
  primary: string | null,
  secondary: string | null
) => {
  return `${
    BigNumber(primary == null ? secondary ?? 0 : primary ?? 0).gt(3)
      ? '> 300%'
      : formatAsPercent(primary == null ? secondary : primary)
  }`
}
