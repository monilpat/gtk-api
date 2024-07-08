import { CollateralTokenType, TargetTokenType, PnlTypeEnum, Trade, TradeDirectionEnum, TradeStatusEnum } from "../api/types";
import { IAPIClient } from "../api/IAPIClient";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { DeliverTxResponse } from "@sifchain/sdk";
export declare class APIClient implements IAPIClient {
    private wallet;
    private network;
    private address;
    private sifRpcUrl;
    constructor(wallet: DirectSecp256k1HdWallet, address: string, network: "mainnet" | "testnet", sifRpcUrl: string | null);
    static create(wallet: DirectSecp256k1HdWallet, network: "mainnet" | "testnet"): Promise<APIClient>;
    placeOrder(tokenType: CollateralTokenType, tokenAmount: number, targetTokenType: TargetTokenType, tradeDirection: TradeDirectionEnum, leverage: number, stopLoss: number | null, takeProfit: number | null, limitPrice: number | null): Promise<DeliverTxResponse | null>;
    closeOrder(tradeId: number): Promise<DeliverTxResponse | null>;
    cancelOrder(tradeId: number): Promise<DeliverTxResponse | null>;
    getCurrentInterestRate(targetTokenType: TargetTokenType): Promise<number>;
    getTrades(tradeType: TradeDirectionEnum | undefined, status: TradeStatusEnum | undefined): Promise<Trade[]>;
    getTrade(tradeId: number): Promise<Trade | null>;
    getTopMatch(collateralType: CollateralTokenType, collateralTokenAmount: number): Promise<number | null>;
    getPnl(type: PnlTypeEnum): Promise<{
        [key: string]: number;
    }>;
}
