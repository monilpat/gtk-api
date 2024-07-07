export declare const FIAT_PRECISION = 2;
export declare const FIAT_INPUT_PRECISION = 6;
export declare const DEFAULT_TOKEN_PRECISION = 6;
export declare const MAX_TOKEN_PRECISION = 10;
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
export declare enum fiatFormatType {
    LONG = 0,
    SMALL = 1
}
export type protocolSpecificTransactionType = "collect_interest" | "disperse_interest" | "request_interest" | "execute_trade" | "execute_match" | "close_match" | "collect_entrance_fee" | "processing_error" | "open_hedge_trade" | "close_hedge_trade" | "disperse_entrance_fee" | "transfer_to_hedge";
export type endUserTransactionType = "open_trade" | "close_trade" | "update_trade_request" | "cancel_trade_request" | "deposit_match" | "withdraw_match" | "get_trade_status" | "request_close_trade";
export type transactionType = endUserTransactionType | protocolSpecificTransactionType;
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
export declare const PRICES_LIST_RELOAD_INTERVAL = 30000;
export declare const MAINTENANCE_MARGIN = 0.1;
export declare const TRADE_RELOAD_INTERVAL = 60000;
export declare const PRICE_RELOAD_INTERVAL = 300000;
export declare const NOTIF_RELOAD_INTERVAL = 20000;
export declare const ANALYTICS_RELOAD = 10000000;
export declare const SLIPPAGE_TOLERANCE = 0.01;
export declare const MINIMUM_TRADE_DURATION: number;
export declare enum StatusBadgeColor {
    ACTIVE = "green",
    PENDING = "yellow",
    CANCELLED = "red",
    COMPLETED = "blue"
}
export declare const COOKIE_NAME_SIF_ENV = "sif_dex_env";
export declare const COOKIE_NAME_CUSTOM_PRICE = "sif_custom_price";
export declare const MAINNET_SIF_ENV = "mainnet";
export declare const TESTNET_SIF_ENV = "testnet";
export declare const PROCESS: {
    SENTRY_DSN: string;
    SENTRY_ENVIRONMENT: string;
    SENTRY_ENABLED: boolean;
    PENDING_TRADE_ADDRESS: string;
    MATCH_VAULT_ADDRESS: string;
    LIVE_TRADE_ADDRESS: string;
    INTEREST_ADDRESS: string;
    ENTRANCE_FEE_ADDRESS: string;
    UBI_ADDRESS: string;
    REWARDS_ADDRESS: string;
    HEDGE_ADDRESS: string;
    HEDGE_NOBLE_ADDRESS: string;
    HEDGE_DYDX_ADDRESS: string;
    USE_COOKIE: string;
    RUN_LOCALLY: string;
    USE_TESTNET: string;
};
export declare const ENV: string;
export declare const URL: string;
export declare const DOMAIN: string;
export declare const REGISTRY_URL = "https://registry.sifchain.network";
export type InterestByTokenType = {
    tokenType: string;
    pendingInterest: string;
};
export declare enum CoinListOrder {
    MARKET_CAP_DESC = "market_cap_desc",
    GECKO_DESC = "gecko_desc",
    GECKO_ASC = "gecko_asc",
    MARKET_CAP_ASC = "market_cap_asc",
    MARKET_CAT_DESC = "market_cap_desc",
    VOLUME_ASC = "volume_asc",
    VOLUME_DESC = "volume_desc",
    ID_ASC = "id_asc",
    ID_DESC = "id_desc"
}
export declare const TRADER_APY = 0.1;
export declare const BLOCK_TIME = 6;
export declare const COMPOUNDING_PERIOD_LENGTH = 6;
export declare const DEFAULT_TIMEOUT = 6;
export declare const TOTAL_SECONDS_IN_YEAR = 31536000;
export declare const COMPOUNDING_PERIODS: number;
export declare const ENTRANCE_FEE_PERCENTAGE = 0.001;
export declare const CLOSE_TRADE_WINDOW = 7;
export declare const TRADES_RATE_LIMIT = 20;
export declare const CUSTOM_PRICE_LIST_FILE = "./custom-prices.json";
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
export declare const TOKEN_RESULTS: TokenResults;
export declare const DEFAULT_REPORTING_RESULTS_BY_DIRECTION: ReportingResultsByDirection;
export declare const DEFAULT_REPORTING_RESULTS: ReportingResults;
export declare const DEFAULT_TOKEN_RESULTS: ReportingByTokenResults;
export declare const DEFAULT_METRIC_RESULTS: ReportingMetricResults;
export declare const DEFAULT_TOKEN_RESULTS_SIMPLE: {
    total: any;
    week: any;
    day: any;
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
export declare const TXN_ERR_MESSAGE = "ERROR: Insufficient funds, gas, fee, or sequence # mismatch so protocol errors that should be reprocessed";
export declare const MATCHER_MULTIPLIER = 1;
export declare const MAX_PROFIT_MULTIPLIER: number;
export declare const LIMIT_FEE = ".01";
export declare const DYDX_FAST_WITHDRAWAL_GAS_PERCENTAGE = 0.02;
export declare const ETH_GAS_LIMIT = 150000;
export declare const MINIMUM_POSITION_AMOUNT = 100;
export declare const WORST_PRICE_MARGIN_PERCENTAGE = 0.02;
export declare const ETH_CHAIN_ID: number;
export declare const ETH_CONTRACT_TOKEN_ADDRESS = "0xBe9895146f7AF43049ca1c1AE358B0541Ea49704";
export declare const ETH_TOKEN_ADDRESS = "0x0000000000000000000000000000000000000000";
export declare const DYDX_DEPOSIT_CONTRACT_ADDRESS = "0x8e8bd01b5A9eb272CC3892a2E40E64A716aa2A40";
export declare const DEFAULT_MAINNET_BRIDGEBANK_CONTRACT_ADDRESS = "0x0A7f48AF978A29B63F45e17095E3A6475bBAe1bB";
export declare const RPC_URL: string;
export declare const PREFIX: string;
export declare const DENOM: string;
export declare const MULTISIG_THRESHOLD = 2;
export declare const SAVE_LAST_BLOCK_EPOCH = 500;
export declare const ENABLE_DECENTRALIZED_MODE: boolean;
export declare const ETH_MAINNET_USDC_TOKEN_CONTRACT = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
export declare const ETH_GOERLI_USDC_TOKEN_CONTRACT = "0xD87Ba7A50B2E7E660f678A895E4B72E7CB4CCd9C";
export declare const DEPOSIT_FREQUENCY = 3600000;
export declare const MINIMUM_PROTOCOL_ADDRESS_USDC_AMOUNT = 1;
export declare const GAS_MARGIN_AMOUNT = 0.05;
export declare const MINIMUM_HEDGE_AMOUNT = 1;
export declare const MINIMUM_USDC_AMOUNT = 0.000001;
export declare const HOURS_IN_YEAR = 8760;
export declare const DEFAULT_TRANSACTION_TOKEN_DENOM = "rowan";
export declare const DEFAULT_TRANSACTION_FEE = 375000000000000000;
export declare const REWARDS_PERCENTAGE = 20;
export declare const UBI_PERCENTAGE = 10;
export declare const MATCHER_PERCENTAGE = 70;
export declare const HEDGE_LIQUIDITY_MULTIPLIER = 5;
export declare const DYDX_MAINNET_CHAIN_ID = "dydx-mainnet-1";
export declare const NATIVE_TOKEN_DENOM = "adydx";
export declare const DYDX_CONFIG: {
    testnet: {
        validatorGrpcEndpoint: string;
        aerialConfigUrl: string;
        aerialGrpcOrRestPrefix: string;
        indexerRestEndpoint: string;
        indexerWsEndpoint: string;
        chainId: string;
        env: string;
        nobleClient: string;
    };
    mainnetGRPC: {
        validatorGrpcEndpoint: string;
        aerialConfigUrl: string;
        aerialGrpcOrRestPrefix: string;
        indexerRestEndpoint: string;
        indexerWsEndpoint: string;
        chainId: string;
        env: string;
        nobleClient: string;
    };
    mainnetREST: {
        validatorGrpcEndpoint: string;
        aerialConfigUrl: string;
        aerialGrpcOrRestPrefix: string;
        indexerRestEndpoint: string;
        indexerWsEndpoint: string;
        chainId: string;
        env: string;
        nobleClient: string;
    };
    general: {
        usdcIbcHash: string;
        sourcePort: string;
        sourceChannelDYDXToNoble: string;
        sourceChannelNobleToDYDX: string;
        sourceChannelNobleToSifchain: string;
    };
};
export declare const DEFAULT_GTT = 120;
export declare const LIMIT_GTT = 2419000;
export declare const GOOD_TIL_BLOCK_BUFFER = 10;
export declare const DEFAULT_RETRIES = 3;
export declare const DEFAULT_RETRY_DELAY = 1000;
export declare const DYDX_RETRIES = 15;
export declare const DYDX_RETRY_DELAY = 6000;
export declare const hedgeInterestMultiplier = 1.35;
export declare const DYDX_SLIPPAGE = 0.005;
export type historicalFunding = {
    ticker: "string";
    rate: "string";
    price: "string";
    effectiveAt: "string";
    effectiveAtHeight: "string";
};
export declare const ENABLED_COLLATERAL_TOKENS: string[];
export declare enum DydxAsset {
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
    BNB = "BNB"
}
export declare enum DydxMarket {
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
    BNB_USD = "BNB-USD"
}
export declare const tokenToMarket: {
    [key: string]: DydxMarket;
};
export declare const marketToToken: {
    [key: string]: string;
};
export declare const TOKEN_PRECISION_MAP: {
    [key: string]: number;
};
export declare const tokenToLeverage: {
    [key: string]: number;
};
export declare const TARGET_FETCH_IDS: string;
export declare const TARGET_COIN_LIST: {
    id: string;
    symbol: string;
}[];
export declare const FULLY_HEDGED_THRESHOLD = 0.95;
