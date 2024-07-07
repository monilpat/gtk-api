export const FIAT_PRECISION = 2;
export const FIAT_INPUT_PRECISION = 6;
export const DEFAULT_TOKEN_PRECISION = 6;
export const MAX_TOKEN_PRECISION = 10;

export type Transaction = {
  id: number;
  txn_hash: string;
  sender_address: string;
  receiver_address: string;
  token_type: string;
  token_amount: string;
  memo: string;
  time: string;
  is_processed: boolean;
};

export enum fiatFormatType {
  LONG,
  SMALL,
}

export type protocolSpecificTransactionType =
  | "collect_interest"
  | "disperse_interest"
  | "request_interest"
  | "execute_trade"
  | "execute_match"
  | "close_match"
  | "collect_entrance_fee"
  | "processing_error"
  | "open_hedge_trade"
  | "close_hedge_trade"
  | "disperse_entrance_fee"
  | "transfer_to_hedge";

export type endUserTransactionType =
  | "open_trade"
  | "close_trade"
  | "update_trade_request"
  | "cancel_trade_request"
  | "deposit_match"
  | "withdraw_match"
  | "get_trade_status"
  | "request_close_trade";

export type transactionType =
  | endUserTransactionType
  | protocolSpecificTransactionType;

export type Memo = {
  transaction_type: transactionType;
  data?: {
    trade_id?: string | null;
    target_token_type?: string | null;
    trade_direction?: string | null;
    match_id?: string | null;
    collateral_token_type?: string | null;
    collateral_token_amount?: string | null;
    trade_status?: string | null;
    expiration_date?: string | null;
    leverage_quantity?: string | null;
    stop_loss?: string | null;
    take_profit?: string | null;
    interest_rate?: string | null;
    limit_price?: string | null;
    close_trade_time?: string | null;
    details?: string | null;
    auto_hedged?: string | null;
    hedge_trade_id?: string | null;
  };
};

export const PRICES_LIST_RELOAD_INTERVAL = 30000;
export const MAINTENANCE_MARGIN = 0.1;
export const TRADE_RELOAD_INTERVAL = 60000;
export const PRICE_RELOAD_INTERVAL = 300000;
export const NOTIF_RELOAD_INTERVAL = 20000;
export const ANALYTICS_RELOAD = 10000000;
export const SLIPPAGE_TOLERANCE = 0.01;
export const MINIMUM_TRADE_DURATION = 15 * 60 * 1000; // 15 minutes
export enum StatusBadgeColor {
  ACTIVE = "green",
  PENDING = "yellow",
  CANCELLED = "red",
  COMPLETED = "blue",
}
export const COOKIE_NAME_SIF_ENV = "sif_dex_env";
export const COOKIE_NAME_CUSTOM_PRICE = "sif_custom_price";
export const MAINNET_SIF_ENV = "mainnet";
export const TESTNET_SIF_ENV = "testnet";

export const PROCESS = {
  SENTRY_DSN:
    "https://e2017c5ce61744b99e0559f3e86e55e2@o4504771149365248.ingest.sentry.io/4504773806129152",
  SENTRY_ENVIRONMENT: "dev",
  SENTRY_ENABLED: false,
  // addresses
  PENDING_TRADE_ADDRESS: "sif1f2q2h0wr2dpcuxurswq549m6n20kgparcxtvv3",
  MATCH_VAULT_ADDRESS: "sif1ucln8227sygnwp32w4egs4lyqyenutx736tcw8",
  LIVE_TRADE_ADDRESS: "sif14d4zjh98kvu36nhxadp8rx4l4gteee5d0c5czp",
  INTEREST_ADDRESS: "sif1x4l7u9ns0khz3w5m6d55sdjw5yvfnuaykq7nql",
  ENTRANCE_FEE_ADDRESS: "sif1rxa79l2xk4ux0lvkle6jmymsmqu7480vy0a4mj",
  UBI_ADDRESS: "sif1075h54mu6a43n0fqk4uxsrg95dnkpzyktjzldd",
  REWARDS_ADDRESS: "sif1sjx3cqhhje965n8p03yhxppkcjplqdgx8ge46c",
  HEDGE_ADDRESS: "sif18ghjelptqag7qe8ae06y3608ddsqpf0d39alw3",
  HEDGE_NOBLE_ADDRESS: "noble18ghjelptqag7qe8ae06y3608ddsqpf0dum8pe5",
  HEDGE_DYDX_ADDRESS: "dydx18ghjelptqag7qe8ae06y3608ddsqpf0dapudpd",
  USE_COOKIE: "true",
  RUN_LOCALLY: "false",
  USE_TESTNET: "false",
};

export const ENV =
  PROCESS.USE_TESTNET === "true" ? TESTNET_SIF_ENV : MAINNET_SIF_ENV;

export const URL =
  PROCESS.RUN_LOCALLY === "true"
    ? "http://localhost:3000"
    : "https://gtk-margin.com";

export const DOMAIN = PROCESS.USE_COOKIE === "true" ? URL : "";
export const REGISTRY_URL = "https://registry.sifchain.network";

export type InterestByTokenType = {
  tokenType: string;
  pendingInterest: string;
};

export enum CoinListOrder {
  MARKET_CAP_DESC = "market_cap_desc",
  GECKO_DESC = "gecko_desc",
  GECKO_ASC = "gecko_asc",
  MARKET_CAP_ASC = "market_cap_asc",
  MARKET_CAT_DESC = "market_cap_desc",
  VOLUME_ASC = "volume_asc",
  VOLUME_DESC = "volume_desc",
  ID_ASC = "id_asc",
  ID_DESC = "id_desc",
}

export const TRADER_APY = 0.1;
export const BLOCK_TIME = 6;
export const COMPOUNDING_PERIOD_LENGTH = BLOCK_TIME;
export const DEFAULT_TIMEOUT = BLOCK_TIME;
export const TOTAL_SECONDS_IN_YEAR = 31536000;
export const COMPOUNDING_PERIODS =
  TOTAL_SECONDS_IN_YEAR / COMPOUNDING_PERIOD_LENGTH;
export const ENTRANCE_FEE_PERCENTAGE = 0.001;
export const CLOSE_TRADE_WINDOW = 7;
export const TRADES_RATE_LIMIT = 20;

export const CUSTOM_PRICE_LIST_FILE = "./custom-prices.json";

export type ReportingResults = {
  total: string;
  week: string;
  day: string;
};

export type ReportingResultsByDirection = {
  long: TokenResults;
  short: TokenResults;
};

export type TokenResult = {
  k: string;
  v: string;
};

export type TokenResults = Array<TokenResult>;

export type ReportingByTokenResults = {
  total: TokenResults;
  week: TokenResults;
  day: TokenResults;
};
export type ReportingMetricResults = {
  total: number;
  week: number;
  day: number;
};

export type LineGraphResult = {
  name: string;
  pv: number;
  amt: number;
};

export interface ErrorObj {
  error: string;
}

export const TOKEN_RESULTS: TokenResults = [
  {
    k: "uusdc",
    v: "0",
  },
];

export const DEFAULT_REPORTING_RESULTS_BY_DIRECTION: ReportingResultsByDirection =
  {
    long: TOKEN_RESULTS,
    short: TOKEN_RESULTS,
  };

export const DEFAULT_REPORTING_RESULTS: ReportingResults = {
  total: "0",
  week: "0",
  day: "0",
};

export const DEFAULT_TOKEN_RESULTS: ReportingByTokenResults = {
  total: TOKEN_RESULTS,
  week: TOKEN_RESULTS,
  day: TOKEN_RESULTS,
};

export const DEFAULT_METRIC_RESULTS: ReportingMetricResults = {
  total: 0,
  week: 0,
  day: 0,
};

export const DEFAULT_TOKEN_RESULTS_SIMPLE = {
  total: null,
  week: null,
  day: null,
};

export type TOKEN_RESULTS_SIMPLE = {
  total: string | null;
  week: string | null;
  day: string | null;
};
export interface ValueObj {
  value: string;
}

export type ErrorValueObj = ErrorObj | ValueObj;

export const TXN_ERR_MESSAGE =
  "ERROR: Insufficient funds, gas, fee, or sequence # mismatch so protocol errors that should be reprocessed";

// We need to allow for scaling up or down the max profit based off how available lending liquidity is available
export const MATCHER_MULTIPLIER = 1;

export const MAX_PROFIT_MULTIPLIER = MATCHER_MULTIPLIER + 1;

export const LIMIT_FEE = ".01";

export const DYDX_FAST_WITHDRAWAL_GAS_PERCENTAGE = 0.02;

export const ETH_GAS_LIMIT = 150000;

export const MINIMUM_POSITION_AMOUNT = 100;

export const WORST_PRICE_MARGIN_PERCENTAGE = 0.02;

export const ETH_CHAIN_ID = PROCESS.USE_TESTNET == "true" ? 5 : 1;

export const ETH_CONTRACT_TOKEN_ADDRESS =
  "0xBe9895146f7AF43049ca1c1AE358B0541Ea49704";

export const ETH_TOKEN_ADDRESS = "0x0000000000000000000000000000000000000000";

export const DYDX_DEPOSIT_CONTRACT_ADDRESS =
  "0x8e8bd01b5A9eb272CC3892a2E40E64A716aa2A40";
export const DEFAULT_MAINNET_BRIDGEBANK_CONTRACT_ADDRESS =
  "0x0A7f48AF978A29B63F45e17095E3A6475bBAe1bB";

export const RPC_URL = process.env.RPC_URL || "http://localhost:26657";
export const PREFIX = process.env.PREFIX || "sif";
export const DENOM = process.env.DENOM || "rowan";
export const MULTISIG_THRESHOLD = 2;
export const SAVE_LAST_BLOCK_EPOCH = 500;
export const ENABLE_DECENTRALIZED_MODE =
  process.env.ENABLE_DECENTRALIZED_MODE === "true" || false;

export const ETH_MAINNET_USDC_TOKEN_CONTRACT =
  "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

export const ETH_GOERLI_USDC_TOKEN_CONTRACT =
  "0xD87Ba7A50B2E7E660f678A895E4B72E7CB4CCd9C";

// every hour
export const DEPOSIT_FREQUENCY = 3600000;

export const MINIMUM_PROTOCOL_ADDRESS_USDC_AMOUNT = 1;
export const GAS_MARGIN_AMOUNT = 0.05;
export const MINIMUM_HEDGE_AMOUNT = 1;

export const MINIMUM_USDC_AMOUNT = 0.000001;
export const HOURS_IN_YEAR = 8760;
export const DEFAULT_TRANSACTION_TOKEN_DENOM = "rowan";
export const DEFAULT_TRANSACTION_FEE = 375000000000000000;

// Update here to change the split
export const REWARDS_PERCENTAGE = 20.0;
export const UBI_PERCENTAGE = 10.0;
export const MATCHER_PERCENTAGE = 70.0;
export const HEDGE_LIQUIDITY_MULTIPLIER = 5;

export const DYDX_MAINNET_CHAIN_ID = "dydx-mainnet-1";
export const NATIVE_TOKEN_DENOM = "adydx";

// configs tested
export const DYDX_CONFIG = {
  testnet: {
    validatorGrpcEndpoint: "test-dydx-grpc.kingnodes.com:443",
    aerialConfigUrl: "https://test-dydx-grpc.kingnodes.com:443",
    aerialGrpcOrRestPrefix: "grpc",
    indexerRestEndpoint: "https://dydx-testnet.imperator.co",
    indexerWsEndpoint: "wss://indexer.v4testnet.dydx.exchange/v4/ws",
    chainId: "dydx-testnet-4",
    env: "testnet",
    nobleClient: "https://rpc.testnet.noble.strange.love",
  },
  mainnetGRPC: {
    validatorGrpcEndpoint: "dydx-grpc.publicnode.com:443",
    aerialConfigUrl: "https://dydx-grpc.publicnode.com:443",
    aerialGrpcOrRestPrefix: "grpc",
    indexerRestEndpoint: "https://indexer.dydx.trade/",
    indexerWsEndpoint: "wss://indexer.dydx.trade/v4/ws",
    chainId: "dydx-mainnet-1",
    env: "mainnet",
    nobleClient: "https://noble-rpc.polkachu.com",
  },
  mainnetREST: {
    validatorGrpcEndpoint: "dydx-grpc.publicnode.com:443",
    aerialConfigUrl: "https://dydx-mainnet-lcd.autostake.com:443",
    aerialGrpcOrRestPrefix: "rest",
    indexerRestEndpoint: "https://indexer.dydx.trade/",
    indexerWsEndpoint: "wss://indexer.dydx.trade/v4/ws",
    chainId: "dydx-mainnet-1",
    env: "mainnet",
    nobleClient: "https://noble-rpc.polkachu.com",
  },
  general: {
    usdcIbcHash:
      "ibc/8E27BA2D5493AF5636760E354E46004562C46AB7EC0CC4C1CA14E9E20E2545B5",
    sourcePort: "transfer",
    sourceChannelDYDXToNoble: "channel-0",
    sourceChannelNobleToDYDX: "channel-33",
    sourceChannelNobleToSifchain: "channel-40",
  },
};

export const DEFAULT_GTT = 120;
export const LIMIT_GTT = 2419000; // 28 days in seconds
export const GOOD_TIL_BLOCK_BUFFER = 10;
export const DEFAULT_RETRIES = 3;
export const DEFAULT_RETRY_DELAY = 1000;
export const DYDX_RETRIES = 15;
// 1 block
export const DYDX_RETRY_DELAY = 6000;

export const hedgeInterestMultiplier = 1.35;

export const DYDX_SLIPPAGE = 0.005;

export type historicalFunding = {
  ticker: "string";
  rate: "string";
  price: "string";
  effectiveAt: "string";
  effectiveAtHeight: "string";
};
// Enabled collateral tokens
export const ENABLED_COLLATERAL_TOKENS = [
  // 'usdc',
  // 'usdt',
  // 'eth',
  ENV == MAINNET_SIF_ENV ? "atom" : "rowan",
  // 'dai',
  // 'wbtc',
  // 'susd',
  // 'frax',
  // 'axlusdc',
  "uusdc",
];
export enum DydxAsset {
  USDC = "USDC",
  BTC = "BTC",
  ETH = "ETH",
  LINK = "LINK",
  AAVE = "AAVE",
  UNI = "UNI",
  SUSHI = "SUSHI",
  SOL = "SOL",
  YFI = "YFI",
  ONEINCH = "1INCH",
  AVAX = "AVAX",
  SNX = "SNX",
  CRV = "CRV",
  UMA = "UMA",
  DOT = "DOT",
  DOGE = "DOGE",
  MATIC = "MATIC",
  MKR = "MKR",
  FIL = "FIL",
  ADA = "ADA",
  ATOM = "ATOM",
  COMP = "COMP",
  BCH = "BCH",
  LTC = "LTC",
  EOS = "EOS",
  ALGO = "ALGO",
  ZRX = "ZRX",
  XMR = "XMR",
  ZEC = "ZEC",
  ENJ = "ENJ",
  ETC = "ETC",
  XLM = "XLM",
  TRX = "TRX",
  XTZ = "XTZ",
  HNT = "HNT",
  ICP = "ICP",
  RUNE = "RUNE",
  LUNA = "LUNA",
  NEAR = "NEAR",
  AR = "AR",
  FLOW = "FLOW",
  PERP = "PERP",
  REN = "REN",
  CELO = "CELO",
  KSM = "KSM",
  BAL = "BAL",
  BNT = "BNT",
  MIR = "MIR",
  SRM = "SRM",
  LON = "LON",
  DODO = "DODO",
  ALPHA = "ALPHA",
  WNXM = "WNXM",
  XCH = "XCH",
  SUI = "SUI",
  WLD = "WLD",
  APT = "APT",
  XRP = "XRP",
  OP = "OP",
  SEI = "SEI",
  FET = "FET",
  SHIB = "SHIB",
  BNB = "BNB",
}
export enum DydxMarket {
  BTC_USD = "BTC-USD",
  ETH_USD = "ETH-USD",
  LINK_USD = "LINK-USD",
  AAVE_USD = "AAVE-USD",
  UNI_USD = "UNI-USD",
  SUSHI_USD = "SUSHI-USD",
  SOL_USD = "SOL-USD",
  YFI_USD = "YFI-USD",
  ONEINCH_USD = "1INCH-USD",
  AVAX_USD = "AVAX-USD",
  SNX_USD = "SNX-USD",
  CRV_USD = "CRV-USD",
  UMA_USD = "UMA-USD",
  DOT_USD = "DOT-USD",
  DOGE_USD = "DOGE-USD",
  MATIC_USD = "MATIC-USD",
  MKR_USD = "MKR-USD",
  FIL_USD = "FIL-USD",
  ADA_USD = "ADA-USD",
  ATOM_USD = "ATOM-USD",
  COMP_USD = "COMP-USD",
  BCH_USD = "BCH-USD",
  LTC_USD = "LTC-USD",
  EOS_USD = "EOS-USD",
  ALGO_USD = "ALGO-USD",
  ZRX_USD = "ZRX-USD",
  XMR_USD = "XMR-USD",
  ZEC_USD = "ZEC-USD",
  ENJ_USD = "ENJ-USD",
  ETC_USD = "ETC-USD",
  XLM_USD = "XLM-USD",
  TRX_USD = "TRX-USD",
  XTZ_USD = "XTZ-USD",
  HNT_USD = "HNT-USD",
  ICP_USD = "ICP-USD",
  RUNE_USD = "RUNE-USD",
  LUNA_USD = "LUNA-USD",
  NEAR_USD = "NEAR-USD",
  AR_USD = "AR-USD",
  FLOW_USD = "FLOW-USD",
  PERP_USD = "PERP-USD",
  REN_USD = "REN-USD",
  CELO_USD = "CELO-USD",
  KSM_USD = "KSM-USD",
  BAL_USD = "BAL-USD",
  BNT_USD = "BNT-USD",
  MIR_USD = "MIR-USD",
  SRM_USD = "SRM-USD",
  LON_USD = "LON-USD",
  DODO_USD = "DODO-USD",
  ALPHA_USD = "ALPHA-USD",
  WNXM_USD = "WNXM-USD",
  XCH_USD = "XCH-USD",
  SUI_USD = "SUI-USD",
  WLD_USD = "WLD-USD",
  APT_USD = "APT-USD",
  XRP_USD = "XRP-USD",
  OP_USD = "OP-USD",
  ARB_USD = "ARB-USD",
  SEI_USD = "SEI-USD",
  FET_USD = "FET-USD",
  SHIB_USD = "SHIB-USD",
  BNB_USD = "BNB-USD",
}
// Add target tokens below + in tradingViewHelper to show the chart
// These keys are what is enabled in the UI so adding values here will enable them on the UI
export const tokenToMarket: { [key: string]: DydxMarket } = {
  btc: DydxMarket.BTC_USD,
  eth: DydxMarket.ETH_USD,
  icp: DydxMarket.ICP_USD,
  trx: DydxMarket.TRX_USD,
  atom: DydxMarket.ATOM_USD,
  sol: DydxMarket.SOL_USD,
  near: DydxMarket.NEAR_USD,
  link: DydxMarket.LINK_USD,
  doge: DydxMarket.DOGE_USD,
  avax: DydxMarket.AVAX_USD,
  matic: DydxMarket.MATIC_USD,
  fil: DydxMarket.FIL_USD,
  sui: DydxMarket.SUI_USD,
  wld: DydxMarket.WLD_USD,
  apt: DydxMarket.APT_USD,
  xrp: DydxMarket.XRP_USD,
  crv: DydxMarket.CRV_USD,
  op: DydxMarket.OP_USD,
  ada: DydxMarket.ADA_USD,
  arb: DydxMarket.ARB_USD,
  bch: DydxMarket.BCH_USD,
  etc: DydxMarket.ETC_USD,
  sei: DydxMarket.SEI_USD,
  dot: DydxMarket.DOT_USD,
  uni: DydxMarket.UNI_USD,
  fet: DydxMarket.FET_USD,
  shib: DydxMarket.SHIB_USD,
  ltc: DydxMarket.LTC_USD,
  bnb: DydxMarket.BNB_USD,
};
export const marketToToken: { [key: string]: string } = {
  [DydxMarket.BTC_USD]: "btc",
  [DydxMarket.ETH_USD]: "eth",
  [DydxMarket.ICP_USD]: "icp",
  [DydxMarket.TRX_USD]: "trx",
  [DydxMarket.ATOM_USD]: "atom",
  [DydxMarket.SOL_USD]: "sol",
  [DydxMarket.NEAR_USD]: "near",
  [DydxMarket.LINK_USD]: "link",
  [DydxMarket.DOGE_USD]: "doge",
  [DydxMarket.AVAX_USD]: "avax",
  [DydxMarket.MATIC_USD]: "matic",
  [DydxMarket.FIL_USD]: "fil",
  [DydxMarket.SUI_USD]: "sui",
  [DydxMarket.WLD_USD]: "wld",
  [DydxMarket.APT_USD]: "apt",
  [DydxMarket.XRP_USD]: "xrp",
  [DydxMarket.CRV_USD]: "crv",
  [DydxMarket.OP_USD]: "op",
  [DydxMarket.ADA_USD]: "ada",
  [DydxMarket.ARB_USD]: "arb",
  [DydxMarket.BCH_USD]: "bch",
  [DydxMarket.ETC_USD]: "etc",
  [DydxMarket.SEI_USD]: "sei",
  [DydxMarket.DOT_USD]: "dot",
  [DydxMarket.UNI_USD]: "uni",
  [DydxMarket.FET_USD]: "fet",
  [DydxMarket.SHIB_USD]: "shib",
  [DydxMarket.LTC_USD]: "ltc",
  [DydxMarket.BNB_USD]: "bnb",
};
export const TOKEN_PRECISION_MAP: { [key: string]: number } = {
  ceth: 18,
  cusdt: 6,
  cusdc: 6,
  btc: 8,
  eth: 18,
  usdc: 6,
  usdt: 6,
  asusd: 18,
  erowan: 18,
  juno: 6,
  frax: 18,
  icp: 18,
  atom: 6,
  uatom: 6,
  dai: 18,
  cdai: 18,
  trx: 6,
  bnb: 8,
  rowan: 18,
  uaxlusdc: 6,
  uusdc: 6,
  sol: 9,
  near: 24,
  link: 18,
  doge: 8,
  avax: 18,
  matic: 18,
  fil: 18,
  sui: 6,
  wld: 18,
  apt: 8,
  xrp: 6,
  crv: 18,
  op: 18,
  ada: 6,
  arb: 18,
  bch: 8,
  etc: 18,
  sei: 18,
  dot: 10,
  uni: 18,
  fet: 18,
  shib: 18,
  ltc: 8,
};
// buffer for price volatility 1 less than max leverage supported by market
export const tokenToLeverage: { [key: string]: number } = {
  btc: 19, // 20
  eth: 19, // 20
  icp: 4, // 5
  trx: 9, // 10
  atom: 9, // 10
  sol: 9, // 10
  near: 9, // 10
  link: 9, // 10
  doge: 9, // 10
  avax: 9, // 10
  matic: 9, // 10
  fil: 9, // 10
  sui: 9, // 10
  wld: 9, // 10
  apt: 9, // 10
  xrp: 9, // 10
  crv: 9, // 10
  op: 9, // 10
  ada: 9, // 10
  arb: 9, // 10,
  bch: 9, // 10,
  etc: 9, // 10,
  sei: 4, // 5,
  dot: 9, // 10,
  uni: 9, // 10,
  fet: 4, // 5,
  shib: 9, // 10,
  ltc: 9, // 10,
  bnb: 9, // 10,
};
export const TARGET_FETCH_IDS: string =
  "frax,dai,tether,aave-susd,juno-network,internet-computer,tron,axlusdc,bitcoin,binancecoin,cosmos,sifchain,ethereum,usd-coin,uusdc,solana,near,chainlink,dogecoin,avalanche-2,matic-network,filecoin,sui,worldcoin-wld,aptos,ripple,curve-dao-token,optimism,cardano,arbitrum,bitcoin-cash,ethereum-classic,sei-network,polkadot,uniswap,fetch-ai,shiba-inu,litecoin";
export const TARGET_COIN_LIST = [
  { id: "bitcoin", symbol: "btc" },
  { id: "ethereum", symbol: "eth" },
  { id: "tether", symbol: "usdt" },
  { id: "usd-coin", symbol: "usdc" },
  { id: "tron", symbol: "trx" },
  { id: "dai", symbol: "dai" },
  { id: "cosmos", symbol: "atom" },
  { id: "internet-computer", symbol: "icp" },
  { id: "frax", symbol: "frax" },
  { id: "juno-network", symbol: "juno" },
  { id: "sifchain", symbol: "erowan" },
  { id: "aave-susd", symbol: "asusd" },
  { id: "axlusdc", symbol: "axlusdc" },
  { id: "uusdc", symbol: "uusdc" },
  { id: "solana", symbol: "sol" },
  { id: "near", symbol: "near" },
  { id: "chainlink", symbol: "link" },
  { id: "dogecoin", symbol: "doge" },
  { id: "avalanche-2", symbol: "avax" },
  { id: "matic-network", symbol: "matic" },
  { id: "filecoin", symbol: "fil" },
  { id: "sui", symbol: "sui" },
  { id: "worldcoin-wld", symbol: "wld" },
  { id: "aptos", symbol: "apt" },
  { id: "ripple", symbol: "xrp" },
  { id: "curve-dao-token", symbol: "crv" },
  { id: "optimism", symbol: "op" },
  { id: "cardano", symbol: "ada" },
  { id: "arbitrum", symbol: "arb" },
  { id: "bitcoin-cash", symbol: "bch" },
  { id: "ethereum-classic", symbol: "etc" },
  { id: "sei-network", symbol: "sei" },
  { id: "polkadot", symbol: "dot" },
  { id: "uniswap", symbol: "uni" },
  { id: "fetch-ai", symbol: "fet" },
  { id: "shiba-inu", symbol: "shib" },
  { id: "litecoin", symbol: "ltc" },
  { id: "binancecoin", symbol: "bnb" },
];

export const FULLY_HEDGED_THRESHOLD = 0.95;
