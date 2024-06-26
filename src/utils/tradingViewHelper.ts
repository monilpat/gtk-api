import { IChartingLibraryWidget } from '../../public/static/charting_library'

class TradingViewHelper {
  tvWidget?: IChartingLibraryWidget | null = null

  setWidget(widget: IChartingLibraryWidget) {
    this.tvWidget = widget
  }

  removeWidget() {
    if (this.tvWidget !== null) {
      this.tvWidget?.remove()
      this.tvWidget = null
    }
  }

  getSymbolFromPair(pair: string) {
    // check markets here:
    // https://www.binance.us/markets
    switch (pair) {
      case 'btceth':
        return 'ETHBTC'
      case 'btcuusdc':
      case 'atombtc':
        return 'BTCUSDC'
      case 'btcusdt':
        return 'BTCUSDT'
      case 'ethusdt':
        return 'ETHUSDT'
      case 'ethuusdc':
      case 'atometh':
        return 'ETHUSDC'
      case 'uusdcusdt':
        return 'USDCUSDT'
      case 'ethicp':
      case 'icpuusdc':
      case 'icpusdt':
        return 'ICPUSDT'
      case 'atomuusdc':
      case 'atomusdt':
        return 'ATOMUSDT'
      case 'daieth':
      case 'daiuusdc':
      case 'daiusdt':
        return 'DAIUSD'
      case 'ethtrx':
      case 'trxuusdc':
      case 'trxusdt':
        return 'TRXUSDT'
      case 'bnbeth':
      case 'bnbusdt':
      case 'bnbuusdc':
      case 'atombnb':
        return 'BNBUSDT'
      case 'nearuusdc':
      case 'atomnear':
        return 'NEARUSDT'
      case 'soluusdc':
      case 'atomsol':
        return 'SOLUSDC'
      case 'linkuusdc':
      case 'atomlink':
        return 'LINKUSDT'
      case 'dogeuusdc':
      case 'atomdoge':
        return 'DOGEUSDT'
      case 'maticuusdc':
      case 'atommatic':
        return 'MATICUSDT'
      case 'filuusdc':
      case 'atomfil':
        return 'FILUSDT'
      case 'avaxuusdc':
      case 'atomavax':
        return 'AVAXUSDT'
      case 'suiuusdc':
      case 'atomsui':
        return 'SUIUSDT'
      case 'uusdcwld':
      case 'atomwld':
        return null
      case 'aptuusdc':
      case 'aptatom':
        return 'APTUSDT'
      case 'uusdcxrp':
      case 'atomxrp':
        return 'XRPUSDT'
      case 'crvuusdc':
      case 'atomcrv':
        return 'CRVUSDT'
      case 'opuusdc':
      case 'atomop':
        return 'OPUSDT'
      case 'adauusdc':
      case 'adaatom':
        return 'ADAUSDC'
      case 'arbuusdc':
      case 'arbatom':
        return 'ARBUSDT'
      case 'bchuusdc':
      case 'atombch':
        return 'BCHUSDT'
      case 'etcuusdc':
      case 'atometc':
        return null
      case 'seiuusdc':
      case 'atomsei':
        return null
      case 'dotuusdc':
      case 'atomdot':
        return 'DOTUSDT'
      case 'uniuusdc':
      case 'atomuni':
        return 'UNIUSDT'
      case 'fetuusdc':
      case 'atomfet':
        return 'FETUSDT'
      case 'shibuusdc':
      case 'atomshib':
        return 'SHIBUSDT'
      case 'ltcuusdc':
      case 'atomltc':
        return 'LTCUSDT'
      default:
        return null
    }
  }

  setSymbol(targetType: string, collateralType: string) {
    let pair = [targetType, collateralType].sort()

    let symbol = this.getSymbolFromPair(pair[0] + pair[1])

    if (symbol) {
      //window.tvWidget = this.tvWidget
      this.tvWidget?.activeChart().setSymbol(symbol)
    }
  }
}

const helper = new TradingViewHelper()

export default helper
