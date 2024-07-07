"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ETH_CONTRACT_TOKEN_ADDRESS = exports.ETH_CHAIN_ID = exports.WORST_PRICE_MARGIN_PERCENTAGE = exports.MINIMUM_POSITION_AMOUNT = exports.ETH_GAS_LIMIT = exports.DYDX_FAST_WITHDRAWAL_GAS_PERCENTAGE = exports.LIMIT_FEE = exports.MAX_PROFIT_MULTIPLIER = exports.MATCHER_MULTIPLIER = exports.TXN_ERR_MESSAGE = exports.DEFAULT_TOKEN_RESULTS_SIMPLE = exports.DEFAULT_METRIC_RESULTS = exports.DEFAULT_TOKEN_RESULTS = exports.DEFAULT_REPORTING_RESULTS = exports.DEFAULT_REPORTING_RESULTS_BY_DIRECTION = exports.TOKEN_RESULTS = exports.CUSTOM_PRICE_LIST_FILE = exports.TRADES_RATE_LIMIT = exports.CLOSE_TRADE_WINDOW = exports.ENTRANCE_FEE_PERCENTAGE = exports.COMPOUNDING_PERIODS = exports.TOTAL_SECONDS_IN_YEAR = exports.DEFAULT_TIMEOUT = exports.COMPOUNDING_PERIOD_LENGTH = exports.BLOCK_TIME = exports.TRADER_APY = exports.CoinListOrder = exports.REGISTRY_URL = exports.DOMAIN = exports.URL = exports.ENV = exports.PROCESS = exports.TESTNET_SIF_ENV = exports.MAINNET_SIF_ENV = exports.COOKIE_NAME_CUSTOM_PRICE = exports.COOKIE_NAME_SIF_ENV = exports.StatusBadgeColor = exports.MINIMUM_TRADE_DURATION = exports.SLIPPAGE_TOLERANCE = exports.ANALYTICS_RELOAD = exports.NOTIF_RELOAD_INTERVAL = exports.PRICE_RELOAD_INTERVAL = exports.TRADE_RELOAD_INTERVAL = exports.MAINTENANCE_MARGIN = exports.PRICES_LIST_RELOAD_INTERVAL = exports.fiatFormatType = exports.MAX_TOKEN_PRECISION = exports.DEFAULT_TOKEN_PRECISION = exports.FIAT_INPUT_PRECISION = exports.FIAT_PRECISION = void 0;
exports.FULLY_HEDGED_THRESHOLD = exports.TARGET_COIN_LIST = exports.TARGET_FETCH_IDS = exports.tokenToLeverage = exports.TOKEN_PRECISION_MAP = exports.marketToToken = exports.tokenToMarket = exports.DydxMarket = exports.DydxAsset = exports.ENABLED_COLLATERAL_TOKENS = exports.DYDX_SLIPPAGE = exports.hedgeInterestMultiplier = exports.DYDX_RETRY_DELAY = exports.DYDX_RETRIES = exports.DEFAULT_RETRY_DELAY = exports.DEFAULT_RETRIES = exports.GOOD_TIL_BLOCK_BUFFER = exports.LIMIT_GTT = exports.DEFAULT_GTT = exports.DYDX_CONFIG = exports.NATIVE_TOKEN_DENOM = exports.DYDX_MAINNET_CHAIN_ID = exports.HEDGE_LIQUIDITY_MULTIPLIER = exports.MATCHER_PERCENTAGE = exports.UBI_PERCENTAGE = exports.REWARDS_PERCENTAGE = exports.DEFAULT_TRANSACTION_FEE = exports.DEFAULT_TRANSACTION_TOKEN_DENOM = exports.HOURS_IN_YEAR = exports.MINIMUM_USDC_AMOUNT = exports.MINIMUM_HEDGE_AMOUNT = exports.GAS_MARGIN_AMOUNT = exports.MINIMUM_PROTOCOL_ADDRESS_USDC_AMOUNT = exports.DEPOSIT_FREQUENCY = exports.ETH_GOERLI_USDC_TOKEN_CONTRACT = exports.ETH_MAINNET_USDC_TOKEN_CONTRACT = exports.ENABLE_DECENTRALIZED_MODE = exports.SAVE_LAST_BLOCK_EPOCH = exports.MULTISIG_THRESHOLD = exports.DENOM = exports.PREFIX = exports.RPC_URL = exports.DEFAULT_MAINNET_BRIDGEBANK_CONTRACT_ADDRESS = exports.DYDX_DEPOSIT_CONTRACT_ADDRESS = exports.ETH_TOKEN_ADDRESS = void 0;
exports.FIAT_PRECISION = 2;
exports.FIAT_INPUT_PRECISION = 6;
exports.DEFAULT_TOKEN_PRECISION = 6;
exports.MAX_TOKEN_PRECISION = 10;
var fiatFormatType;
(function (fiatFormatType) {
    fiatFormatType[fiatFormatType["LONG"] = 0] = "LONG";
    fiatFormatType[fiatFormatType["SMALL"] = 1] = "SMALL";
})(fiatFormatType = exports.fiatFormatType || (exports.fiatFormatType = {}));
exports.PRICES_LIST_RELOAD_INTERVAL = 30000;
exports.MAINTENANCE_MARGIN = 0.1;
exports.TRADE_RELOAD_INTERVAL = 60000;
exports.PRICE_RELOAD_INTERVAL = 300000;
exports.NOTIF_RELOAD_INTERVAL = 20000;
exports.ANALYTICS_RELOAD = 10000000;
exports.SLIPPAGE_TOLERANCE = 0.01;
exports.MINIMUM_TRADE_DURATION = 15 * 60 * 1000; // 15 minutes
var StatusBadgeColor;
(function (StatusBadgeColor) {
    StatusBadgeColor["ACTIVE"] = "green";
    StatusBadgeColor["PENDING"] = "yellow";
    StatusBadgeColor["CANCELLED"] = "red";
    StatusBadgeColor["COMPLETED"] = "blue";
})(StatusBadgeColor = exports.StatusBadgeColor || (exports.StatusBadgeColor = {}));
exports.COOKIE_NAME_SIF_ENV = "sif_dex_env";
exports.COOKIE_NAME_CUSTOM_PRICE = "sif_custom_price";
exports.MAINNET_SIF_ENV = "mainnet";
exports.TESTNET_SIF_ENV = "testnet";
exports.PROCESS = {
    SENTRY_DSN: "https://e2017c5ce61744b99e0559f3e86e55e2@o4504771149365248.ingest.sentry.io/4504773806129152",
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
exports.ENV = exports.PROCESS.USE_TESTNET === "true" ? exports.TESTNET_SIF_ENV : exports.MAINNET_SIF_ENV;
exports.URL = exports.PROCESS.RUN_LOCALLY === "true"
    ? "http://localhost:3000"
    : "https://gtk-margin.com";
exports.DOMAIN = exports.PROCESS.USE_COOKIE === "true" ? exports.URL : "";
exports.REGISTRY_URL = "https://registry.sifchain.network";
var CoinListOrder;
(function (CoinListOrder) {
    CoinListOrder["MARKET_CAP_DESC"] = "market_cap_desc";
    CoinListOrder["GECKO_DESC"] = "gecko_desc";
    CoinListOrder["GECKO_ASC"] = "gecko_asc";
    CoinListOrder["MARKET_CAP_ASC"] = "market_cap_asc";
    CoinListOrder["MARKET_CAT_DESC"] = "market_cap_desc";
    CoinListOrder["VOLUME_ASC"] = "volume_asc";
    CoinListOrder["VOLUME_DESC"] = "volume_desc";
    CoinListOrder["ID_ASC"] = "id_asc";
    CoinListOrder["ID_DESC"] = "id_desc";
})(CoinListOrder = exports.CoinListOrder || (exports.CoinListOrder = {}));
exports.TRADER_APY = 0.1;
exports.BLOCK_TIME = 6;
exports.COMPOUNDING_PERIOD_LENGTH = exports.BLOCK_TIME;
exports.DEFAULT_TIMEOUT = exports.BLOCK_TIME;
exports.TOTAL_SECONDS_IN_YEAR = 31536000;
exports.COMPOUNDING_PERIODS = exports.TOTAL_SECONDS_IN_YEAR / exports.COMPOUNDING_PERIOD_LENGTH;
exports.ENTRANCE_FEE_PERCENTAGE = 0.001;
exports.CLOSE_TRADE_WINDOW = 7;
exports.TRADES_RATE_LIMIT = 20;
exports.CUSTOM_PRICE_LIST_FILE = "./custom-prices.json";
exports.TOKEN_RESULTS = [
    {
        k: "uusdc",
        v: "0",
    },
];
exports.DEFAULT_REPORTING_RESULTS_BY_DIRECTION = {
    long: exports.TOKEN_RESULTS,
    short: exports.TOKEN_RESULTS,
};
exports.DEFAULT_REPORTING_RESULTS = {
    total: "0",
    week: "0",
    day: "0",
};
exports.DEFAULT_TOKEN_RESULTS = {
    total: exports.TOKEN_RESULTS,
    week: exports.TOKEN_RESULTS,
    day: exports.TOKEN_RESULTS,
};
exports.DEFAULT_METRIC_RESULTS = {
    total: 0,
    week: 0,
    day: 0,
};
exports.DEFAULT_TOKEN_RESULTS_SIMPLE = {
    total: null,
    week: null,
    day: null,
};
exports.TXN_ERR_MESSAGE = "ERROR: Insufficient funds, gas, fee, or sequence # mismatch so protocol errors that should be reprocessed";
// We need to allow for scaling up or down the max profit based off how available lending liquidity is available
exports.MATCHER_MULTIPLIER = 1;
exports.MAX_PROFIT_MULTIPLIER = exports.MATCHER_MULTIPLIER + 1;
exports.LIMIT_FEE = ".01";
exports.DYDX_FAST_WITHDRAWAL_GAS_PERCENTAGE = 0.02;
exports.ETH_GAS_LIMIT = 150000;
exports.MINIMUM_POSITION_AMOUNT = 100;
exports.WORST_PRICE_MARGIN_PERCENTAGE = 0.02;
exports.ETH_CHAIN_ID = exports.PROCESS.USE_TESTNET == "true" ? 5 : 1;
exports.ETH_CONTRACT_TOKEN_ADDRESS = "0xBe9895146f7AF43049ca1c1AE358B0541Ea49704";
exports.ETH_TOKEN_ADDRESS = "0x0000000000000000000000000000000000000000";
exports.DYDX_DEPOSIT_CONTRACT_ADDRESS = "0x8e8bd01b5A9eb272CC3892a2E40E64A716aa2A40";
exports.DEFAULT_MAINNET_BRIDGEBANK_CONTRACT_ADDRESS = "0x0A7f48AF978A29B63F45e17095E3A6475bBAe1bB";
exports.RPC_URL = process.env.RPC_URL || "http://localhost:26657";
exports.PREFIX = process.env.PREFIX || "sif";
exports.DENOM = process.env.DENOM || "rowan";
exports.MULTISIG_THRESHOLD = 2;
exports.SAVE_LAST_BLOCK_EPOCH = 500;
exports.ENABLE_DECENTRALIZED_MODE = process.env.ENABLE_DECENTRALIZED_MODE === "true" || false;
exports.ETH_MAINNET_USDC_TOKEN_CONTRACT = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
exports.ETH_GOERLI_USDC_TOKEN_CONTRACT = "0xD87Ba7A50B2E7E660f678A895E4B72E7CB4CCd9C";
// every hour
exports.DEPOSIT_FREQUENCY = 3600000;
exports.MINIMUM_PROTOCOL_ADDRESS_USDC_AMOUNT = 1;
exports.GAS_MARGIN_AMOUNT = 0.05;
exports.MINIMUM_HEDGE_AMOUNT = 1;
exports.MINIMUM_USDC_AMOUNT = 0.000001;
exports.HOURS_IN_YEAR = 8760;
exports.DEFAULT_TRANSACTION_TOKEN_DENOM = "rowan";
exports.DEFAULT_TRANSACTION_FEE = 375000000000000000;
// Update here to change the split
exports.REWARDS_PERCENTAGE = 20.0;
exports.UBI_PERCENTAGE = 10.0;
exports.MATCHER_PERCENTAGE = 70.0;
exports.HEDGE_LIQUIDITY_MULTIPLIER = 5;
exports.DYDX_MAINNET_CHAIN_ID = "dydx-mainnet-1";
exports.NATIVE_TOKEN_DENOM = "adydx";
// configs tested
exports.DYDX_CONFIG = {
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
        usdcIbcHash: "ibc/8E27BA2D5493AF5636760E354E46004562C46AB7EC0CC4C1CA14E9E20E2545B5",
        sourcePort: "transfer",
        sourceChannelDYDXToNoble: "channel-0",
        sourceChannelNobleToDYDX: "channel-33",
        sourceChannelNobleToSifchain: "channel-40",
    },
};
exports.DEFAULT_GTT = 120;
exports.LIMIT_GTT = 2419000; // 28 days in seconds
exports.GOOD_TIL_BLOCK_BUFFER = 10;
exports.DEFAULT_RETRIES = 3;
exports.DEFAULT_RETRY_DELAY = 1000;
exports.DYDX_RETRIES = 15;
// 1 block
exports.DYDX_RETRY_DELAY = 6000;
exports.hedgeInterestMultiplier = 1.35;
exports.DYDX_SLIPPAGE = 0.005;
// Enabled collateral tokens
exports.ENABLED_COLLATERAL_TOKENS = [
    // 'usdc',
    // 'usdt',
    // 'eth',
    exports.ENV == exports.MAINNET_SIF_ENV ? "atom" : "rowan",
    // 'dai',
    // 'wbtc',
    // 'susd',
    // 'frax',
    // 'axlusdc',
    "uusdc",
];
var DydxAsset;
(function (DydxAsset) {
    DydxAsset["USDC"] = "USDC";
    DydxAsset["BTC"] = "BTC";
    DydxAsset["ETH"] = "ETH";
    DydxAsset["LINK"] = "LINK";
    DydxAsset["AAVE"] = "AAVE";
    DydxAsset["UNI"] = "UNI";
    DydxAsset["SUSHI"] = "SUSHI";
    DydxAsset["SOL"] = "SOL";
    DydxAsset["YFI"] = "YFI";
    DydxAsset["ONEINCH"] = "1INCH";
    DydxAsset["AVAX"] = "AVAX";
    DydxAsset["SNX"] = "SNX";
    DydxAsset["CRV"] = "CRV";
    DydxAsset["UMA"] = "UMA";
    DydxAsset["DOT"] = "DOT";
    DydxAsset["DOGE"] = "DOGE";
    DydxAsset["MATIC"] = "MATIC";
    DydxAsset["MKR"] = "MKR";
    DydxAsset["FIL"] = "FIL";
    DydxAsset["ADA"] = "ADA";
    DydxAsset["ATOM"] = "ATOM";
    DydxAsset["COMP"] = "COMP";
    DydxAsset["BCH"] = "BCH";
    DydxAsset["LTC"] = "LTC";
    DydxAsset["EOS"] = "EOS";
    DydxAsset["ALGO"] = "ALGO";
    DydxAsset["ZRX"] = "ZRX";
    DydxAsset["XMR"] = "XMR";
    DydxAsset["ZEC"] = "ZEC";
    DydxAsset["ENJ"] = "ENJ";
    DydxAsset["ETC"] = "ETC";
    DydxAsset["XLM"] = "XLM";
    DydxAsset["TRX"] = "TRX";
    DydxAsset["XTZ"] = "XTZ";
    DydxAsset["HNT"] = "HNT";
    DydxAsset["ICP"] = "ICP";
    DydxAsset["RUNE"] = "RUNE";
    DydxAsset["LUNA"] = "LUNA";
    DydxAsset["NEAR"] = "NEAR";
    DydxAsset["AR"] = "AR";
    DydxAsset["FLOW"] = "FLOW";
    DydxAsset["PERP"] = "PERP";
    DydxAsset["REN"] = "REN";
    DydxAsset["CELO"] = "CELO";
    DydxAsset["KSM"] = "KSM";
    DydxAsset["BAL"] = "BAL";
    DydxAsset["BNT"] = "BNT";
    DydxAsset["MIR"] = "MIR";
    DydxAsset["SRM"] = "SRM";
    DydxAsset["LON"] = "LON";
    DydxAsset["DODO"] = "DODO";
    DydxAsset["ALPHA"] = "ALPHA";
    DydxAsset["WNXM"] = "WNXM";
    DydxAsset["XCH"] = "XCH";
    DydxAsset["SUI"] = "SUI";
    DydxAsset["WLD"] = "WLD";
    DydxAsset["APT"] = "APT";
    DydxAsset["XRP"] = "XRP";
    DydxAsset["OP"] = "OP";
    DydxAsset["SEI"] = "SEI";
    DydxAsset["FET"] = "FET";
    DydxAsset["SHIB"] = "SHIB";
    DydxAsset["BNB"] = "BNB";
})(DydxAsset = exports.DydxAsset || (exports.DydxAsset = {}));
var DydxMarket;
(function (DydxMarket) {
    DydxMarket["BTC_USD"] = "BTC-USD";
    DydxMarket["ETH_USD"] = "ETH-USD";
    DydxMarket["LINK_USD"] = "LINK-USD";
    DydxMarket["AAVE_USD"] = "AAVE-USD";
    DydxMarket["UNI_USD"] = "UNI-USD";
    DydxMarket["SUSHI_USD"] = "SUSHI-USD";
    DydxMarket["SOL_USD"] = "SOL-USD";
    DydxMarket["YFI_USD"] = "YFI-USD";
    DydxMarket["ONEINCH_USD"] = "1INCH-USD";
    DydxMarket["AVAX_USD"] = "AVAX-USD";
    DydxMarket["SNX_USD"] = "SNX-USD";
    DydxMarket["CRV_USD"] = "CRV-USD";
    DydxMarket["UMA_USD"] = "UMA-USD";
    DydxMarket["DOT_USD"] = "DOT-USD";
    DydxMarket["DOGE_USD"] = "DOGE-USD";
    DydxMarket["MATIC_USD"] = "MATIC-USD";
    DydxMarket["MKR_USD"] = "MKR-USD";
    DydxMarket["FIL_USD"] = "FIL-USD";
    DydxMarket["ADA_USD"] = "ADA-USD";
    DydxMarket["ATOM_USD"] = "ATOM-USD";
    DydxMarket["COMP_USD"] = "COMP-USD";
    DydxMarket["BCH_USD"] = "BCH-USD";
    DydxMarket["LTC_USD"] = "LTC-USD";
    DydxMarket["EOS_USD"] = "EOS-USD";
    DydxMarket["ALGO_USD"] = "ALGO-USD";
    DydxMarket["ZRX_USD"] = "ZRX-USD";
    DydxMarket["XMR_USD"] = "XMR-USD";
    DydxMarket["ZEC_USD"] = "ZEC-USD";
    DydxMarket["ENJ_USD"] = "ENJ-USD";
    DydxMarket["ETC_USD"] = "ETC-USD";
    DydxMarket["XLM_USD"] = "XLM-USD";
    DydxMarket["TRX_USD"] = "TRX-USD";
    DydxMarket["XTZ_USD"] = "XTZ-USD";
    DydxMarket["HNT_USD"] = "HNT-USD";
    DydxMarket["ICP_USD"] = "ICP-USD";
    DydxMarket["RUNE_USD"] = "RUNE-USD";
    DydxMarket["LUNA_USD"] = "LUNA-USD";
    DydxMarket["NEAR_USD"] = "NEAR-USD";
    DydxMarket["AR_USD"] = "AR-USD";
    DydxMarket["FLOW_USD"] = "FLOW-USD";
    DydxMarket["PERP_USD"] = "PERP-USD";
    DydxMarket["REN_USD"] = "REN-USD";
    DydxMarket["CELO_USD"] = "CELO-USD";
    DydxMarket["KSM_USD"] = "KSM-USD";
    DydxMarket["BAL_USD"] = "BAL-USD";
    DydxMarket["BNT_USD"] = "BNT-USD";
    DydxMarket["MIR_USD"] = "MIR-USD";
    DydxMarket["SRM_USD"] = "SRM-USD";
    DydxMarket["LON_USD"] = "LON-USD";
    DydxMarket["DODO_USD"] = "DODO-USD";
    DydxMarket["ALPHA_USD"] = "ALPHA-USD";
    DydxMarket["WNXM_USD"] = "WNXM-USD";
    DydxMarket["XCH_USD"] = "XCH-USD";
    DydxMarket["SUI_USD"] = "SUI-USD";
    DydxMarket["WLD_USD"] = "WLD-USD";
    DydxMarket["APT_USD"] = "APT-USD";
    DydxMarket["XRP_USD"] = "XRP-USD";
    DydxMarket["OP_USD"] = "OP-USD";
    DydxMarket["ARB_USD"] = "ARB-USD";
    DydxMarket["SEI_USD"] = "SEI-USD";
    DydxMarket["FET_USD"] = "FET-USD";
    DydxMarket["SHIB_USD"] = "SHIB-USD";
    DydxMarket["BNB_USD"] = "BNB-USD";
})(DydxMarket = exports.DydxMarket || (exports.DydxMarket = {}));
// Add target tokens below + in tradingViewHelper to show the chart
// These keys are what is enabled in the UI so adding values here will enable them on the UI
exports.tokenToMarket = {
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
exports.marketToToken = {
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
exports.TOKEN_PRECISION_MAP = {
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
exports.tokenToLeverage = {
    btc: 19,
    eth: 19,
    icp: 4,
    trx: 9,
    atom: 9,
    sol: 9,
    near: 9,
    link: 9,
    doge: 9,
    avax: 9,
    matic: 9,
    fil: 9,
    sui: 9,
    wld: 9,
    apt: 9,
    xrp: 9,
    crv: 9,
    op: 9,
    ada: 9,
    arb: 9,
    bch: 9,
    etc: 9,
    sei: 4,
    dot: 9,
    uni: 9,
    fet: 4,
    shib: 9,
    ltc: 9,
    bnb: 9, // 10,
};
exports.TARGET_FETCH_IDS = "frax,dai,tether,aave-susd,juno-network,internet-computer,tron,axlusdc,bitcoin,binancecoin,cosmos,sifchain,ethereum,usd-coin,uusdc,solana,near,chainlink,dogecoin,avalanche-2,matic-network,filecoin,sui,worldcoin-wld,aptos,ripple,curve-dao-token,optimism,cardano,arbitrum,bitcoin-cash,ethereum-classic,sei-network,polkadot,uniswap,fetch-ai,shiba-inu,litecoin";
exports.TARGET_COIN_LIST = [
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
exports.FULLY_HEDGED_THRESHOLD = 0.95;
