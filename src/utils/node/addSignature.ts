import { PrismaClient } from '@prisma/client'
import { TransactionStatus } from '~/serverUtils/dbTypes'
import { MULTISIG_THRESHOLD } from '../constants/constants'

export async function addSignature(
  prisma: PrismaClient,
  txHash: string,
  pubkey: string,
  signature: string
): Promise<void> {
  try {
    const txs = await prisma.transaction.findMany({
      where: {
        txHash: txHash,
        signatures: {
          some: {
            pubkey: {
              equals: pubkey,
            },
          },
        },
      },
    })

    if (txs[0].status !== TransactionStatus.SIGNING) {
      throw new Error('Transaction is not in SIGNING status')
    }

    if (txs.length === 0) {
      throw new Error(
        `Transaction not found or already has ${MULTISIG_THRESHOLD} signatures`
      )
    }

    const existingSigs = await prisma.signature.findMany({
      where: {
        txId: txs[0].id,
        pubkey: pubkey,
      },
    })

    if (existingSigs.length > 0) {
      throw new Error('Signature already exists for transaction')
    }

    const updatedSignatures = [
      ...existingSigs,
      { pubkey: pubkey, signature: signature },
    ]

    await prisma.transaction.update({
      where: { id: txs[0].id },
      data: {
        signatures: { set: updatedSignatures as any },
      },
    })
  } catch (error) {
    console.error(error)
    throw new Error('Internal server error')
  }
}
