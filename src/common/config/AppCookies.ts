import Cookies from 'js-cookie'
import { NetworkEnv } from './getEnv'
import {
  COOKIE_NAME_CUSTOM_PRICE,
  COOKIE_NAME_SIF_ENV,
} from '@/utils/constants/constants'
import { ZeroOrOne } from '~/domains/core/envs'
export type CookieService = Pick<typeof Cookies, 'set' | 'get' | 'remove'>

/**
 * DSL for managing app cookies. Eventually any cookies set by the
 * app should be set here using App types.
 * @param service cookie service
 * @returns app cookie manager
 */
export function AppCookies(service: CookieService = Cookies) {
  return {
    getEnv() {
      return service.get(COOKIE_NAME_SIF_ENV) as NetworkEnv | undefined
    },
    setEnv(env: NetworkEnv) {
      service.set(COOKIE_NAME_SIF_ENV, env.toString())
    },
    clearEnv() {
      service.remove(COOKIE_NAME_SIF_ENV)
    },
    getCustomPricing() {
      return service.get(COOKIE_NAME_CUSTOM_PRICE) as ZeroOrOne | undefined
    },
    setCustomPricing(cp: ZeroOrOne) {
      service.set(COOKIE_NAME_CUSTOM_PRICE, cp.toString())
    },
    clearCustomPricing() {
      service.remove(COOKIE_NAME_CUSTOM_PRICE)
    },
  }
}
export type AppCookies = ReturnType<typeof AppCookies>
