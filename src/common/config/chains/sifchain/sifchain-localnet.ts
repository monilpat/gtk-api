import { IBCChainConfig } from '~/entities'

export const SIFCHAIN_LOCALNET: IBCChainConfig = {
  network: 'sifchain',
  chainType: 'ibc',
  displayName: 'Sifchain',
  blockExplorerUrl: 'https://www.mintscan.io/sifchain',
  nativeAssetSymbol: 'rowan',
  chainId: 'localnet',
  rpcUrl: 'http://0.0.0.0:26657',
  restUrl: 'http://0.0.0.0:1317',
  keplrChainInfo: {
    chainName: 'Sifchain Local',
    chainId: 'localnet',
    rpc: 'http://0.0.0.0:26657',
    rest: 'http://0.0.0.0:1317',
    stakeCurrency: {
      coinDenom: 'ROWAN',
      coinMinimalDenom: 'rowan',
      coinDecimals: 18,
    },
    bip44: {
      coinType: 118,
    },
    bech32Config: {
      bech32PrefixAccAddr: 'sif',
      bech32PrefixAccPub: 'sifpub',
      bech32PrefixValAddr: 'sifvaloper',
      bech32PrefixValPub: 'sifvaloperpub',
      bech32PrefixConsAddr: 'sifvalcons',
      bech32PrefixConsPub: 'sifvalconspub',
    },
    currencies: [
      {
        coinDenom: 'ROWAN',
        coinMinimalDenom: 'rowan',
        coinDecimals: 18,
      },
    ],
    feeCurrencies: [
      {
        coinDenom: 'ROWAN',
        coinMinimalDenom: 'rowan',
        coinDecimals: 18,
      },
    ],
    coinType: 118,
    gasPriceStep: {
      low: 5000000000000,
      average: 6500000000000,
      high: 8000000000000,
    },
    features: ['stargate', 'ibc-transfer'],
  },
}
