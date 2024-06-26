import { PrismaClient } from '@prisma/client'
import { assert } from '@cosmjs/utils'
import { createMultisigThresholdPubkey } from '@cosmjs/amino'
import { makeMultisignedTx } from '@cosmjs/stargate'
import {
  decodeBech32Pubkey,
  encodeAminoPubkey,
  pubkeyToAddress,
} from '@cosmjs/launchpad'
import { PREFIX } from '@/utils/constants/constants'
import { TransactionStatus } from '~/serverUtils/dbTypes'
import { getTransactionByTxHash } from './getTransactionByTxHash'
import { getSigners } from './getSigners'
import { createMultisigAccount } from './createMultisigAccount'

export async function createMultisigTx(
  prisma: PrismaClient,
  txHash: string
): Promise<{ multisigTx: any; txId: number }> {
  try {
    const signers = await getSigners(prisma)
    const { id, info, signatures, status, sender } =
      await getTransactionByTxHash(prisma, txHash)

    if (status !== TransactionStatus.SIGNING) {
      throw new Error('Transaction is not in SIGNING status')
    }

    const { address: expectedMultisigAccountAddress, pubkey: multisigPubkey } =
      createMultisigAccount(signers)
    assert(
      expectedMultisigAccountAddress === sender,
      `Multisig account address does not match expected address: ${expectedMultisigAccountAddress}`
    )

    const multisigTx = makeMultisignedTx(
      multisigPubkey,
      info.sequence,
      info.fee,
      info.bodyBytes,
      new Map(
        signatures.map(sig => [
          sig.pubkey,
          encodeAminoPubkey(decodeBech32Pubkey(sig.signature)),
        ])
      )
    )

    return { multisigTx, txId: id }
  } catch (error) {
    console.error(error)
    throw new Error('Internal server error')
  }
}
