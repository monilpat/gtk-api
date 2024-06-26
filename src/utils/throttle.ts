import * as Sentry from '@sentry/node'
import { sleep } from './sleep'

export function throttle(fn: Function, delay: number) {
  let throttleTime = 0
  return async (...args: any[]) => {
    try {
      await fn(...args)
      throttleTime = 0
    } catch (error) {
      console.error(error)
      Sentry.captureException(error)
      throttleTime = throttleTime === 0 ? delay : throttleTime * 2
      throttleTime = Math.min(throttleTime, 60000) // Maximum throttle time is 1 minute
      const postErrorFeedback = `Failed, wait ${throttleTime}ms`
      console.error(postErrorFeedback)
      Sentry.captureException(postErrorFeedback)
    }
    await sleep(throttleTime)
  }
}
