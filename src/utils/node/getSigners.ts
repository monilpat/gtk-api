import { PrismaClient } from '@prisma/client'

export async function getSigners(prisma: PrismaClient): Promise<string[]> {
  try {
    const signers = await prisma.signer.findMany()
    if (signers.length === 0) {
      throw new Error('No signers found')
    }
    const addresses = signers.map(signer => signer.address)
    return addresses
  } catch (error) {
    console.error(`Error retrieving signers:`, error)
    throw error
  }
}
