import { Transaction, TransactionStatus } from '../../serverUtils/dbTypes'
import { validateAndProcessMessage } from '../../serverUtils/marginUtils'
import { prisma } from '../db'
import { calculateTransactionHash } from './calculateTransactionHash'
import { decodeTransaction } from './decodeTransaction'
import { Logger } from 'pino'

export async function processBlockTransactions(
  logger: Logger,
  transactions: readonly Uint8Array[],
  blockHeight: number
) {
  for (const transactionBytes of transactions) {
    logger.info(`Block Height: ${blockHeight}`)

    try {
      const transactionHash = calculateTransactionHash(transactionBytes)
      logger.info('Transaction Hash:', transactionHash)

      const decodedTransaction: any = await decodeTransaction(transactionBytes)
      const memo = JSON.parse(decodedTransaction.body.memo)

      let tx: Transaction | null = null

      try {
        tx = await prisma.transaction.create({
          data: {
            txHash: transactionHash,
            sender: '',
            info: memo,
            blockHeight,
            status: TransactionStatus.BROADCASTED,
          },
        })
      } catch (error) {
        logger.error('Transaction hash already exist in DB:', error)
      } finally {
        if (!tx) {
          throw new Error('Transaction not found')
        }

        await validateAndProcessMessage(
          tx.sender,
          '', // TODO: Add receiver address
          '', // TODO: Add token type
          '', // TODO: Add token amount
          memo,
          transactionHash,
          null,
          true
        )
      }
    } catch (error) {
      logger.error('Error occurred while processing block transactions:', error)
    }
  }
}
