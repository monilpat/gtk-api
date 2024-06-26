import {
  DOMAIN,
  DYDX_CONFIG,
  DydxAsset,
  DydxMarket,
  MAINNET_SIF_ENV,
  PROCESS,
  TESTNET_SIF_ENV,
  TRADER_APY,
  hedgeInterestMultiplier,
  tokenToMarket,
} from '../utils/constants/constants'
import { constructCookie } from './constructCookie'
import * as Sentry from '@sentry/nextjs'
import {
  delay,
  fetchWithRetries,
  getBalance,
  getSifRpcUrl,
  getTokenRegistryEntry,
} from './serverUtils'
import { sleep } from '@dydxprotocol/v4-client-js/build/src/lib/utils'
import Long from 'long'
import {
  DirectSecp256k1HdWallet,
  EncodeObject,
  OfflineSigner,
} from '@cosmjs/proto-signing'
import {
  BECH32_PREFIX,
  LocalWallet,
  NOBLE_BECH32_PREFIX,
  Network,
  NobleClient,
  ValidatorClient,
} from '@dydxprotocol/v4-client-js'
import { WalletKeeper } from './WalletKeeper'
import BigNumber from 'bignumber.js'
import {
  MsgTransferEncodeObject,
  SigningStargateClient,
} from '@cosmjs/stargate'
import { DeliverTxResponse, NetworkEnv } from '@sifchain/sdk'
import { BigNumberish } from 'ethers'
import getTokenPrecision from './getTokenPrecision'
import {
  getTokenDenomFromRegistry,
  printTransactionResponse,
  sendTokens,
} from './marginUtils'
import { TxRaw } from 'cosmjs-types/cosmos/tx/v1beta1/tx'
import { Mutex } from 'async-mutex'
import {
  BroadcastTxAsyncResponse,
  BroadcastTxSyncResponse,
} from '@cosmjs/tendermint-rpc/build/tendermint37'
import { IndexedTx } from '@cosmjs/stargate'
import { Trade } from './dbTypes'
import { getMatcherAPRonTrade } from './pandlUtils'
import { getEffectiveAnnualizedFundingRate } from '../utils/apiUtils'
import {
  createClients,
  indexerClient,
  initialized,
} from '~/apiUtils/dydxClients'

const mutex = new Mutex()

export const processWithdrawalFromDYDX = async () => {
  const tokenData = await fetchWithRetries(DOMAIN + `/api/app/generate_token`)
  if (tokenData == null) {
    return []
  }
  const data = (await tokenData.json()) as { token: string }
  await fetchWithRetries(DOMAIN + `/api/data/trade/withdraw_funds_from_dydx`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.token}`,
      ...constructCookie(),
    },
  })
}

export const processDepositToSif = async () => {
  const tokenData = await fetchWithRetries(DOMAIN + `/api/app/generate_token`)
  if (tokenData == null) {
    return []
  }
  const data = (await tokenData.json()) as { token: string }
  await fetchWithRetries(DOMAIN + `/api/data/trade/deposit_to_sif`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.token}`,
      ...constructCookie(),
    },
  })
}

export const processDepositToDYDX = async () => {
  const tokenData = await fetchWithRetries(DOMAIN + `/api/app/generate_token`)
  if (tokenData == null) {
    return
  }
  const data = (await tokenData.json()) as { token: string }
  await fetchWithRetries(DOMAIN + `/api/data/trade/deposit_to_dydx`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.token}`,
      ...constructCookie(),
    },
  })
}

export const processTransferFromSifToDYDX = async () => {
  const tokenData = await fetchWithRetries(DOMAIN + `/api/app/generate_token`)
  if (tokenData == null) {
    return
  }
  const data = (await tokenData.json()) as { token: string }
  await fetchWithRetries(DOMAIN + `/api/data/trade/transfer_to_dydx_from_sif`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.token}`,
      ...constructCookie(),
    },
  })
}

export const sendDYDXToSifchain = async (
  dydxClient: ValidatorClient,
  nobleClient: NobleClient,
  amount: BigNumberish,
  receiverAddress: string = PROCESS.HEDGE_ADDRESS
): Promise<(BroadcastTxAsyncResponse | IndexedTx | DeliverTxResponse)[]> => {
  const walletKeeper = await WalletKeeper.build()
  const dydxWallet = await LocalWallet.fromMnemonic(
    (
      await walletKeeper.getWallet('ha')
    ).mnemonic,
    BECH32_PREFIX
  )
  let dydxBalances = await dydxClient.get.getAccountBalances(
    dydxWallet.address ?? PROCESS.HEDGE_DYDX_ADDRESS
  )
  const relevantBalance = dydxBalances.find(
    balance => balance.denom === DYDX_CONFIG.general.usdcIbcHash
  )
  if (
    relevantBalance != null &&
    BigNumber(relevantBalance.amount).lt(amount.toString())
  ) {
    return []
  }
  const nobleWallet = await LocalWallet.fromMnemonic(
    (
      await walletKeeper.getWallet('ha')
    ).mnemonic,
    NOBLE_BECH32_PREFIX
  )
  await nobleClient.connect(nobleWallet)

  if (nobleWallet.address === undefined || dydxWallet.address === undefined) {
    throw new Error('Wallet not found')
  }

  // DYDX -> Noble
  // let coins = await nobleClient.getAccountBalances()
  // console.log('Noble balances before DYDX -> NOBLE')
  // console.log(JSON.stringify(coins))
  // console.log('Dydx Balance before DYDX -> NOBLE')
  // console.log(JSON.stringify(dydxBalances))
  const ibcToNobleMsg: EncodeObject = {
    typeUrl: '/ibc.applications.transfer.v1.MsgTransfer',
    value: {
      sourcePort: DYDX_CONFIG.general.sourcePort,
      sourceChannel: DYDX_CONFIG.general.sourceChannelDYDXToNoble,
      token: {
        denom: DYDX_CONFIG.general.usdcIbcHash,
        amount: amount.toString(),
      },
      sender: dydxWallet.address,
      receiver: nobleWallet.address,
      timeoutTimestamp: Long.fromNumber(
        Math.floor(Date.now() / 1000) * 1e9 + 10 * 60 * 1e9
      ),
    },
  }
  const msgs = [ibcToNobleMsg]
  const encodeObjects: Promise<EncodeObject[]> = new Promise(resolve =>
    resolve(msgs)
  )
  const dydxToNobleTxn = await dydxClient.post.send(
    dydxWallet,
    () => {
      return encodeObjects
    },
    false,
    undefined,
    undefined
  )
  await sleep(10000)
  console.log('dydxToNobleTxn', dydxToNobleTxn)
  // coins = await nobleClient.getAccountBalances()
  // console.log('Noble balances after DYDX -> NOBLE')
  // console.log(JSON.stringify(coins))
  // dydxBalances = await dydxClient.get.getAccountBalances(dydxWallet.address)
  // console.log('Dydx Balance after DYDX -> NOBLE')
  // console.log(JSON.stringify(dydxBalances))
  // Noble -> Sifchain
  const ibcNobleToSifchainMsg: MsgTransferEncodeObject = {
    typeUrl: '/ibc.applications.transfer.v1.MsgTransfer',
    value: {
      sourcePort: DYDX_CONFIG.general.sourcePort,
      sourceChannel: DYDX_CONFIG.general.sourceChannelNobleToSifchain,
      token: {
        denom: 'uusdc',
        amount: amount.toString(),
      },
      sender: nobleWallet.address,
      receiver: receiverAddress,
      timeoutTimestamp: Long.fromNumber(
        Math.floor(Date.now() / 1000) * 1e9 + 10 * 60 * 1e9
      ),
    },
  }
  const nobleToSifchainTxn = await nobleClient.IBCTransfer(
    ibcNobleToSifchainMsg as any
  )
  await sleep(10000)
  console.log('nobleToSifchainTxn ', nobleToSifchainTxn)
  if (nobleToSifchainTxn.code != 0) {
    console.error(nobleToSifchainTxn.code)
    return []
  }
  // coins = await nobleClient.getAccountBalances()
  // console.log('Noble balances after NOBLE -> SIF')
  // console.log(JSON.stringify(coins))
  // dydxBalances = await dydxClient.get.getAccountBalances(dydxWallet.address)
  // console.log('Dydx Balance after NOBLE -> SIF')
  // console.log(JSON.stringify(dydxBalances))
  return [dydxToNobleTxn as any, nobleToSifchainTxn as any]
}

// depositDYDXToSubaccount
export const sendSifchainToDYDX = async (
  nobleClient: NobleClient,
  tokenAmount: string,
  receivingAddress: string = PROCESS.HEDGE_DYDX_ADDRESS
) => {
  const walletKeeper = await WalletKeeper.build()
  // Sifchain -> Noble
  if (!walletKeeper) {
    return []
  }
  let sifToNobleTxn: DeliverTxResponse | null = null
  let nobleToDydxTxn: DeliverTxResponse | any | null = null
  sifToNobleTxn = await ibcTransferFromSifchain(
    walletKeeper,
    await walletKeeper.getWallet('ha'),
    PROCESS.HEDGE_ADDRESS,
    PROCESS.HEDGE_NOBLE_ADDRESS,
    'uusdc',
    tokenAmount
  )
  await sleep(10000)
  if (sifToNobleTxn === null || sifToNobleTxn.code !== 0) {
    return []
  }
  printTransactionResponse(sifToNobleTxn)
  if (sifToNobleTxn.code !== 0) {
    console.error(`ERROR: response ${sifToNobleTxn.rawLog}`)
    Sentry.captureException(`ERROR: response ${sifToNobleTxn.rawLog}`)
    return []
  }
  const dydxWallet = await LocalWallet.fromMnemonic(
    (
      await walletKeeper.getWallet('ha')
    ).mnemonic,
    BECH32_PREFIX
  )
  const nobleWallet = await LocalWallet.fromMnemonic(
    (
      await walletKeeper.getWallet('ha')
    ).mnemonic,
    NOBLE_BECH32_PREFIX
  )
  await nobleClient.connect(nobleWallet)
  if (nobleWallet.address === undefined || dydxWallet.address === undefined) {
    console.log('Wallet not found')
    return []
  }

  try {
    // const coins = await nobleClient.getAccountBalances()
    // console.log('Noble balances before NOBLE -> DYDX')
    // console.log(JSON.stringify(coins))
    // const dydxBalances = await dydxClient.get.getAccountBalances(
    //   dydxWallet.address
    // )
    // console.log('Dydx Balance before NOBLE -> DYDX')
    // console.log(JSON.stringify(dydxBalances))
    // NOBLE -> DYDX
    const ibcFromNobleMsg: EncodeObject = {
      typeUrl: '/ibc.applications.transfer.v1.MsgTransfer',
      value: {
        sourcePort: DYDX_CONFIG.general.sourcePort,
        sourceChannel: DYDX_CONFIG.general.sourceChannelNobleToDYDX,
        token: {
          denom: 'uusdc',
          amount: tokenAmount,
        },
        sender: nobleWallet.address,
        receiver: receivingAddress,
        timeoutTimestamp: Long.fromNumber(
          Math.floor(Date.now() / 1000) * 1e9 + 10 * 60 * 1e9
        ),
      },
    }
    const fee = await nobleClient.simulateTransaction([ibcFromNobleMsg])

    ibcFromNobleMsg.value.token.amount = (
      parseInt(ibcFromNobleMsg.value.token.amount, 10) -
      Math.floor(parseInt(fee.amount[0].amount, 10) * 1.4)
    ).toString()

    nobleToDydxTxn = await nobleClient.send([ibcFromNobleMsg])
    await sleep(10000)
    console.log('nobleToDydxTxn ', nobleToDydxTxn)
  } catch (error: any) {
    console.log(JSON.stringify(error.message))
  }

  // try {
  //   const coin = await nobleClient.getAccountBalance('uusdc')
  //   console.log('Noble balance after NOBLE -> DYDX')
  //   console.log(JSON.stringify(coin))
  //   const dydxBalances = await dydxClient.get.getAccountBalances(
  //     dydxWallet.address
  //   )
  //   console.log('Dydx Balance after NOBLE -> DYDX')
  //   console.log(JSON.stringify(dydxBalances))
  // } catch (error: any) {
  //   console.log(JSON.stringify(error.message))
  // }
  return [sifToNobleTxn, nobleToDydxTxn]
}

export const ibcTransferFromSifchain = async (
  walletKeeper: WalletKeeper,
  offlineSigner: OfflineSigner | DirectSecp256k1HdWallet,
  sendingAddress: string,
  receivingAddress: string,
  token: string,
  tokenAmount: string
): Promise<DeliverTxResponse | null> => {
  return await mutex.runExclusive(async () => {
    console.log('made it to send ibc packet')
    const { hasError, precision: collateralPrecision } =
      await getTokenPrecision(token)
    const tokenDenom = await getTokenDenomFromRegistry(token)
    const balance = await getBalance(
      walletKeeper,
      'ha',
      PROCESS.HEDGE_ADDRESS,
      tokenDenom
    )
    if (
      hasError ||
      BigNumber(tokenAmount).isLessThan(
        BigNumber(10).exponentiatedBy(-collateralPrecision)
      )
    ) {
      console.log(
        `trying to send less than minimum token amount ${tokenAmount}`
      )
      Sentry.captureException(
        `trying to send less than minimum token amount ${tokenAmount}`
      )
      return null
    }
    if (
      balance !== null &&
      BigNumber(
        BigNumber(balance).times(BigNumber(10).pow(collateralPrecision))
      ).lt(tokenAmount)
    ) {
      console.log(
        `trying to send ${tokenAmount} more than the available balance ${balance}`
      )
      Sentry.captureException(
        `trying to send ${tokenAmount} more than the available balance ${balance}`
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
    const ibcChannelId = (await getTokenRegistryEntry(token, sifRpcUrl!))
      .ibcChannelId
    const maxRetries = 3 // Set the maximum number of retries
    let attempt = 0

    while (attempt < maxRetries) {
      try {
        const signedTx = await client.sign(
          sendingAddress,
          [
            {
              typeUrl: '/ibc.applications.transfer.v1.MsgTransfer',
              value: {
                sourcePort: DYDX_CONFIG.general.sourcePort,
                sourceChannel: ibcChannelId,
                token: {
                  denom: tokenDenom,
                  amount: tokenAmount,
                },
                sender: sendingAddress,
                receiver: receivingAddress,
                timeoutTimestamp: Long.fromNumber(
                  Math.floor(Date.now() / 1000) * 1e9 + 10 * 60 * 1e9
                ),
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
          JSON.stringify({})
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

export const toHexString = (byteArray: Uint8Array | string) => {
  if (typeof byteArray == 'string') {
    return byteArray
  }
  return byteArray.reduce((hexString, byte) => {
    return hexString + byte.toString(16).padStart(2, '0')
  }, '')
}

export const getEffectiveInterestRateForMarket = async (
  targetTokenType: string
): Promise<number> => {
  if (!initialized) {
    await createClients(
      PROCESS.USE_TESTNET === 'true' ? TESTNET_SIF_ENV : MAINNET_SIF_ENV
    )
  }
  const market = tokenToMarket[targetTokenType]
  const matcherInterestRate = await getEffectiveAnnualizedFundingRate(
    indexerClient,
    market
  )
  if (matcherInterestRate == null) {
    return TRADER_APY
  }
  return BigNumber.max(
    TRADER_APY,
    BigNumber(matcherInterestRate).times(hedgeInterestMultiplier)
  ).toNumber()
}

export const getEffectiveInterestRateForHedgeTrade = async (
  market: DydxMarket
): Promise<number> => {
  const matcherInterestRate = await getEffectiveAnnualizedFundingRate(
    indexerClient,
    market
  )
  if (matcherInterestRate == null) {
    return TRADER_APY
  }
  return BigNumber(matcherInterestRate).toNumber()
}
