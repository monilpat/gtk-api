import { NextApiRequest, NextApiResponse } from 'next'
import { wrapApiHandlerWithSentry } from '@sentry/nextjs'
import { authenticate } from '~/middleware'
import withCorsMiddleware from '@/lib/withCorsMiddleware'
import { ErrorValueObj } from '@/utils/constants/constants'

const createMnemonicHandler = (path: string, mnemonic: string) => {
  const handler = (
    req: NextApiRequest,
    res: NextApiResponse<ErrorValueObj>
  ) => {
    authenticate(req, res, async () => {
      res.status(200).json({ value: mnemonic })
    })
  }

  return wrapApiHandlerWithSentry(withCorsMiddleware(handler), path)
}

export default createMnemonicHandler
