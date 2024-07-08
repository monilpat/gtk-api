import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { IAPIClient } from "./IAPIClient";
import { DeliverTxResponse } from "@sifchain/sdk";
import { CollateralTokenType, PnlTypeEnum, TargetTokenType, Trade, TradeDirectionEnum, TradeStatusEnum } from "./types";
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
export declare class APIClientWrapper implements IAPIClient {
    private apiClient;
    /**
     * Private constructor to initialize the APIClientWrapper.
     * @param apiClient - The internal API client instance.
     */
    private constructor();
    /**
     * Factory method to create an instance of APIClientWrapper.
     * @param wallet - The wallet instance for signing transactions.
     * @param network - The network environment to connect to.
     * @returns A promise that resolves to an APIClientWrapper instance.
     */
    static create(wallet: DirectSecp256k1HdWallet, network: "mainnet" | "testnet"): Promise<APIClientWrapper>;
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
    placeOrder(tokenType: CollateralTokenType, tokenAmount: number, targetTokenType: TargetTokenType, tradeDirection: TradeDirectionEnum, leverage: number, stopLoss: number | null, takeProfit: number | null, limitPrice: number | null): Promise<DeliverTxResponse | null>;
    /**
     * Closes an existing order.
     * @param tradeId - The ID of the trade to close.
     * @returns A promise that resolves to the transaction response or null if failed.
     */
    closeOrder(tradeId: number): Promise<DeliverTxResponse | null>;
    /**
     * Cancels an existing order.
     * @param tradeId - The ID of the trade to cancel.
     * @returns A promise that resolves to the transaction response or null if failed.
     */
    cancelOrder(tradeId: number): Promise<DeliverTxResponse | null>;
    /**
     * Retrieves the current interest rate for a given token.
     * @param targetTokenType - The type of the target token.
     * @returns A promise that resolves to the current interest rate.
     */
    getCurrentInterestRate(targetTokenType: TargetTokenType): Promise<number>;
    /**
     * Retrieves a list of trades. If both are undefined returns all trades for your address.
     * @param tradeType - The type of the trade (LONG or SHORT), if any.
     * @param status - The status of the trade (PENDING, ACTIVE, etc.), if any.
     * @returns A promise that resolves to an array of trades.
     */
    getTrades(tradeType: TradeDirectionEnum | undefined, status: TradeStatusEnum | undefined): Promise<Trade[]>;
    /**
     * Retrieves a specific trade by its ID.
     * @param tradeId - The ID of the trade to retrieve.
     * @returns A promise that resolves to the trade or null if not found.
     */
    getTrade(tradeId: number): Promise<Trade | null>;
    /**
     * Retrieves the top match for a given collateral type greater than or equal to the given amount, if it exists
     * @param collateralType - The type of the collateral.
     * @param collateralTokenAmount - The amount of the collateral.
     * @returns A promise that resolves to the top match amount in USD or null if not found.
     */
    getTopMatch(collateralType: CollateralTokenType, collateralTokenAmount: number): Promise<number | null>;
    /**
     * Retrieves the profit and loss (PnL) for a given type.
     * @param type - The type of the PnL (REALIZED, UNREALIZED, OVERALL).
     * @returns A promise that resolves to the PnL value.
     */
    getPnl(type: PnlTypeEnum): Promise<{
        [key: string]: number;
    }>;
}
