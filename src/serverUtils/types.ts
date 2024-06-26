export type IAsset = {
  address?: string
  decimals: number
  imageUrl?: string
  name: string
  network: NetworkKind
  symbol: string
  unitDenom?: string
  denom?: string
  displaySymbol: string
  lowercasePrefixLength?: number
  label?: string
  hasDarkIcon?: boolean
  homeNetwork: NetworkKind
  decommissioned?: boolean
  decommissionReason?: string
}
type BaseAssetConfig = {
  name: string
  symbol: string
  displaySymbol: string
  decimals: number
  label?: string
  imageUrl?: string
  network: NetworkKind
  homeNetwork: NetworkKind
}
type TokenConfig = BaseAssetConfig & {
  address: string
}
type CoinConfig = BaseAssetConfig

export type AssetConfig = CoinConfig | TokenConfig

export type NetworkKind =
  | 'sifchain'
  | 'ethereum'
  // The rest... sort by name
  | 'akash'
  | 'band'
  | 'bitsong'
  | 'cerberus'
  | 'chihuahua'
  | 'comdex'
  | 'cosmoshub'
  | 'crypto-org'
  | 'emoney'
  | 'evmos'
  | 'gravity'
  | 'iris'
  | 'ixo'
  | 'juno'
  | 'ki'
  | 'likecoin'
  | 'osmosis'
  | 'persistence'
  | 'regen'
  | 'starname'
  | 'sentinel'
  | 'stargaze'
  | 'secret'
  | 'terra'

export type NetworkEnv = 'localnet' | 'testnet' | 'mainnet'
