import { AccountData, DirectSecp256k1HdWallet } from '@cosmjs/proto-signing'
import { SigningStargateClient } from '@cosmjs/stargate'
import { DOMAIN } from '../utils/constants/constants'
import { constructCookie } from './constructCookie'
import * as Sentry from '@sentry/nextjs'
import { delay, fetchWithRetries, getSifRpcUrl } from './serverUtils'

export type WalletId = 'mv' | 'pta' | 'lta' | 'ia' | 'ha' | 'efa'

export const WalletUrls: { [key in WalletId]: string } = {
  mv: '/api/app/matcher_vault',
  pta: '/api/app/pending_trade',
  lta: '/api/app/live_trade',
  ia: '/api/app/interest',
  ha: '/api/app/hedge',
  efa: '/api/app/entrance_fee',
}

export type Wallet = {
  wallet: DirectSecp256k1HdWallet
  account: AccountData
  client: SigningStargateClient
}

export class WalletKeeper {
  wallets: {
    [key in WalletId]?: Wallet
  } = {}

  private constructor() {}

  static async build(): Promise<WalletKeeper> {
    const keeper = new WalletKeeper()
    try {
      await keeper.initializeWallets()
    } catch (err) {
      Sentry.captureException(
        `ERROR: initializing wallets: ${JSON.stringify(err)}`
      )
      console.log(JSON.stringify(err))
      console.trace('ERROR: initializing wallets: ')
    }
    return keeper
  }

  async initializeWallets(walletIdToInit?: WalletId) {
    const maxRetries = 3 // Set the maximum number of retries
    let attempt = 0
    while (attempt < maxRetries) {
      try {
        const tokenData = await fetchWithRetries(
          DOMAIN + `/api/app/generate_token`
        )
        if (tokenData == null) {
          continue
        }
        const data = (await tokenData.json()) as { token: string }

        const walletIdsToProcess = walletIdToInit
          ? [walletIdToInit]
          : (Object.keys(WalletUrls) as WalletId[])

        for (const walletId of walletIdsToProcess) {
          const url = WalletUrls[walletId]
          let response = await fetchWithRetries(DOMAIN + url, {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${data.token}`,
              ...constructCookie(),
            },
          })
          if (response == null) {
            continue
          }
          const mnemonic = await response.json()
          const wallet = await DirectSecp256k1HdWallet.fromMnemonic(
            `${mnemonic.value}`,
            { prefix: 'sif' }
          )
          const [account] = await wallet.getAccounts()
          const sifRpcUrl = await getSifRpcUrl()
          const client = await SigningStargateClient.connectWithSigner(
            sifRpcUrl!,
            wallet
          )
          this.wallets[walletId] = {
            wallet,
            account,
            client,
          }
          return
        }
      } catch (err) {
        console.error('Attempt', attempt + 1, 'failed:', JSON.stringify(err))
        console.trace()
        Sentry.captureException(err)
        attempt++
        if (attempt >= maxRetries) {
          return null // Max retries reached, return null
        }
        await delay(3) // Wait for 3 second before retrying
      }
    }
  }

  async getWalletEntry(walletId: WalletId): Promise<Wallet> {
    let wallet = this.wallets[walletId]
    if (!wallet) {
      Sentry.captureException(`Wallet with id ${walletId} not found`)
      console.log(`Wallet with id ${walletId} not found`)
      console.log(`Re-initializing wallet with id ${walletId}`)
      await this.initializeWallets(walletId)
      wallet = this.wallets[walletId]
      if (!wallet) {
        Sentry.captureException(
          `Failed to re-initialize wallet with id ${walletId}`
        )
        console.log(`Failed to re-initialize wallet with id ${walletId}`)
        throw new Error(`Failed to re-initialize wallet with id ${walletId}`)
      }
    }
    return wallet
  }

  async getWallet(walletId: WalletId) {
    const wallet = await this.getWalletEntry(walletId)
    return wallet.wallet
  }

  async getAccount(walletId: WalletId) {
    const wallet = await this.getWalletEntry(walletId)
    return wallet.account
  }

  async getClient(walletId: WalletId) {
    const wallet = await this.getWalletEntry(walletId)
    return wallet.client
  }
}
