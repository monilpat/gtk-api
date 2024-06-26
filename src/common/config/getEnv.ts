import { NetworkKind } from '../entities'
import { AppCookies } from './AppCookies'

export type NetworkEnv = 'localnet' | 'testnet' | 'mainnet'

export const NETWORK_ENVS: Set<NetworkEnv> = new Set<NetworkEnv>([
  'localnet',
  'testnet',
  'mainnet',
])

type AssetTag = `${NetworkKind}.${NetworkEnv}`

type EnvProfileConfig = {
  kind: NetworkEnv
  ethAssetTag: AssetTag
  sifAssetTag: AssetTag
  cosmoshubAssetTag: AssetTag
}

export const PROFILE_LOOKUP: Record<NetworkEnv, EnvProfileConfig> = {
  mainnet: {
    kind: 'mainnet',
    ethAssetTag: 'ethereum.mainnet',
    sifAssetTag: 'sifchain.mainnet',
    cosmoshubAssetTag: 'cosmoshub.mainnet',
  },
  testnet: {
    kind: 'testnet',
    ethAssetTag: 'ethereum.testnet',
    sifAssetTag: 'sifchain.testnet',
    cosmoshubAssetTag: 'cosmoshub.testnet',
  },
  localnet: {
    kind: 'localnet',
    ethAssetTag: 'ethereum.localnet',
    sifAssetTag: 'sifchain.localnet',
    cosmoshubAssetTag: 'cosmoshub.testnet',
  },
} as const

export type HostConfig = {
  pattern: RegExp
  networkEnv: NetworkEnv
}

// Here we list hostnames that have default env settings
const hostDefaultEnvs: HostConfig[] = [
  { pattern: /gtk-margin\.com$/, networkEnv: 'mainnet' },
  { pattern: /financial-messaging\.vercel\.app$/, networkEnv: 'mainnet' },
  { pattern: /testnet\.sifchain\.finance$/, networkEnv: 'testnet' },
  { pattern: /sifchain\.vercel\.app$/, networkEnv: 'testnet' },
  { pattern: /localhost$/, networkEnv: 'testnet' },
]

export function getNetworkEnv(hostname: string) {
  for (const { pattern, networkEnv: net } of hostDefaultEnvs) {
    if (pattern.test(hostname)) {
      return net
    }
  }
  return null
}

export function isNetworkEnvSymbol(a: any): a is NetworkEnv {
  return NETWORK_ENVS.has(a)
}

type GetEnvArgs = {
  location: { hostname: string }
  cookies?: Pick<AppCookies, 'getEnv'>
}

export function setEnvCookie(env: NetworkEnv) {
  AppCookies().setEnv(env)
}

export function getEnv() {
  const sifEnv = getNetworkName()

  if (sifEnv != null && PROFILE_LOOKUP[sifEnv]) {
    return PROFILE_LOOKUP[sifEnv]
  }

  console.error(
    new Error(`Cannot render environment ${sifEnv} ${AppCookies().getEnv()}`)
  )

  return PROFILE_LOOKUP['mainnet']
}
export function getNetworkName(): NetworkEnv | null {
  const hostname = window ? window.location.hostname : undefined
  const cookieEnv = AppCookies().getEnv()

  const sifEnv = isNetworkEnvSymbol(cookieEnv)
    ? cookieEnv
    : getNetworkEnv(hostname!)
  return sifEnv
}
