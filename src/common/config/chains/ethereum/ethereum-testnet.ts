import { EthChainConfig } from '../../../entities'

export const ETHEREUM_TESTNET: EthChainConfig = {
  chainType: 'eth',
  chainId: 5, // Goerli
  network: 'ethereum',
  displayName: 'Ethereum',
  blockExplorerUrl: 'https://goerli.etherscan.io',
  blockExplorerApiUrl: 'https://api-goerli.etherscan.io',
  nativeAssetSymbol: 'eth',
}
