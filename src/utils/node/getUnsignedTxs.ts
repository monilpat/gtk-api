import { PrismaClient } from '@prisma/client'
import { Transaction, TransactionStatus } from '~/serverUtils/dbTypes'
import { MULTISIG_THRESHOLD } from '../constants/constants'

export async function getUnsignedTxs(prisma: PrismaClient) {
  try {
    const txs: Transaction[] = await prisma.$queryRaw`
      SELECT * FROM Transaction
      WHERE (
        SELECT COUNT(*) FROM Signature
        WHERE Signature.txId = Transaction.id
      ) < ${MULTISIG_THRESHOLD}
      AND Transaction.status = ${TransactionStatus.SIGNING}
      ORDER BY Transaction.createdAt ASC
    `

    if (txs.length === 0) {
      throw new Error(`Transaction not found`)
    }

    return txs
  } catch (error) {
    console.error(error)
    throw new Error('Internal server error')
  }
}
