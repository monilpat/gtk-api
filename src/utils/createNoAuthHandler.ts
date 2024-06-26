import type { NextApiRequest, NextApiResponse } from 'next'
import { wrapApiHandlerWithSentry } from '@sentry/nextjs'
import withCorsMiddleware from '@/lib/withCorsMiddleware'
import { ErrorObj } from '@/utils/constants/constants'

const createNoAuthHandler = <T>(
  path: string,
  innerFun: (
    req: NextApiRequest,
    res: NextApiResponse<T | ErrorObj>
  ) => Promise<void>
) => {
  const handler = async (
    req: NextApiRequest,
    res: NextApiResponse<T | ErrorObj>
  ) => {
    try {
      await innerFun(req, res)
    } catch (ex: any) {
      console.log(ex)
      res.status(500).json({
        error: ex?.message || 'Unknown error',
      })
    }
  }

  return wrapApiHandlerWithSentry(withCorsMiddleware(handler), path)
}

export default createNoAuthHandler
