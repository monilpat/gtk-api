import {
  processMessageAsPendingTradeAddress,
  processMessageAsMatchVault,
} from './marginUtils'
import { Transaction, DOMAIN, PROCESS } from '../utils/constants/constants'
import { WalletKeeper } from './WalletKeeper'
import { constructCookie } from './constructCookie'
import * as Sentry from '@sentry/nextjs'
import { fetchWithRetries } from './serverUtils'

export const getTransactionsToReceiverAddress = async (
  receiverAddress: string,
  token: string
): Promise<Array<Transaction>> => {
  const response = await fetchWithRetries(
    DOMAIN +
      `/api/data/common/get_unprocessed_txn_for_receiver?receiverAddress=${receiverAddress}`,
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
  return (await response.json()) as Array<Transaction>
}

export const updateTransactionsAsProcessed = async (
  txnHash: string,
  token: string
): Promise<Array<Transaction>> => {
  const response = await fetchWithRetries(
    DOMAIN +
      `/api/data/common/update_txns_to_processed_for_receiver?txnHash=${txnHash}`,
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
  return (await response.json()) as Array<Transaction>
}

export const processProtocolMessages = async (
  walletKeeper: WalletKeeper
): Promise<void> => {
  const tokenData = await fetchWithRetries(DOMAIN + `/api/app/generate_token`)
  if (tokenData == null) {
    return
  }
  const { token } = (await tokenData.json()) as { token: string }

  const mvMessages = await getTransactionsToReceiverAddress(
    `${PROCESS.MATCH_VAULT_ADDRESS}`,
    token
  )
  console.log('mvMessages ', mvMessages)
  for (let mvMessage of mvMessages) {
    try {
      const { sender_address, token_type, token_amount, memo, txn_hash } =
        mvMessage
      // TODO: We probably want to consolidate off of type as we will run into seq # issues here
      const success = await processMessageAsMatchVault(
        sender_address,
        token_type,
        token_amount,
        memo,
        txn_hash,
        walletKeeper
      )
      if (success) {
        await updateTransactionsAsProcessed(txn_hash, token)
      }
    } catch (e) {
      const errorMessage = `Error processing MVA message ${JSON.stringify(
        mvMessage
      )}. Error: ${JSON.stringify(e)} Moving onto next transaction.`
      console.error(errorMessage)
      Sentry.captureException(errorMessage)
      continue
    }
  }

  // console.log('onto pta messages ')
  const ptaMessages = await getTransactionsToReceiverAddress(
    `${PROCESS.PENDING_TRADE_ADDRESS}`,
    token
  )
  console.log('ptaMessages ', ptaMessages)
  for (let ptaMessage of ptaMessages) {
    try {
      const { sender_address, token_type, token_amount, memo, txn_hash } =
        ptaMessage
      // TODO: We probably want to consolidate off of type as we will run into seq # issues here
      const success = await processMessageAsPendingTradeAddress(
        sender_address,
        token_type,
        token_amount,
        memo,
        txn_hash,
        walletKeeper
      )
      if (success) {
        await updateTransactionsAsProcessed(txn_hash, token)
      }
    } catch (e) {
      const errorMessage = `Error processing PTA message ${JSON.stringify(
        ptaMessage
      )}. Error: ${JSON.stringify(e)} Moving onto next transaction.`
      console.error(errorMessage)
      Sentry.captureException(errorMessage)
      continue
    }
  }
}
