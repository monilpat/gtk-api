import { PrismaClient } from '@prisma/client'
import { Transaction } from '~/serverUtils/dbTypes'
import { MULTISIG_THRESHOLD } from '../constants/constants'

export async function getTransactionByTxHash(
  prisma: PrismaClient,
  txHash: string
): Promise<Transaction> {
  try {
    const txs: Transaction[] = await prisma.$queryRaw`
      SELECT *
      FROM Transaction
      WHERE (
        SELECT COUNT(*)
        FROM Signature
        WHERE Signature.txId = Transaction.id
      ) < ${MULTISIG_THRESHOLD}
      AND Transaction.txHash = ${txHash}
      LIMIT 1
    `

    if (txs.length === 0) {
      throw new Error(
        `Transaction not found or already has ${MULTISIG_THRESHOLD} signatures`
      )
    }

    return txs[0]
  } catch (error) {
    console.error(error)
    throw new Error('Internal server error')
  }
}
