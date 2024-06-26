import { NextApiRequest } from 'next'
import { NetworkEnv } from '~/common'
import { COOKIE_NAME_SIF_ENV } from '@/utils/constants/constants'
import { getEnvConfig } from '~/utils/clientUtils'

export async function getConfigFromEnv(req: NextApiRequest) {
  const sifEnv = req.cookies[COOKIE_NAME_SIF_ENV] as NetworkEnv | undefined

  return await getEnvConfig({ environment: sifEnv! })
}
