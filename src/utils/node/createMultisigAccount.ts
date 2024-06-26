import {
  createMultisigThresholdPubkey,
  MultisigThresholdPubkey,
} from '@cosmjs/amino'
import { decodeBech32Pubkey, pubkeyToAddress } from '@cosmjs/launchpad'
import { MULTISIG_THRESHOLD, PREFIX } from '../constants/constants'

export function createMultisigAccount(addresses: string[]): {
  pubkey: MultisigThresholdPubkey
  address: string
} {
  const pubkey = createMultisigThresholdPubkey(
    addresses.map(address => decodeBech32Pubkey(address)),
    MULTISIG_THRESHOLD
  )
  const address = pubkeyToAddress(pubkey, PREFIX)
  return { pubkey, address }
}
