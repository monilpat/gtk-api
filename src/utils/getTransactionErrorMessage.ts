import { DeliverTxResponse } from '@sifchain/sdk'

const getTransactionErrorMessage = (
  txResult: DeliverTxResponse | null | undefined
): string => {
  if (txResult == null) {
    return 'Unknown error'
  } else if (txResult.code === 5) {
    return 'Insufficient funds'
  } else {
    return txResult.rawLog || 'Unknown Error'
  }
}

export default getTransactionErrorMessage
