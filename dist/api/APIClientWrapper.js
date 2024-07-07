"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.APIClientWrapper = void 0;
const apiClient_1 = require("../internal/apiClient");
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
class APIClientWrapper {
    /**
     * Private constructor to initialize the APIClientWrapper.
     * @param apiClient - The internal API client instance.
     */
    constructor(apiClient) {
        this.apiClient = apiClient;
    }
    /**
     * Factory method to create an instance of APIClientWrapper.
     * @param wallet - The wallet instance for signing transactions.
     * @param network - The network environment to connect to.
     * @returns A promise that resolves to an APIClientWrapper instance.
     */
    static create(wallet, network) {
        return __awaiter(this, void 0, void 0, function* () {
            const apiClient = yield apiClient_1.APIClient.create(wallet, network);
            return new APIClientWrapper(apiClient);
        });
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
    placeOrder(tokenType, tokenAmount, targetTokenType, tradeDirection, leverage, stopLoss, takeProfit, limitPrice) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.apiClient.placeOrder(tokenType, tokenAmount, targetTokenType, tradeDirection, leverage, stopLoss, takeProfit, limitPrice);
        });
    }
    /**
     * Closes an existing order.
     * @param tradeId - The ID of the trade to close.
     * @returns A promise that resolves to the transaction response or null if failed.
     */
    closeOrder(tradeId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.apiClient.closeOrder(tradeId);
        });
    }
    /**
     * Cancels an existing order.
     * @param tradeId - The ID of the trade to cancel.
     * @returns A promise that resolves to the transaction response or null if failed.
     */
    cancelOrder(tradeId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.apiClient.cancelOrder(tradeId);
        });
    }
    /**
     * Retrieves the current interest rate for a given token.
     * @param targetTokenType - The type of the target token.
     * @returns A promise that resolves to the current interest rate.
     */
    getCurrentInterestRate(targetTokenType) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.apiClient.getCurrentInterestRate(targetTokenType);
        });
    }
    /**
     * Retrieves a list of trades. If both are undefined returns all trades for your address.
     * @param tradeType - The type of the trade (LONG or SHORT), if any.
     * @param status - The status of the trade (PENDING, ACTIVE, etc.), if any.
     * @returns A promise that resolves to an array of trades.
     */
    getTrades(tradeType, status) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.apiClient.getTrades(tradeType, status);
        });
    }
    /**
     * Retrieves a specific trade by its ID.
     * @param tradeId - The ID of the trade to retrieve.
     * @returns A promise that resolves to the trade or null if not found.
     */
    getTrade(tradeId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.apiClient.getTrade(tradeId);
        });
    }
    /**
     * Retrieves the top match for a given collateral type greater than or equal to the given amount, if it exists
     * @param collateralType - The type of the collateral.
     * @param collateralTokenAmount - The amount of the collateral.
     * @returns A promise that resolves to the top match amount in USD or null if not found.
     */
    getTopMatch(collateralType, collateralTokenAmount) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.apiClient.getTopMatch(collateralType, collateralTokenAmount);
        });
    }
    /**
     * Retrieves the profit and loss (PnL) for a given type.
     * @param type - The type of the PnL (REALIZED, UNREALIZED, OVERALL).
     * @returns A promise that resolves to the PnL value.
     */
    getPnl(type) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.apiClient.getPnl(type);
        });
    }
}
exports.APIClientWrapper = APIClientWrapper;
