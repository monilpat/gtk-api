// IAPIClient.ts
import { DeliverTxResponse } from "@sifchain/sdk";
import {
  CollateralTokenType,
  TargetTokenType,
  Trade,
  TradeDirectionEnum,
  TradeStatusEnum,
} from "./types";

export interface IAPIClient {
  placeOrder(
    tokenType: CollateralTokenType,
    tokenAmount: number,
    targetTokenType: TargetTokenType,
    tradeDirection: TradeDirectionEnum,
    leverage: number,
    stopLoss: number | null,
    takeProfit: number | null,
    limitPrice: number | null
  ): Promise<DeliverTxResponse | null>;
  closeOrder(tradeId: number): Promise<DeliverTxResponse | null>;
  cancelOrder(tradeId: number): Promise<DeliverTxResponse | null>;
  getCurrentInterestRate(targetTokenType: TargetTokenType): Promise<number>;
  getTrades(
    tradeType: TradeDirectionEnum | undefined,
    status: TradeStatusEnum | undefined
  ): Promise<Trade[]>;
  getTrade(tradeId: number): Promise<Trade | null>;
  getTopMatch(
    collateralType: CollateralTokenType,
    collateralTokenAmount: number
  ): Promise<number | null>;
  getPnl(type: string): Promise<number>;
}
