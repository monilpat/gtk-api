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
    readonly btc: DydxMarket.BTC_USD;
    readonly eth: DydxMarket.ETH_USD;
    readonly icp: DydxMarket.ICP_USD;
    readonly trx: DydxMarket.TRX_USD;
    readonly atom: DydxMarket.ATOM_USD;
    readonly sol: DydxMarket.SOL_USD;
    readonly near: DydxMarket.NEAR_USD;
    readonly link: DydxMarket.LINK_USD;
    readonly doge: DydxMarket.DOGE_USD;
    readonly avax: DydxMarket.AVAX_USD;
    readonly matic: DydxMarket.MATIC_USD;
    readonly fil: DydxMarket.FIL_USD;
    readonly sui: DydxMarket.SUI_USD;
    readonly wld: DydxMarket.WLD_USD;
    readonly apt: DydxMarket.APT_USD;
    readonly xrp: DydxMarket.XRP_USD;
    readonly crv: DydxMarket.CRV_USD;
    readonly op: DydxMarket.OP_USD;
    readonly ada: DydxMarket.ADA_USD;
    readonly arb: DydxMarket.ARB_USD;
    readonly bch: DydxMarket.BCH_USD;
    readonly etc: DydxMarket.ETC_USD;
    readonly sei: DydxMarket.SEI_USD;
    readonly dot: DydxMarket.DOT_USD;
    readonly uni: DydxMarket.UNI_USD;
    readonly fet: DydxMarket.FET_USD;
    readonly shib: DydxMarket.SHIB_USD;
    readonly ltc: DydxMarket.LTC_USD;
    readonly bnb: DydxMarket.BNB_USD;
};
export type TargetTokenType = keyof typeof tokenToMarket;
export type CollateralTokenType = "atom" | "uusdc";
export type Trade = {
    id: number;
    type: TradeType;
    status: TradeStatus;
    createdAt: Date;
    collateralTokenType: string;
    collateralTokenAmount: string;
    collateralTokenPrice: string;
    targetTokenType: string;
    targetTokenAmount: string;
    targetTokenPrice: string;
    tradeDirection: TradeDirection;
    leverageQuantity: string;
    stopLoss: string | null;
    takeProfit: string | null;
    traderAddress: string;
    collateralClosePrice: string | null;
    targetClosePrice: string | null;
    expiryDatetime: Date | null;
    interestSent: string | null;
    pendingInterest: string | null;
    limitPrice: string | null;
    requestToCloseTime: Date | null;
    closeTime: Date | null;
    closeReason: TradeCloseReason | null;
    pandL: string | null;
    matcherPandL: string | null;
    txnHash: string | null;
    closeTxnHash: string | null;
    notifStatusLenderOnOpen: NotificationStatus;
    notifStatusLenderOnClose: NotificationStatus;
    notifStatusTraderOnRequestToClose: NotificationStatus;
    maxProfitMultiplier: string;
    hedgeTradeId: number;
    hedgeTradePandL: string | null;
    executedAt: Date | null;
    matcherAPR: string | null;
    interestRate: string | null;
    entranceFee: string | null;
    notOpenReason: TradeNotOpenReason | null;
    shouldBeOpenedTime: Date | null;
};
export declare enum TradeStatusEnum {
    PENDING = "PENDING",
    CANCELLED = "CANCELLED",
    ACTIVE = "ACTIVE",
    COMPLETED = "COMPLETED"
}
export type TradeStatus = (typeof TradeStatusEnum)[keyof typeof TradeStatusEnum];
export declare enum TradeDirectionEnum {
    SHORT = "SHORT",
    LONG = "LONG"
}
export type TradeDirection = (typeof TradeDirectionEnum)[keyof typeof TradeDirectionEnum];
export declare enum TradeTypeEnum {
    HEDGED = "HEDGED",
    UNHEDGED = "UNHEDGED"
}
export type TradeType = (typeof TradeTypeEnum)[keyof typeof TradeTypeEnum];
export declare enum NotificationStatusEnum {
    SENT = "SENT",
    NOT_NEEDED = "NOT_NEEDED",
    PENDING = "PENDING"
}
export type NotificationStatus = (typeof NotificationStatusEnum)[keyof typeof NotificationStatusEnum];
export declare enum NotifTypeEnum {
    LENDER_OPEN = "LENDER_OPEN",
    LENDER_CLOSE = "LENDER_CLOSE",
    TRADER_ON_REQUEST_TO_CLOSE = "TRADER_ON_REQUEST_TO_CLOSE"
}
export type NotifType = (typeof NotifTypeEnum)[keyof typeof NotifTypeEnum];
export declare enum TradeCloseReason {
    MAX_PROFIT = "MAX_PROFIT",
    TAKE_PROFIT = "TAKE_PROFIT",
    LIQUIDATION = "LIQUIDATION",
    STOP_LOSS = "STOP_LOSS",
    REQUEST_TO_CLOSE_WINDOW_HIT = "REQUEST_TO_CLOSE_WINDOW_HIT",
    MANUALLY_CLOSED = "MANUALLY_CLOSED"
}
export declare enum TradeNotOpenReason {
    LIMIT_PRICE = "LIMIT_PRICE",
    NO_MATCH = "NO_MATCH",
    SHOULD_BE_CLOSED = "SHOULD_BE_CLOSED",
    ERROR = "ERROR",
    NOT_ENOUGH_FUNDS_MVA = "NOT_ENOUGH_FUNDS_MVA",
    NOT_ENOUGH_FUNDS_PTA = "NOT_ENOUGH_FUNDS_PTA"
}
export declare enum PnlTypeEnum {
    REALIZED = "REALIZED",
    UNREALIZED = "UNREALIZED",
    OVERALL = "OVERALL"
}
/**
 * Model MatchVault
 *
 */
export type MatchVault = {
    id: number;
    status: MatchStatus;
    createdAt: Date;
    matcherAddress: string;
    tokenType: string;
    dydxTokenAmount: string | null;
    tokenAmount: string;
    encumberedTokenAmount: string;
    expiryDatetime: Date | null;
    latestTxnHash: string | null;
    type: TradeType;
    network: Network;
};
export declare enum MatchStatusEnum {
    MATCHED = "MATCHED",
    UNMATCHED = "UNMATCHED",
    INACTIVE = "INACTIVE"
}
export declare enum NetworkEnum {
    ETHEREUM = "ETHEREUM",
    SIFCHAIN = "SIFCHAIN"
}
export type Network = (typeof NetworkEnum)[keyof typeof NetworkEnum];
export type MatchStatus = (typeof MatchStatusEnum)[keyof typeof MatchStatusEnum];
