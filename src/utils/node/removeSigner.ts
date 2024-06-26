import { PrismaClient } from '@prisma/client'

export async function removeSigner(prisma: PrismaClient, address: string) {
  try {
    await prisma.signer.delete({
      where: { address },
    })
  } catch {
    console.error('Signer does not exist')
  }
}
