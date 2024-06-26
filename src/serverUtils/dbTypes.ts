/**
 * Model Trade
 *
 */
export type Trade = {
  id: number
  type: TradeType
  status: TradeStatus
  createdAt: Date
  collateralTokenType: string
  collateralTokenAmount: string
  collateralTokenPrice: string
  targetTokenType: string
  targetTokenAmount: string
  targetTokenPrice: string
  tradeDirection: TradeDirection
  leverageQuantity: string
  stopLoss: string | null
  takeProfit: string | null
  traderAddress: string
  collateralClosePrice: string | null
  targetClosePrice: string | null
  expiryDatetime: Date | null
  interestSent: string | null
  pendingInterest: string | null
  limitPrice: string | null
  requestToCloseTime: Date | null
  closeTime: Date | null
  closeReason: TradeCloseReason | null
  pandL: string | null
  matcherPandL: string | null
  txnHash: string | null
  closeTxnHash: string | null
  notifStatusLenderOnOpen: NotificationStatus
  notifStatusLenderOnClose: NotificationStatus
  notifStatusTraderOnRequestToClose: NotificationStatus
  maxProfitMultiplier: string
  hedgeTradeId: number
  hedgeTradePandL: string | null
  executedAt: Date | null
  matcherAPR: string | null
  interestRate: string | null
  entranceFee: string | null
  notOpenReason: TradeNotOpenReason | null
  shouldBeOpenedTime: Date | null
}

/**
 * Model HedgeTrade
 *
 */
export type HedgeTrade = {
  id: number
  orderId: string
  clientId: string
  accountId: string
  market: string
  side: string
  price: string
  triggerPrice: string | null
  trailingPercent: string | null
  size: string | null
  remainingSize: string | null
  type: string | null
  createdAt: Date
  unfillableAt: Date | null
  expiresAt: Date
  status: HedgeTradeStatus
  timeInForce: string
  postOnly: boolean
  reduceOnly: boolean
  cancelReason: string | null
  tradeId: string | null
  takeProfitOrderId: string | null
  stopLossOrderId: string | null
  sendToDYDXTxnHash: string | null
  sendFromDYDXTxnHash: string | null
  depositToDYDXTxnHash: string | null
  withdrawFromDYDXTxnHash: string | null
  address: string
  collateralClosePrice: string | null
  targetClosePrice: string | null
  closeTime: Date
  pandl: string | null
  collateralSize: string | null
  interestRate: string | null
  leverage: string | null
  executeTradeTxnHash: string | null
  totalFilled: string | null
}

/**
 * Model InterestConfig
 *
 */
export type InterestConfig = {
  id: number
  tradeId: number
  address: string
  percentage: string
}

/**
 * Model MatchVault
 *
 */
export type MatchVault = {
  id: number
  status: MatchStatus
  createdAt: Date
  matcherAddress: string
  tokenType: string
  dydxTokenAmount: string | null
  tokenAmount: string
  encumberedTokenAmount: string
  expiryDatetime: Date | null
  latestTxnHash: string | null
  type: TradeType
  network: Network
}

/**
 * Model MatchesOnTrades
 *
 */
export type MatchesOnTrades = {
  tradeId: number
  matchId: number
  assignedAt: Date
}

/**
 * Model MatchVaultHistory
 *
 */
export type MatchVaultHistory = {
  id: number
  createdAt: Date
  action: MatchVaultChangeType
  matchVaultId: number
  tokenAmount: string
  tokenType: string
  type: TradeType
  network: Network
}

/**
 * Model Transaction
 *
 */
export type Transaction = {
  id: number
  createdAt: Date
  sender: string
  txHash: string | null
  blockHeight: number | null
  info: any
  signatures?: Signature[] | null
  status: TransactionStatus | string
}

/**
 * Model Signature
 *
 */
export type Signature = {
  id: number
  createdAt: Date
  tx: Transaction
  txId: number
  pubkey: string
  signature: string
}

/**
 * Model Signer
 */
export type Signer = {
  address: string
}

/**
 * Model ProtocolAddress
 */
export type ProtocolAddress = {
  protocol: string
  address: string
}

/**
 * Enums
 */

// Based on
// https://github.com/microsoft/TypeScript/issues/3192#issuecomment-261720275

export enum MatchStatusEnum {
  MATCHED = 'MATCHED',
  UNMATCHED = 'UNMATCHED',
  INACTIVE = 'INACTIVE',
}

export type MatchStatus = (typeof MatchStatusEnum)[keyof typeof MatchStatusEnum]

export enum MatchVaultChangeTypeEnum {
  DEPOSIT = 'DEPOSIT',
  WITHDRAW = 'WITHDRAW',
}

export type MatchVaultChangeType =
  (typeof MatchVaultChangeTypeEnum)[keyof typeof MatchVaultChangeTypeEnum]

export enum TradeStatusEnum {
  PENDING = 'PENDING',
  CANCELLED = 'CANCELLED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
}

export type TradeStatus = (typeof TradeStatusEnum)[keyof typeof TradeStatusEnum]

export enum TradeDirectionEnum {
  SHORT = 'SHORT',
  LONG = 'LONG',
}

export type TradeDirection =
  (typeof TradeDirectionEnum)[keyof typeof TradeDirectionEnum]

export enum TradeTypeEnum {
  HEDGED = 'HEDGED',
  UNHEDGED = 'UNHEDGED',
}

export type TradeType = (typeof TradeTypeEnum)[keyof typeof TradeTypeEnum]

export enum NotificationStatusEnum {
  SENT = 'SENT',
  NOT_NEEDED = 'NOT_NEEDED',
  PENDING = 'PENDING',
}

export type NotificationStatus =
  (typeof NotificationStatusEnum)[keyof typeof NotificationStatusEnum]

export enum NotifTypeEnum {
  LENDER_OPEN = 'LENDER_OPEN',
  LENDER_CLOSE = 'LENDER_CLOSE',
  TRADER_ON_REQUEST_TO_CLOSE = 'TRADER_ON_REQUEST_TO_CLOSE',
}

export type NotifType = (typeof NotifTypeEnum)[keyof typeof NotifTypeEnum]

export enum PersonaEnum {
  TRADER = 'TRADER',
  MATCHER = 'MATCHER',
}

export type PersonaType = (typeof PersonaEnum)[keyof typeof PersonaEnum]

export enum NetworkEnum {
  ETHEREUM = 'ETHEREUM',
  SIFCHAIN = 'SIFCHAIN',
}

export type Network = (typeof NetworkEnum)[keyof typeof NetworkEnum]

export enum TransactionStatus {
  SIGNING = 'SIGNING',
  BROADCASTED = 'BROADCASTED',
  FAILED = 'FAILED',
}

export enum TradeCloseReason {
  MAX_PROFIT = 'MAX_PROFIT',
  TAKE_PROFIT = 'TAKE_PROFIT',
  LIQUIDATION = 'LIQUIDATION',
  STOP_LOSS = 'STOP_LOSS',
  REQUEST_TO_CLOSE_WINDOW_HIT = 'REQUEST_TO_CLOSE_WINDOW_HIT',
  MANUALLY_CLOSED = 'MANUALLY_CLOSED',
}

export enum TradeNotOpenReason {
  LIMIT_PRICE = 'LIMIT_PRICE',
  NO_MATCH = 'NO_MATCH',
  SHOULD_BE_CLOSED = 'SHOULD_BE_CLOSED',
  ERROR = 'ERROR',
  NOT_ENOUGH_FUNDS_MVA = 'NOT_ENOUGH_FUNDS_MVA',
  NOT_ENOUGH_FUNDS_PTA = 'NOT_ENOUGH_FUNDS_PTA',
}

export enum HedgeTradeStatus {
  CLOSED_PENDING_DYDX_WITHDRAWAL = 'CLOSED_PENDING_DYDX_WITHDRAWAL',
  CLOSED_PENDING_BRIDGE_TO_SIF = 'CLOSED_PENDING_BRIDGE_TO_SIF',
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  FILLED = 'FILLED',
  CANCELED = 'CANCELED',
  BEST_EFFORT_CANCELED = 'BEST_EFFORT_CANCELED',
  UNTRIGGERED = 'UNTRIGGERED',
  BEST_EFFORT_OPENED = 'BEST_EFFORT_OPENED',
}

/**
 * Model new_margin_transaction
 *
 */
export type new_margin_transaction = {
  id: number
  time: string | null
  sender_address: string | null
  receiver_address: string | null
  token_type: string | null
  token_amount: string | null
  memo: string | null
  height: string | null
  is_processed: boolean | null
}

export type OverallTrade = {
  trade: Trade
  hedgeTrade: HedgeTrade | null
}

export enum PnlTypeEnum {
  REALIZED = 'REALIZED',
  UNREALIZED = 'UNREALIZED',
  OVERALL = 'OVERALL',
}
