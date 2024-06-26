// https://nextjs.org/docs/pages/building-your-application/configuring/custom-server

import { createServer, IncomingMessage, ServerResponse } from 'http'
import { parse, UrlWithParsedQuery } from 'url'
import next from 'next'
import { iterateOverBlocks } from '@/utils/node/iterateOverBlocks'
import { throttle } from '@/utils/throttle'
import pino from 'pino'
import { ENABLE_DECENTRALIZED_MODE } from '@/utils/constants/constants'

const logger = pino({
  transport: {
    target: 'pino-pretty',
  },
})

if (!ENABLE_DECENTRALIZED_MODE) {
  logger.error('Decentralized mode is disabled')
  process.exit(0)
}

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME || 'localhost'
const port = parseInt(process.env.PORT || '3000', 10)

// when using middleware `hostname` and `port` must be provided below
const app = next({
  dev,
  hostname,
  port,
  dir: '.',
})
const handle = app.getRequestHandler()

// Run NextJS app
app.prepare().then(() => {
  createServer(async (req: IncomingMessage, res: ServerResponse) => {
    try {
      // Be sure to pass `true` as the second argument to `url.parse`.
      // This tells it to parse the query portion of the URL.
      const parsedUrl: UrlWithParsedQuery = parse(req.url!, true)
      const { pathname, query } = parsedUrl

      if (pathname === '/a') {
        await app.render(req, res, '/a', query)
      } else if (pathname === '/b') {
        await app.render(req, res, '/b', query)
      } else {
        await handle(req, res, parsedUrl)
      }
    } catch (err) {
      logger.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })
    .once('error', err => {
      logger.error(err)
      process.exit(1)
    })
    .listen(port, () => {
      logger.info(`> Ready on http://${hostname}:${port}`)
    })
})

// Run DB recontruction flow
async function invokeIterateOverBlocks() {
  const throttledIterateOverBlocks = throttle(
    () =>
      iterateOverBlocks(logger).then(() =>
        logger.info('Done iterating over blocks')
      ),
    1000
  )
  while (true) {
    await throttledIterateOverBlocks()
  }
}

invokeIterateOverBlocks()
