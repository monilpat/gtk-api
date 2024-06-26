import { PrismaClient } from '@prisma/client'
import { addNewSigner } from './addNewSigner'
import { getSigners } from './getSigners'
import { updateProtocolAddresses } from './updateProtocolAddresses'

export async function join(prisma: PrismaClient, address: string) {
  await addNewSigner(prisma, address)
  const signers = await getSigners(prisma)
  await updateProtocolAddresses(prisma, signers)
}
