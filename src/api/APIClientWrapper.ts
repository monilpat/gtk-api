import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import {
  Trade,
  TradeDirectionEnum,
  TradeStatusEnum,
  MatchVault,
  PnlTypeEnum,
} from "../serverUtils/dbTypes";
import { IAPIClient } from "./IAPIClient";
import { NetworkEnv } from "../common";
import { APIClient as InternalAPIClient } from "../internal/apiClient"; // Import from internal
import { DeliverTxResponse } from "@sifchain/sdk";

/**
 * Wrapper for the internal API client to manage and execute trade operations.
 *
 * @example
 * // Example usage of APIClientWrapper
 * import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
 * import { APIClientWrapper } from './APIClientWrapper';
 *
 * async function main() {
 *   const wallet = await DirectSecp256k1HdWallet.fromMnemonic("your-mnemonic");
 *   const client = await APIClientWrapper.create(wallet,'mainnet');
 *
 *   // Place an order
 *   const response = await client.placeOrder(
 *     'btc',
 *     100,
 *     'uusdc',
 *     TradeDirectionEnum.LONG,
 *     2,
 *     50,
 *     150,
 *     null
 *   );
 *   console.log(response);
 * }
 *
 * main();
 */
export class APIClientWrapper implements IAPIClient {
  private apiClient: InternalAPIClient;

  /**
   * Private constructor to initialize the APIClientWrapper.
   * @param apiClient - The internal API client instance.
   */
  private constructor(apiClient: InternalAPIClient) {
    this.apiClient = apiClient;
  }

  /**
   * Factory method to create an instance of APIClientWrapper.
   * @param wallet - The wallet instance for signing transactions.
   * @param network - The network environment to connect to.
   * @returns A promise that resolves to an APIClientWrapper instance.
   */
  static async create(
    wallet: DirectSecp256k1HdWallet,
    network: NetworkEnv
  ): Promise<APIClientWrapper> {
    const apiClient = await InternalAPIClient.create(wallet, network);
    return new APIClientWrapper(apiClient);
  }

  /**
   * Places a new order.
   * @param tokenType - The type of the token to trade.
   * @param tokenAmount - The amount of the token to trade.
   * @param targetTokenType - The type of the target token.
   * @param tradeDirection - The direction of the trade (LONG or SHORT).
   * @param leverage - The leverage to use for the trade.
   * @param stopLoss - The stop loss value, if any.
   * @param takeProfit - The take profit value, if any.
   * @param limitPrice - The limit price for the order, if any.
   * @returns A promise that resolves to the transaction response or null if failed.
   */
  async placeOrder(
    tokenType: string,
    tokenAmount: number,
    targetTokenType: string,
    tradeDirection: TradeDirectionEnum,
    leverage: number,
    stopLoss: number | null,
    takeProfit: number | null,
    limitPrice: number | null
  ): Promise<DeliverTxResponse | null> {
    return this.apiClient.placeOrder(
      tokenType as "atom" | "uusdc",
      tokenAmount,
      targetTokenType,
      tradeDirection,
      leverage,
      stopLoss,
      takeProfit,
      limitPrice
    );
  }

  /**
   * Closes an existing order.
   * @param tradeId - The ID of the trade to close.
   * @returns A promise that resolves to the transaction response or null if failed.
   */
  async closeOrder(tradeId: number): Promise<DeliverTxResponse | null> {
    return this.apiClient.closeOrder(tradeId);
  }

  /**
   * Cancels an existing order.
   * @param tradeId - The ID of the trade to cancel.
   * @returns A promise that resolves to the transaction response or null if failed.
   */
  async cancelOrder(tradeId: number): Promise<DeliverTxResponse | null> {
    return this.apiClient.cancelOrder(tradeId);
  }

  /**
   * Retrieves the current interest rate for a given token.
   * @param targetTokenType - The type of the target token.
   * @returns A promise that resolves to the current interest rate.
   */
  async getCurrentInterestRate(targetTokenType: string): Promise<number> {
    return this.apiClient.getCurrentInterestRate(targetTokenType);
  }

  /**
   * Retrieves a list of trades. If both are undefined returns all trades for your address.
   * @param tradeType - The type of the trade (LONG or SHORT), if any.
   * @param status - The status of the trade (PENDING, ACTIVE, etc.), if any.
   * @returns A promise that resolves to an array of trades.
   */
  async getTrades(
    tradeType: TradeDirectionEnum | undefined,
    status: TradeStatusEnum | undefined
  ): Promise<Trade[]> {
    return this.apiClient.getTrades(tradeType, status);
  }

  /**
   * Retrieves a specific trade by its ID.
   * @param tradeId - The ID of the trade to retrieve.
   * @returns A promise that resolves to the trade or null if not found.
   */
  async getTrade(tradeId: number): Promise<Trade | null> {
    return this.apiClient.getTrade(tradeId);
  }

  /**
   * Retrieves the top match for a given collateral type.
   * @param collateralType - The type of the collateral.
   * @returns A promise that resolves to the top match vault or null if not found.
   */
  async getTopMatch(collateralType: string): Promise<MatchVault | null> {
    return this.apiClient.getTopMatch(collateralType as "atom" | "uusdc");
  }

  /**
   * Retrieves the profit and loss (PnL) for a given type.
   * @param type - The type of the PnL (REALIZED, UNREALIZED, OVERALL).
   * @returns A promise that resolves to the PnL value.
   */
  async getPnl(type: string): Promise<number> {
    return this.apiClient.getPnl(type as PnlTypeEnum);
  }
}
