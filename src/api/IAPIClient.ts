// IAPIClient.ts
import { DeliverTxResponse } from '@sifchain/sdk'
import {
  Trade,
  TradeDirectionEnum,
  TradeStatusEnum,
  MatchVault,
} from '~/serverUtils/dbTypes'

export interface IAPIClient {
  placeOrder(
    tokenType: string,
    tokenAmount: number,
    targetTokenType: string,
    tradeDirection: TradeDirectionEnum,
    leverage: number,
    stopLoss: number | null,
    takeProfit: number | null,
    limitPrice: number | null
  ): Promise<DeliverTxResponse | null>

  closeOrder(tradeId: number): Promise<DeliverTxResponse | null>
  cancelOrder(tradeId: number): Promise<DeliverTxResponse | null>
  getCurrentInterestRate(targetTokenType: string): Promise<number>
  getTrades(
    tradeType: TradeDirectionEnum | undefined,
    status: TradeStatusEnum | undefined
  ): Promise<Trade[]>
  getTrade(tradeId: string): Promise<Trade | null>
  getTopMatch(collateralType: string): Promise<MatchVault | null>
  getPnl(type: string): Promise<number>
}
