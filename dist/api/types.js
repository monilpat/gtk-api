"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkEnum = exports.MatchStatusEnum = exports.PnlTypeEnum = exports.TradeNotOpenReason = exports.TradeCloseReason = exports.NotifTypeEnum = exports.NotificationStatusEnum = exports.TradeTypeEnum = exports.TradeDirectionEnum = exports.TradeStatusEnum = exports.tokenToMarket = exports.DydxMarket = void 0;
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
var TradeStatusEnum;
(function (TradeStatusEnum) {
    TradeStatusEnum["PENDING"] = "PENDING";
    TradeStatusEnum["CANCELLED"] = "CANCELLED";
    TradeStatusEnum["ACTIVE"] = "ACTIVE";
    TradeStatusEnum["COMPLETED"] = "COMPLETED";
})(TradeStatusEnum = exports.TradeStatusEnum || (exports.TradeStatusEnum = {}));
var TradeDirectionEnum;
(function (TradeDirectionEnum) {
    TradeDirectionEnum["SHORT"] = "SHORT";
    TradeDirectionEnum["LONG"] = "LONG";
})(TradeDirectionEnum = exports.TradeDirectionEnum || (exports.TradeDirectionEnum = {}));
var TradeTypeEnum;
(function (TradeTypeEnum) {
    TradeTypeEnum["HEDGED"] = "HEDGED";
    TradeTypeEnum["UNHEDGED"] = "UNHEDGED";
})(TradeTypeEnum = exports.TradeTypeEnum || (exports.TradeTypeEnum = {}));
var NotificationStatusEnum;
(function (NotificationStatusEnum) {
    NotificationStatusEnum["SENT"] = "SENT";
    NotificationStatusEnum["NOT_NEEDED"] = "NOT_NEEDED";
    NotificationStatusEnum["PENDING"] = "PENDING";
})(NotificationStatusEnum = exports.NotificationStatusEnum || (exports.NotificationStatusEnum = {}));
var NotifTypeEnum;
(function (NotifTypeEnum) {
    NotifTypeEnum["LENDER_OPEN"] = "LENDER_OPEN";
    NotifTypeEnum["LENDER_CLOSE"] = "LENDER_CLOSE";
    NotifTypeEnum["TRADER_ON_REQUEST_TO_CLOSE"] = "TRADER_ON_REQUEST_TO_CLOSE";
})(NotifTypeEnum = exports.NotifTypeEnum || (exports.NotifTypeEnum = {}));
var TradeCloseReason;
(function (TradeCloseReason) {
    TradeCloseReason["MAX_PROFIT"] = "MAX_PROFIT";
    TradeCloseReason["TAKE_PROFIT"] = "TAKE_PROFIT";
    TradeCloseReason["LIQUIDATION"] = "LIQUIDATION";
    TradeCloseReason["STOP_LOSS"] = "STOP_LOSS";
    TradeCloseReason["REQUEST_TO_CLOSE_WINDOW_HIT"] = "REQUEST_TO_CLOSE_WINDOW_HIT";
    TradeCloseReason["MANUALLY_CLOSED"] = "MANUALLY_CLOSED";
})(TradeCloseReason = exports.TradeCloseReason || (exports.TradeCloseReason = {}));
var TradeNotOpenReason;
(function (TradeNotOpenReason) {
    TradeNotOpenReason["LIMIT_PRICE"] = "LIMIT_PRICE";
    TradeNotOpenReason["NO_MATCH"] = "NO_MATCH";
    TradeNotOpenReason["SHOULD_BE_CLOSED"] = "SHOULD_BE_CLOSED";
    TradeNotOpenReason["ERROR"] = "ERROR";
    TradeNotOpenReason["NOT_ENOUGH_FUNDS_MVA"] = "NOT_ENOUGH_FUNDS_MVA";
    TradeNotOpenReason["NOT_ENOUGH_FUNDS_PTA"] = "NOT_ENOUGH_FUNDS_PTA";
})(TradeNotOpenReason = exports.TradeNotOpenReason || (exports.TradeNotOpenReason = {}));
var PnlTypeEnum;
(function (PnlTypeEnum) {
    PnlTypeEnum["REALIZED"] = "REALIZED";
    PnlTypeEnum["UNREALIZED"] = "UNREALIZED";
    PnlTypeEnum["OVERALL"] = "OVERALL";
})(PnlTypeEnum = exports.PnlTypeEnum || (exports.PnlTypeEnum = {}));
var MatchStatusEnum;
(function (MatchStatusEnum) {
    MatchStatusEnum["MATCHED"] = "MATCHED";
    MatchStatusEnum["UNMATCHED"] = "UNMATCHED";
    MatchStatusEnum["INACTIVE"] = "INACTIVE";
})(MatchStatusEnum = exports.MatchStatusEnum || (exports.MatchStatusEnum = {}));
var NetworkEnum;
(function (NetworkEnum) {
    NetworkEnum["ETHEREUM"] = "ETHEREUM";
    NetworkEnum["SIFCHAIN"] = "SIFCHAIN";
})(NetworkEnum = exports.NetworkEnum || (exports.NetworkEnum = {}));
