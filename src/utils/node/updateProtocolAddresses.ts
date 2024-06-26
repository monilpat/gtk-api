import { PrismaClient } from '@prisma/client'
import { createMultisigAccount } from './createMultisigAccount'
import { getProtocolAddresses } from './getProtocolAddresses'

export async function updateProtocolAddresses(
  prisma: PrismaClient,
  signers: string[]
) {
  const protocolAddresses = await getProtocolAddresses(prisma)
  for (let [protocol, address] of Object.entries(protocolAddresses)) {
    const { address: multisigAccountAddress } = createMultisigAccount(signers)
    await prisma.protocolAddress.update({
      where: { protocol },
      data: { address: multisigAccountAddress },
    })
  }
}
