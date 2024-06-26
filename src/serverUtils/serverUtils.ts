import {
  CoinListOrder,
  DOMAIN,
  MATCHER_MULTIPLIER,
  REGISTRY_URL,
  ENV,
  PROCESS,
  DEFAULT_TIMEOUT,
  MINIMUM_TRADE_DURATION,
  ENABLED_COLLATERAL_TOKENS,
  DEFAULT_RETRIES,
  DEFAULT_RETRY_DELAY,
  DYDX_CONFIG,
} from '../utils/constants/constants'
import {
  MatchVault,
  Trade,
  TradeDirectionEnum,
  TradeNotOpenReason,
} from './dbTypes'
import { createQueryClient, DeliverTxResponse } from '@sifchain/sdk'
import { RegistryEntry } from '@sifchain/sdk/build/typescript/generated/proto/sifnode/tokenregistry/v1/types'
import nullthrows from 'nullthrows'
import {
  executeTradeOnFindingMatch,
  formatTokenForPriceList,
  getCoinGeckoCoinLists,
  getCoinIdsBySymbols,
  getTokenDenomFromRegistry,
  printTransactionResponse,
  sendTokensMultiMsg,
  updateNotOpenReason,
} from './marginUtils'
import { WalletId, WalletKeeper } from './WalletKeeper'
import { constructCookie } from './constructCookie'
import BigNumber from 'bignumber.js'
import _ from 'lodash'
import {
  AssetConfig,
  IAsset,
  NetworkEnv,
  NetworkKind,
} from '~/serverUtils/types'
import * as Sentry from '@sentry/nextjs'
import { SigningStargateClient } from '@cosmjs/stargate'
import getTokenPrecision from './getTokenPrecision'
import { shouldOpenTrade } from './closeUtils'
import dayjs from 'dayjs'
import { EncodeObject, OfflineSigner } from '@cosmjs/proto-signing'
import { Network, ValidatorClient } from '@dydxprotocol/v4-client-js'
import dydxChainConfig from 'src/common/config/networks/dydx/config.mainnet.json'

type RegistryCacheResult = RegistryEntry[] | undefined

const registryCache: { [key: string]: RegistryCacheResult } = {}
export const getRegistryEntries = async (
  rpcUrl: string
): Promise<RegistryEntry[]> => {
  let registry: RegistryCacheResult
  if (registryCache[rpcUrl]) {
    registry = registryCache[rpcUrl]
  } else {
    const queryClients = await createQueryClient(rpcUrl)
    registry = await queryClients.tokenRegistry
      .Entries({})
      .then(x => x.registry?.entries)
    registryCache[rpcUrl] = registry
  }

  return registry ?? []
  // return (
  //   registry?.filter(x =>
  //     allowedCollateralOptions.includes(x.baseDenom.toUpperCase())
  //   ) ?? []
  // )
}

export const getTokenRegistryEntry = async (
  tokenType: string,
  rpcUrl: string
): Promise<RegistryEntry> => {
  const tokenEntries = await getRegistryEntries(rpcUrl)
  return nullthrows(
    tokenEntries?.find(x => x.baseDenom === tokenType || x.denom === tokenType),
    `token ${tokenType} was not found in registry`
  )
}

/**
 * Look for match for all trade requests
 * @returns
 */
export const processTradeRequests = async (
  walletKeeper: WalletKeeper
): Promise<Array<DeliverTxResponse>> => {
  console.log('processTradeRequests')
  const tokenData = await fetchWithRetries(DOMAIN + `/api/app/generate_token`)
  if (tokenData == null) {
    return []
  }
  const { token } = (await tokenData.json()) as { token: string }
  const response = await fetchWithRetries(
    DOMAIN + `/api/data/trade/get_trade_by_status?status=PENDING`,
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
  const pendingTradeRequests = (await response.json()) as Trade[]
  if (pendingTradeRequests.length === 0) {
    return []
  }
  const results: DeliverTxResponse[] = []
  let tokenList = []
  for (let trade of pendingTradeRequests) {
    let { collateralTokenType, targetTokenType } = trade
    tokenList.push(formatTokenForPriceList(collateralTokenType))
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
  for (let tradeRequest of pendingTradeRequests) {
    try {
      const {
        id,
        collateralTokenType,
        collateralTokenAmount,
        traderAddress,
        targetTokenType,
        leverageQuantity,
      } = tradeRequest
      console.log('trade ', tradeRequest)
      const targetPrice =
        priceList.find(f => f.symbol == targetTokenType)?.current_price ?? null
      if (targetPrice == null) {
        console.log('no price found for target token')
        continue
      }
      const currentTargetPrice = targetPrice
        ? BigNumber(targetPrice)
        : BigNumber(0)
      const [shouldOpen, reason] = shouldOpenTrade(
        tradeRequest,
        currentTargetPrice.toString()
      )
      if (!shouldOpen) {
        console.log(`skipping trade ${id} due to not meeting open condition`)
        // should update trade not to open reason if not already set
        await updateNotOpenReason(tradeRequest, token, reason)
        continue
      }
      const collateralMultiplier = Math.min(
        BigNumber(leverageQuantity ?? 1).toNumber(),
        MATCHER_MULTIPLIER
      )
      const response = await fetchWithRetries(
        DOMAIN +
          `/api/data/match/top_match?tokenType=${collateralTokenType}&tokenAmount=${BigNumber(
            collateralTokenAmount
          ).times(collateralMultiplier)}&traderAddress=${traderAddress}`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            ...constructCookie(),
          },
        }
      )
      if (response == null) {
        continue
      }
      const match = (await response.json()) as MatchVault | null
      console.log('match ', match)
      if (match === null) {
        console.log('no match')
        // broadcast to liquidity matchers that a new position is available
        await updateNotOpenReason(
          tradeRequest,
          token,
          TradeNotOpenReason.NO_MATCH
        )
        continue
      }
      console.log('made it to execute trade on finding match')
      const collateralTokenTypeDenom = await getTokenDenomFromRegistry(
        collateralTokenType
      )
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
          `processTradeRequests: pta balance= ${tradeBalance}, collateral token amount= ${collateralTokenAmount}`
        )
        Sentry.captureException(`not enough balance to complete trade`)
        await updateNotOpenReason(
          tradeRequest,
          token,
          TradeNotOpenReason.NOT_ENOUGH_FUNDS_PTA
        )
        continue
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
          `processTradeRequests: mv balance= ${matchBalance}, collateral token amount= ${collateralTokenAmount}`
        )
        Sentry.captureException(
          `not enough balance in match vault to complete trade`
        )
        await updateNotOpenReason(
          tradeRequest,
          token,
          TradeNotOpenReason.NOT_ENOUGH_FUNDS_MVA
        )
        continue
      }
      results.push(
        ...(await executeTradeOnFindingMatch(
          tradeRequest,
          match,
          walletKeeper,
          token
        ))
      )
    } catch (e) {
      const errorMessage = `Error checking if pending trade #${
        tradeRequest.id
      } is ready to be executed. Error: ${JSON.stringify(
        e
      )} Moving onto next trade.`
      console.error(errorMessage)
      Sentry.captureException(errorMessage)
      continue
    }
  }
  return results
}

function parseAssets(configAssets: AssetConfig[]): IAsset[] {
  return configAssets.map(a => {
    return {
      ...a,
      displaySymbol: a.displaySymbol || a.symbol,
      label: parseLabel(a),
    } as IAsset
  })
}

function parseLabel(a: AssetConfig) {
  if (a.network === 'sifchain') {
    return a.symbol.indexOf('c') === 0
      ? 'c' + a.symbol.slice(1).toUpperCase()
      : a.symbol.toUpperCase()
  }

  // network is ethereum
  return a.symbol === 'erowan' ? 'eROWAN' : a.symbol.toUpperCase()
}

const fetchConfig = async (network: NetworkKind, env: NetworkEnv) =>
  fetch(`${REGISTRY_URL}/api/assets/${network}/${env}`)
    .then(x => x.json() as Promise<AssetConfig[]>)
    .then(parseAssets)

export const getSingleUiAssetData = (
  uiAssetsRegistry: IAsset[],
  tokenDisplayName: string
): IAsset => {
  const asset = nullthrows(
    uiAssetsRegistry?.find(x => {
      return (
        x.displaySymbol === tokenDisplayName ||
        x.symbol === tokenDisplayName.toUpperCase()
      )
    }),
    `token ${tokenDisplayName} is not found in UI assets registry`
  )
  return asset
}

const uiAssetsRegistryCache: { [key: string]: IAsset[] } = {}
export async function getUiTokenRegistry(
  environment: NetworkEnv = ENV
): Promise<IAsset[]> {
  let uiAssetsRegistry: IAsset[]
  if (uiAssetsRegistryCache[environment]) {
    uiAssetsRegistry = uiAssetsRegistryCache[environment]
  } else {
    const [sifchainAssets, ethereumAssets] = await Promise.all([
      fetchConfig('sifchain', environment),
      fetchConfig('ethereum', environment),
    ])

    uiAssetsRegistry = [...sifchainAssets, ...ethereumAssets]
    uiAssetsRegistryCache[environment] = uiAssetsRegistry
  }
  return uiAssetsRegistry
}

const sifRpcUrlCache: { [key: string]: string } = {}
export const getSifRpcUrl = async () => {
  let sifRpcUrl: string
  if (sifRpcUrlCache[ENV]) {
    sifRpcUrl = sifRpcUrlCache[ENV]
  } else {
    const response = await fetchWithRetries(
      DOMAIN + `/api/data/common/get_rpc_url`,
      {
        headers: {
          ...constructCookie(),
        },
      }
    )
    if (response == null) {
      return null
    }
    sifRpcUrl = await response.json()
    sifRpcUrlCache[ENV] = sifRpcUrl
  }
  return sifRpcUrl
}
export const getBalance = async (
  walletKeeper: WalletKeeper,
  walletId: WalletId,
  address: string,
  token: string
): Promise<string | null> => {
  const wallet = (await walletKeeper.getWallet(walletId)) as OfflineSigner
  const sifRpcUrl = await getSifRpcUrl()
  const client = await SigningStargateClient.connectWithSigner(
    sifRpcUrl!,
    wallet
  )
  const balance = await client.getBalance(address, token)

  const { precision: tokenPrecision } = await getTokenPrecision(token)
  return BigNumber(balance.amount!)
    .dividedBy(BigNumber(10).exponentiatedBy(tokenPrecision))
    .toFixed(tokenPrecision)
}

export const getDydxBalance = async (
  client: ValidatorClient,
  address: string,
  token: string = DYDX_CONFIG.general.usdcIbcHash
): Promise<string | null> => {
  const balance = await client.get.getAccountBalance(address, token)
  if (!balance) {
    return null
  }
  const tokenPrecision = dydxChainConfig.currencies.find(
    x => x.coinMinimalDenom === token
  )?.coinDecimals
  return BigNumber(balance.amount!)
    .dividedBy(BigNumber(10).exponentiatedBy(tokenPrecision!))
    .toFixed(tokenPrecision!)
}

export const delay = async (
  seconds: number | null = DEFAULT_TIMEOUT
): Promise<void> => {
  return await new Promise(resolve =>
    setTimeout(resolve, (seconds ?? DEFAULT_TIMEOUT) * 1000)
  )
}

/**
 * A fetch wrapper with retry logic, specifically checking for status code 200.
 * @param {string} url - The URL to fetch.
 * @param {RequestInit} options - Fetch options.
 * @param {number} [maxRetries=3] - Maximum number of retries.
 * @param {number} [retryDelay=1000] - Delay between retries in seconds.
 * @returns {Promise<Response>} The fetch response.
 */
export const fetchWithRetries = async (
  url: string,
  options: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...constructCookie(),
    },
  },
  maxRetries: number = DEFAULT_RETRIES,
  retryDelay: number = DEFAULT_RETRY_DELAY
): Promise<Response | null> => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options)
      if (response.status !== 200) {
        const data = await response.json()
        console.log(`ERROR: response= ${JSON.stringify(data)}`)
        Sentry.captureException(`ERROR: response= ${JSON.stringify(data)}`)
        console.trace('Trace: ')
        continue
      }
      return response
    } catch (error) {
      console.error(
        `Attempt ${attempt + 1} at ${url} failed: ${JSON.stringify(error)}`
      )
      if (attempt < maxRetries - 1) {
        await delay(retryDelay)
      }
    }
  }
  return null
}

export const withRetries = async (
  func: Promise<any>,
  maxRetries: number = DEFAULT_RETRIES,
  retryDelay: number = DEFAULT_RETRY_DELAY
): Promise<any> => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await func
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed: ${JSON.stringify(error)}`)
      if (attempt < maxRetries - 1) {
        await delay(retryDelay)
      }
    }
  }
  return null
}

const convertLocalDateToUTC = (date: Date) => {
  return new Date(date.getTime() + date.getTimezoneOffset() * 60000)
}

export const hasMinimumTradeOpenWindowBeenHit = (trade: Trade) => {
  let minimumDurationForOpenHit
  if (trade.executedAt !== null) {
    // Calculate the duration from executedAt to now.
    const durationSinceExecution =
      convertLocalDateToUTC(new Date()).getTime() -
      new Date(trade.executedAt).getTime()
    minimumDurationForOpenHit = durationSinceExecution >= MINIMUM_TRADE_DURATION
  } else {
    // If executedAt is null, then the item has not been executed.
    minimumDurationForOpenHit = true
  }
  return minimumDurationForOpenHit
}

export const formatDate = (date: Date | null) => {
  if (date === null) {
    return '-'
  }
  const dayjsDate = dayjs(String(date) + ' UTC')
  return `${dayjsDate.toDate().toLocaleDateString()} ${dayjsDate
    .toDate()
    .toLocaleTimeString()}`
}

export const processEntranceFeeTransfer = async (
  walletKeeper: WalletKeeper
): Promise<DeliverTxResponse | null> => {
  console.log('Processing entrance fee transfer')
  const efaWallet = await walletKeeper.getWallet('efa')
  const messages = []
  for (let token of ENABLED_COLLATERAL_TOKENS) {
    const collateralTokenTypeDenom = await getTokenDenomFromRegistry(token)
    const { hasError, precision: collateralPrecision } =
      await getTokenPrecision(token)
    if (hasError) {
      continue
    }
    const balance = await getBalance(
      walletKeeper,
      'efa',
      PROCESS.ENTRANCE_FEE_ADDRESS,
      collateralTokenTypeDenom
    )
    if (
      balance == null ||
      BigNumber(balance).isLessThan(
        BigNumber(10).exponentiatedBy(-collateralPrecision)
      )
    ) {
      continue
    }
    const amount = [
      {
        denom: collateralTokenTypeDenom,
        amount: BigNumber(balance)
          .times(BigNumber(10).exponentiatedBy(collateralPrecision))
          .toFixed(0),
      },
    ]
    console.log('amount ', JSON.stringify(amount))
    messages.push({
      typeUrl: '/cosmos.bank.v1beta1.MsgSend',
      value: {
        fromAddress: PROCESS.ENTRANCE_FEE_ADDRESS,
        toAddress: `${PROCESS.REWARDS_ADDRESS}`,
        amount: amount,
        memo: JSON.stringify({
          transaction_type: 'disperse_entrance_fee',
        }),
      } as unknown as EncodeObject,
    })
  }
  if (messages.length === 0) {
    console.log('No messages to send')
    return null
  }
  console.log('messages: ', messages)
  const result = await sendTokensMultiMsg(
    efaWallet,
    PROCESS.ENTRANCE_FEE_ADDRESS,
    messages,
    {
      transaction_type: 'disperse_entrance_fee',
    }
  )
  if (result === null || result.code !== 0) {
    return null
  }
  printTransactionResponse(result)
  return result
}
