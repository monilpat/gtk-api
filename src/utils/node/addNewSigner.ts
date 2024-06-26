import { PrismaClient } from '@prisma/client'

export async function addNewSigner(prisma: PrismaClient, address: string) {
  try {
    await prisma.signer.create({
      data: {
        address: address,
      },
    })
  } catch {
    console.error('Signer already exists')
  }
}
