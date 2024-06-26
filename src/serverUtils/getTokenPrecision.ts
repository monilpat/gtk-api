import { constructCookie } from './constructCookie'

import { DOMAIN, TOKEN_PRECISION_MAP } from '../utils/constants/constants'
import { fetchWithRetries } from './serverUtils'

interface PrecisionResponse {
  hasError: boolean
  errorMessage: string
  precision: number
}

const getTokenPrecision = async (
  tokenType: string
): Promise<PrecisionResponse> => {
  // for now to speed things up we will only call the type if its unknown precision
  // todo - get rid of using TOKEN_PRECISION_MAP and only use get_token_precision api call response
  if (TOKEN_PRECISION_MAP[tokenType] != null) {
    return {
      hasError: false,
      errorMessage: '',
      precision: TOKEN_PRECISION_MAP[tokenType],
    }
  }

  let resp
  try {
    resp = await fetchWithRetries(
      DOMAIN + `/api/data/common/get_token_precision?tokenType=${tokenType}`,
      {
        headers: {
          ...constructCookie(),
        },
      }
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'An unknown error occurred'
    return {
      hasError: true,
      errorMessage: 'Network error: ' + message,
      precision: 0,
    }
  }

  if (!resp!.ok) {
    return {
      hasError: true,
      errorMessage: `HTTP error: status code ${resp!.status}`,
      precision: 0,
    }
  }

  let data
  try {
    data = await resp!.json()
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'An unknown error occurred'
    return {
      hasError: true,
      errorMessage: 'Error parsing JSON: ' + message,
      precision: 0,
    }
  }

  if (data.error) {
    return {
      hasError: true,
      errorMessage: data.error,
      precision: 0,
    }
  }

  return {
    hasError: false,
    errorMessage: '',
    precision: data,
  }
}

export default getTokenPrecision
