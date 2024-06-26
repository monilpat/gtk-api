import { TxRaw } from 'cosmjs-types/cosmos/tx/v1beta1/tx'
import { DeliverTxResponse, StargateClient } from '@cosmjs/stargate'
import { PrismaClient } from '@prisma/client'
import { RPC_URL } from '@/utils/constants/constants'
import { SdkConfig } from '~/domains/core/envs'
import { TransactionStatus } from '~/serverUtils/dbTypes'

export async function broadcastMultisignedTx(
  prisma: PrismaClient,
  envConfig: SdkConfig,
  multisigTx: TxRaw,
  txId: number
): Promise<DeliverTxResponse> {
  try {
    const rpcUrl = envConfig?.sifRpcUrl ?? RPC_URL

    const broadcaster = await StargateClient.connect(rpcUrl)
    const result = await broadcaster.broadcastTx(
      Uint8Array.from(TxRaw.encode(multisigTx).finish())
    )

    // Update transaction status based on broadcast result
    const status = result.code
      ? TransactionStatus.FAILED
      : TransactionStatus.BROADCASTED
    await prisma.transaction.update({
      where: { id: txId },
      data: { status: status },
    })

    return result
  } catch (error) {
    console.error(error)
    throw new Error('Internal server error')
  }
}
