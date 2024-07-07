import { Trade, TradeCloseReason, TradeDirectionEnum } from "../api/types";
import { DeliverTxResponse } from "@sifchain/sdk";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { DydxMarket, Memo } from "./constants";
import { RegistryEntry } from "@sifchain/sdk/build/typescript/generated/proto/sifnode/tokenregistry/v1/types";
import { IndexerClient } from "@dydxprotocol/v4-client-js";
export declare const getPrecisionForToken: (tokenData: RegistryEntry) => number;
export declare const onCloseTradeAPI: (trade: Trade, offlineSigner: DirectSecp256k1HdWallet, rpcUrl: string) => Promise<DeliverTxResponse | null>;
export declare const onCancelTradeRequestAPI: (trade: Trade, offlineSigner: DirectSecp256k1HdWallet, rpcUrl: string) => Promise<DeliverTxResponse | null>;
export declare const signAndBroadcastTransaction: (offlineSigner: DirectSecp256k1HdWallet, sendingAddress: string, receivingAddress: string, collateralTokenType: string, collateralTokenAmount: string, memo: Memo, collateralPrecision: number, rpcUrl: string) => Promise<DeliverTxResponse>;
export declare const onRequestATradeAPI: (offlineSigner: DirectSecp256k1HdWallet, accountAddress: string, collateralType: string, collateralAmount: string, tradeData: Memo["data"], collateralPrecision: number, rpcUrl: string) => Promise<DeliverTxResponse | null>;
export declare const shouldCloseTrade: (targetTokenType: string, tradeEntryPrice: string, tradeDirection: TradeDirectionEnum, leverage: string, takeProfit: string | null, stopLoss: string | null, requestToCloseTime: Date | null, closeTxnHash: string | null, closeReason: TradeCloseReason | null, currentPrice: string) => {
    shouldClose: boolean;
    reason: TradeCloseReason;
};
export declare const getEffectiveInterestRateForMarket: (targetTokenType: string) => Promise<number>;
export declare const getEffectiveAnnualizedFundingRate: (client: IndexerClient, market: DydxMarket) => Promise<number>;
export declare const getLatestFundingRateForMarket: (client: IndexerClient, market: DydxMarket) => Promise<string | null>;
