import crypto from 'crypto'

export function calculateTransactionHash(transactionBytes: Uint8Array): string {
  const transactionBase64 = Buffer.from(transactionBytes as any, 'base64')
  const hash = crypto.createHash('sha256').update(transactionBase64).digest()
  return hash.toString('hex')
}
