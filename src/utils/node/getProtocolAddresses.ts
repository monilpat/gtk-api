import { PrismaClient } from '@prisma/client'

export async function getProtocolAddresses(
  prisma: PrismaClient
): Promise<{ [key: string]: string }> {
  try {
    const protocolAddresses = await prisma.protocolAddress.findMany()
    if (protocolAddresses.length === 0) {
      throw new Error('No protocol address found')
    }
    return protocolAddresses.reduce(
      (acc, { protocol, address }) => ({ ...acc, [protocol]: address }),
      {}
    )
  } catch (error) {
    console.error(`Error retrieving signers:`, error)
    throw error
  }
}
