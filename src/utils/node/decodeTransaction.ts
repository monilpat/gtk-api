import { createRoot } from './createRoot'

export function decodeTransaction(transactionBytes: Uint8Array) {
  const transactionType = createRoot().lookupType('cosmos.tx.v1beta1.Tx')
  return transactionType.decode(transactionBytes)
}
