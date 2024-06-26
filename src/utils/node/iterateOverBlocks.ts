import { Tendermint34Client } from '@cosmjs/tendermint-rpc'
import { RPC_URL, SAVE_LAST_BLOCK_EPOCH } from '../constants/constants'
import { processBlockTransactions } from './processBlockTransactions'
import { prisma } from '../db'
import { Logger } from 'pino'

export async function iterateOverBlocks(
  logger: Logger,
  startBlock: number = 1
) {
  const info = await prisma.blockchain.findFirst()

  if (info == null) {
    logger.info('No blockchain info available')
  }

  const tmClient = await Tendermint34Client.connect(RPC_URL)
  let height =
    info && info.lastBlockHeight ? info.lastBlockHeight + 1 : startBlock

  while (true) {
    let blockRes

    try {
      blockRes = await tmClient.block(height)
    } catch {
      throw new Error(`Reached latest block height: ${height - 1}`)
    }

    await processBlockTransactions(logger, blockRes.block.txs, height)

    if (height % SAVE_LAST_BLOCK_EPOCH === 0) {
      await prisma.blockchain.upsert({
        where: { id: 1 },
        create: {
          id: 1,
          lastBlockHeight: height,
        },
        update: {
          lastBlockHeight: height,
        },
      })
      logger.info(`Saved last block height: ${height}`)
    }

    height++
  }
}
