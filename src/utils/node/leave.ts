import { PrismaClient } from '@prisma/client'
import { getSigners } from './getSigners'
import { removeSigner } from './removeSigner'
import { updateProtocolAddresses } from './updateProtocolAddresses'

export async function leave(prisma: PrismaClient, address: string) {
  await removeSigner(prisma, address)
  const signers = await getSigners(prisma)
  await updateProtocolAddresses(prisma, signers)
}
