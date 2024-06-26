import { CoinListOrder } from '../utils/constants/constants'

export const getOrderValue = (order: string): CoinListOrder => {
  switch (order) {
    case CoinListOrder.MARKET_CAP_DESC:
      return CoinListOrder.MARKET_CAP_DESC
    case CoinListOrder.GECKO_DESC:
      return CoinListOrder.GECKO_DESC
    case CoinListOrder.GECKO_ASC:
      return CoinListOrder.GECKO_ASC
    case CoinListOrder.MARKET_CAP_ASC:
      return CoinListOrder.MARKET_CAP_ASC
    case CoinListOrder.MARKET_CAT_DESC:
      return CoinListOrder.MARKET_CAT_DESC
    case CoinListOrder.VOLUME_ASC:
      return CoinListOrder.VOLUME_ASC
    case CoinListOrder.VOLUME_DESC:
      return CoinListOrder.VOLUME_DESC
    case CoinListOrder.ID_ASC:
      return CoinListOrder.ID_ASC
    case CoinListOrder.ID_DESC:
      return CoinListOrder.ID_DESC
    default:
      return CoinListOrder.MARKET_CAP_DESC
  }
}
