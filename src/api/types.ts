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

export const tokenToMarket = {
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
} as const;
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

export enum TradeStatusEnum {
  PENDING = "PENDING",
  CANCELLED = "CANCELLED",
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
}

export type TradeStatus =
  (typeof TradeStatusEnum)[keyof typeof TradeStatusEnum];

export enum TradeDirectionEnum {
  SHORT = "SHORT",
  LONG = "LONG",
}

export type TradeDirection =
  (typeof TradeDirectionEnum)[keyof typeof TradeDirectionEnum];

export enum TradeTypeEnum {
  HEDGED = "HEDGED",
  UNHEDGED = "UNHEDGED",
}

export type TradeType = (typeof TradeTypeEnum)[keyof typeof TradeTypeEnum];

export enum NotificationStatusEnum {
  SENT = "SENT",
  NOT_NEEDED = "NOT_NEEDED",
  PENDING = "PENDING",
}

export type NotificationStatus =
  (typeof NotificationStatusEnum)[keyof typeof NotificationStatusEnum];

export enum NotifTypeEnum {
  LENDER_OPEN = "LENDER_OPEN",
  LENDER_CLOSE = "LENDER_CLOSE",
  TRADER_ON_REQUEST_TO_CLOSE = "TRADER_ON_REQUEST_TO_CLOSE",
}

export type NotifType = (typeof NotifTypeEnum)[keyof typeof NotifTypeEnum];

export enum TradeCloseReason {
  MAX_PROFIT = "MAX_PROFIT",
  TAKE_PROFIT = "TAKE_PROFIT",
  LIQUIDATION = "LIQUIDATION",
  STOP_LOSS = "STOP_LOSS",
  REQUEST_TO_CLOSE_WINDOW_HIT = "REQUEST_TO_CLOSE_WINDOW_HIT",
  MANUALLY_CLOSED = "MANUALLY_CLOSED",
}

export enum TradeNotOpenReason {
  LIMIT_PRICE = "LIMIT_PRICE",
  NO_MATCH = "NO_MATCH",
  SHOULD_BE_CLOSED = "SHOULD_BE_CLOSED",
  ERROR = "ERROR",
  NOT_ENOUGH_FUNDS_MVA = "NOT_ENOUGH_FUNDS_MVA",
  NOT_ENOUGH_FUNDS_PTA = "NOT_ENOUGH_FUNDS_PTA",
}

export enum PnlTypeEnum {
  REALIZED = "REALIZED",
  UNREALIZED = "UNREALIZED",
  OVERALL = "OVERALL",
}
