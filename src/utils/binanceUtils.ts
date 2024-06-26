const Binance = {
  api: (symbol: string, interval: string, from?: number, to?: number) => {
    const params = {
      symbol,
      interval,
    }
    const urlSearchParam = new URLSearchParams(params)
    from && urlSearchParam.append('startTime', (from * 1000).toString())
    to && urlSearchParam.append('endTime', (to * 1000).toString())
    return `https://api.binance.us/api/v3/klines?${urlSearchParam.toString()}`
  },
  streamApi: `wss://stream.binance.us:9443/ws`,
  formatInterval: (interval: string) => {
    if (Number(interval) <= 30) {
      return interval + 'm'
    } else if (60 <= Number(interval) && Number(interval) <= 720) {
      return (Number(interval) / 60).toString() + 'h'
    } else {
      return interval.toLowerCase()
    }
  },
}

export default Binance

export type BinanceHistoryResponse = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  number,
  string,
  string,
  string
]
