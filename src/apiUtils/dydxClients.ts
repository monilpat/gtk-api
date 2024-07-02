import {
  Network,
  ValidatorClient,
  IndexerConfig,
  ValidatorConfig,
  DenomConfig,
  IndexerClient,
  CompositeClient,
  NobleClient,
} from "@dydxprotocol/v4-client-js";
import { DYDX_CONFIG } from "./constants";

export let validatorClient: ValidatorClient;
export let indexerClient: IndexerClient;
export let compositeClient: CompositeClient;
export let nobleClient: NobleClient;
export let clientEnv: "mainnet" | "testnet" | undefined;

export let initialized = false;
export const createClients = async (
  env: "mainnet" | "testnet" | undefined
): Promise<void> => {
  let validatorConfig: ValidatorConfig | null = null;
  let network: Network | null = null;
  let indexerConfig: IndexerConfig | null = null;
  let nobleClientInitialized = false;
  if (env === "testnet") {
    validatorConfig = Network.testnet().validatorConfig;
    network = Network.testnet();
    indexerConfig = Network.testnet().indexerConfig;
    try {
      nobleClient = new NobleClient(
        DYDX_CONFIG.testnet.nobleClient,
        "Noble example"
      );
      nobleClientInitialized = true;
    } catch (e: any) {
      console.log(`Failed to connect to noble client: ${e.message}`);
    }
    clientEnv = "testnet";
  } else {
    const denomConfig: DenomConfig = {
      USDC_DENOM: DYDX_CONFIG.general.usdcIbcHash,
      USDC_DECIMALS: 6,
      USDC_GAS_DENOM: "uusdc",
      CHAINTOKEN_DENOM: "adydx",
      CHAINTOKEN_DECIMALS: 18,
    };
    validatorConfig = new ValidatorConfig(
      // 'https://dydx-grpc.publicnode.com:443', // tried
      // 'https://dydx-mainnet-lcd.autostake.com:443', // also tried
      "https://dydx-ops-rpc.kingnodes.com", // one in docs
      DYDX_CONFIG.mainnetREST.chainId,
      denomConfig
    );
    indexerConfig = new IndexerConfig(
      // 'https://indexer.dydx.trade',
      // 'wss://indexer.dydx.trade'
      // 'https://indexer.dydx.trade/',
      // 'wss://indexer.dydx.trade/v4/ws',
      DYDX_CONFIG.mainnetREST.indexerRestEndpoint,
      DYDX_CONFIG.mainnetREST.indexerWsEndpoint
    );
    network = new Network("mainnet", indexerConfig, validatorConfig);
    clientEnv = "mainnet";
    try {
      nobleClient = new NobleClient(
        DYDX_CONFIG.mainnetREST.nobleClient,
        "noble transfer"
      );
      nobleClientInitialized = true;
    } catch (e: any) {
      console.log(`Failed to connect to noble client: ${e.message}`);
    }
  }
  // console.log('**Validator Config**')
  // console.log(validatorConfig)
  // console.log('**Indexer Config**')
  // console.log(indexerConfig)
  // console.log('**Network**')
  // console.log(network)
  // console.log('** Noble Client **')
  // console.log(nobleClient)
  let validatorClientInitialized = false;
  let indexerClientInitialized = false;
  let compositeClientInitialized = false;
  try {
    validatorClient = await ValidatorClient.connect(network.validatorConfig);
    // console.log('**Validator Client**')
    // console.log(validatorClient)
    validatorClientInitialized = true;
    initialized = true;
  } catch (e: any) {
    console.log(`Failed to connect to validator client: ${e.message}`);
  }
  try {
    indexerClient = new IndexerClient(network.indexerConfig);
    // console.log('**Indexer Client**')
    // console.log(indexerClient)
    indexerClientInitialized = true;
  } catch (e: any) {
    console.log(`Failed to connect to indexer client: ${e.message}`);
  }
  try {
    compositeClient = await CompositeClient.connect(network);
    // console.log('**Composite Client**')
    // console.log(compositeClient)
    compositeClientInitialized = true;
  } catch (e: any) {
    console.log(`Failed to connect to Composite client: ${e.stack}`);
  }
  initialized =
    validatorClientInitialized &&
    indexerClientInitialized &&
    compositeClientInitialized &&
    nobleClientInitialized;
};
