import {
  COOKIE_NAME_SIF_ENV,
  MAINNET_SIF_ENV,
  TESTNET_SIF_ENV,
  PROCESS,
} from '../utils/constants/constants'

export const cookie: { Cookie: string } = {
  Cookie: `${COOKIE_NAME_SIF_ENV}=${
    PROCESS.USE_TESTNET === 'true' ? TESTNET_SIF_ENV : MAINNET_SIF_ENV
  };`,
}
export function constructCookie(): { Cookie: string } | {} {
  return PROCESS.USE_COOKIE === 'true' ? cookie : {}
}
