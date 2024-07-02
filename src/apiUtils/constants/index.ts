import { ChainConfig } from "@sifchain/sdk";

export type NetworkChainConfigLookup = Record<NetworkKind, ChainConfig>;

export type NetworkEnv = "localnet" | "testnet" | "mainnet";

export type KeplrChainConfig = {
  rest: string;
  rpc: string;
  chainId: string;
  chainName: string;
  stakeCurrency: {
    coinDenom: string;
    coinMinimalDenom: string;
    coinDecimals: number;
  };
  bip44: {
    coinType: number;
  };
  bech32Config: {
    bech32PrefixAccAddr: string;
    bech32PrefixAccPub: string;
    bech32PrefixValAddr: string;
    bech32PrefixValPub: string;
    bech32PrefixConsAddr: string;
    bech32PrefixConsPub: string;
  };
  currencies: {
    coinDenom: string;
    coinMinimalDenom: string;
    coinDecimals: number;
  }[];
  feeCurrencies: {
    coinDenom: string;
    coinMinimalDenom: string;
    coinDecimals: number;
  }[];
  coinType: number;
  gasPriceStep: {
    low: number;
    average: number;
    high: number;
  };
};

export type NetworkKind =
  | "sifchain"
  | "ethereum"
  // The rest... sort by name
  | "akash"
  | "band"
  | "bitsong"
  | "cerberus"
  | "chihuahua"
  | "comdex"
  | "cosmoshub"
  | "crypto-org"
  | "emoney"
  | "evmos"
  | "gravity"
  | "iris"
  | "ixo"
  | "juno"
  | "ki"
  | "likecoin"
  | "osmosis"
  | "persistence"
  | "regen"
  | "starname"
  | "sentinel"
  | "stargaze"
  | "secret"
  | "terra";

export type IAsset = {
  address?: string;
  decimals: number;
  imageUrl?: string;
  name: string;
  network: NetworkKind;
  symbol: string;
  unitDenom?: string;
  denom?: string;
  displaySymbol: string;
  lowercasePrefixLength?: number;
  label?: string;
  hasDarkIcon?: boolean;
  homeNetwork: NetworkKind;
  decommissioned?: boolean;
  decommissionReason?: string;
};
type AssetTag = `${NetworkKind}.${NetworkEnv}`;

type EnvProfileConfig = {
  kind: NetworkEnv;
  ethAssetTag: AssetTag;
  sifAssetTag: AssetTag;
  cosmoshubAssetTag: AssetTag;
};
export const PROFILE_LOOKUP: Record<NetworkEnv, EnvProfileConfig> = {
  mainnet: {
    kind: "mainnet",
    ethAssetTag: "ethereum.mainnet",
    sifAssetTag: "sifchain.mainnet",
    cosmoshubAssetTag: "cosmoshub.mainnet",
  },
  testnet: {
    kind: "testnet",
    ethAssetTag: "ethereum.testnet",
    sifAssetTag: "sifchain.testnet",
    cosmoshubAssetTag: "cosmoshub.testnet",
  },
  localnet: {
    kind: "localnet",
    ethAssetTag: "ethereum.localnet",
    sifAssetTag: "sifchain.localnet",
    cosmoshubAssetTag: "cosmoshub.testnet",
  },
} as const;
export type SdkConfig =
  | {
      peggyCompatibleCosmosBaseDenoms: Set<string>;
      chains: never[];
      chainConfigsByNetwork: NetworkChainConfigLookup;
      sifAddrPrefix: string;
      sifApiUrl: string;
      sifRpcUrl: string;
      sifChainId: string;
      vanirUrl: string;
      registryUrl: string;
      blockExplorerUrl: string;
      assets: IAsset[];
      nativeAsset: IAsset;
      bridgebankContractAddress: string | undefined;
      bridgetokenContractAddress: string | undefined;
      keplrChainConfig: KeplrChainConfig;
    }
  | undefined;
