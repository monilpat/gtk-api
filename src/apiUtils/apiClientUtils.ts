import { Trade, TradeCloseReason, TradeDirectionEnum } from "../api/types";
import BigNumber from "bignumber.js";
import { DeliverTxResponse } from "@sifchain/sdk";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { SigningStargateClient } from "@cosmjs/stargate";
import { TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { getConfig, NetworkEnv, PROFILE_LOOKUP } from "../common";
import { SdkConfig } from "./constants";
import {
  DEFAULT_TRANSACTION_TOKEN_DENOM,
  DydxMarket,
  HOURS_IN_YEAR,
  MAINNET_SIF_ENV,
  MAX_PROFIT_MULTIPLIER,
  Memo,
  PROCESS,
  TESTNET_SIF_ENV,
  TOKEN_PRECISION_MAP,
  TRADER_APY,
  hedgeInterestMultiplier,
  tokenToMarket,
} from "./constants/constants";
import { RegistryEntry } from "@sifchain/sdk/build/typescript/generated/proto/sifnode/tokenregistry/v1/types";
import { createClients, indexerClient, initialized } from "./dydxClients";
import { IndexerClient } from "@dydxprotocol/v4-client-js";

const tokenPrecisionCache: { [key: string]: number } = {};
export const getPrecisionForToken = (tokenData: RegistryEntry): number => {
  let tokenPrecision: number;
  if (tokenPrecisionCache[tokenData.baseDenom]) {
    tokenPrecision = tokenPrecisionCache[tokenData.baseDenom];
  } else {
    tokenPrecision = Number(
      BigInt(tokenData.decimals.high) + BigInt(tokenData.decimals.low)
    );
    tokenPrecisionCache[tokenData.baseDenom] = tokenPrecision;
  }
  return tokenPrecision;
};

export const onCloseTradeAPI = async (
  trade: Trade,
  offlineSigner: DirectSecp256k1HdWallet,
  rpcUrl: string
): Promise<DeliverTxResponse | null> => {
  const { id, traderAddress } = trade;
  const rowanPrecision = 18;
  const minAmount = BigNumber(10)
    .exponentiatedBy(-rowanPrecision)
    .toFixed(rowanPrecision);
  try {
    const txn = await signAndBroadcastTransaction(
      offlineSigner,
      traderAddress,
      `${process.env.NEXT_PUBLIC_PENDING_TRADE_ADDRESS}`,
      DEFAULT_TRANSACTION_TOKEN_DENOM,
      minAmount,
      {
        transaction_type: "close_trade",
        data: {
          trade_id: String(id),
        },
      },
      rowanPrecision,
      rpcUrl
    );
    return txn;
  } catch (ex) {
    console.error(ex);
  }
  return null;
};

export const onCancelTradeRequestAPI = async (
  trade: Trade,
  offlineSigner: DirectSecp256k1HdWallet,
  rpcUrl: string
): Promise<DeliverTxResponse | null> => {
  const { id, traderAddress } = trade;
  const rowanPrecision = 18;
  const minAmount = BigNumber(10)
    .exponentiatedBy(-rowanPrecision)
    .toFixed(rowanPrecision);
  try {
    const txn = await signAndBroadcastTransaction(
      offlineSigner,
      traderAddress,
      `${process.env.NEXT_PUBLIC_PENDING_TRADE_ADDRESS}`,
      DEFAULT_TRANSACTION_TOKEN_DENOM,
      minAmount,
      {
        transaction_type: "cancel_trade_request",
        data: {
          trade_id: String(id),
        },
      },
      rowanPrecision,
      rpcUrl
    );

    return txn;
  } catch (ex) {
    console.error(ex);
  }
  return null;
};

export const signAndBroadcastTransaction = async (
  offlineSigner: DirectSecp256k1HdWallet,
  sendingAddress: string,
  receivingAddress: string,
  collateralTokenType: string,
  collateralTokenAmount: string,
  memo: Memo,
  collateralPrecision: number,
  rpcUrl: string
): Promise<DeliverTxResponse> => {
  const client = await SigningStargateClient.connectWithSigner(
    rpcUrl,
    offlineSigner
  );
  const txnRaw = await client.sign(
    sendingAddress,
    [
      {
        typeUrl: "/cosmos.bank.v1beta1.MsgSend",
        value: {
          fromAddress: sendingAddress,
          toAddress: receivingAddress,
          amount: [
            {
              denom: collateralTokenType,
              amount: BigNumber(collateralTokenAmount)
                .times(BigNumber(10).exponentiatedBy(collateralPrecision))
                .toFixed(0),
            },
          ],
        },
      },
    ],
    {
      amount: [
        {
          denom: "rowan",
          amount: BigNumber(10).exponentiatedBy(18).toFixed(0),
        },
      ],
      gas: "250000",
    },
    JSON.stringify(memo)
  );
  const txBytes = TxRaw.encode(txnRaw).finish();
  const txn = await client.broadcastTx(txBytes);
  await client.getTx(txn.transactionHash);
  console.log("txn ", txn);
  return txn;
};

export const onRequestATradeAPI = async (
  offlineSigner: DirectSecp256k1HdWallet,
  accountAddress: string,
  collateralType: string,
  collateralAmount: string,
  tradeData: Memo["data"],
  collateralPrecision: number,
  rpcUrl: string
): Promise<DeliverTxResponse | null> => {
  try {
    const txn = await signAndBroadcastTransaction(
      offlineSigner,
      accountAddress,
      `${process.env.NEXT_PUBLIC_PENDING_TRADE_ADDRESS}`,
      collateralType,
      collateralAmount,
      {
        transaction_type: "open_trade",
        data: tradeData,
      },
      collateralPrecision,
      rpcUrl
    );
    console.log("txn", txn);
    return txn;
  } catch (ex) {
    console.error(ex);
  }
  return null;
};

export const shouldCloseTrade = (
  targetTokenType: string,
  tradeEntryPrice: string,
  tradeDirection: TradeDirectionEnum,
  leverage: string,
  takeProfit: string | null,
  stopLoss: string | null,
  requestToCloseTime: Date | null,
  closeTxnHash: string | null,
  closeReason: TradeCloseReason | null,
  currentPrice: string
): { shouldClose: boolean; reason: TradeCloseReason } => {
  let closeTradeRequestPast = false;
  // If request to close time has passed and not manually closed, then close
  if (
    requestToCloseTime !== null &&
    BigNumber(new Date(requestToCloseTime).getTime()).isLessThanOrEqualTo(
      Date.now()
    ) &&
    closeReason !== TradeCloseReason.MANUALLY_CLOSED
  ) {
    console.log(
      `closing since request to close time past ${new Date(
        requestToCloseTime
      )} and current time is ${Date.now()}`
    );
    closeTradeRequestPast = true;
  }
  if (closeTradeRequestPast) {
    return {
      shouldClose: true,
      reason: TradeCloseReason.REQUEST_TO_CLOSE_WINDOW_HIT,
    };
  }
  let takeProfitHit = false;
  let stopLossHit = false;
  let maxProfitHit = false;
  let liquidationHit = false;
  let maxProfit = BigNumber(0);
  let liquidationPrice = BigNumber(0);
  const currPrice = BigNumber(currentPrice);
  const targetPrecision = TOKEN_PRECISION_MAP[targetTokenType];
  // Need to resolve SLIPPAGE_TOLERANCE discrepancy
  // longMaxProfit = shortLiquidation
  // shortMaxProfit = longLiquidation
  if (tradeDirection === TradeDirectionEnum.LONG) {
    maxProfit = BigNumber(MAX_PROFIT_MULTIPLIER - 1)
      .times(tradeEntryPrice)
      .times(BigNumber(1).plus(BigNumber(1).dividedBy(leverage)));
    maxProfitHit = currPrice.isGreaterThanOrEqualTo(maxProfit);
    if (takeProfit !== null && takeProfit != "0.0") {
      takeProfitHit = currPrice.isGreaterThanOrEqualTo(takeProfit);
    }
    if (stopLoss !== null && stopLoss != "0.0") {
      stopLossHit = currPrice.isLessThanOrEqualTo(stopLoss);
    }
    liquidationPrice = BigNumber(tradeEntryPrice).times(
      BigNumber(1).minus(BigNumber(1).dividedBy(BigNumber(leverage).plus(1)))
    );
    liquidationHit = currPrice.isLessThanOrEqualTo(liquidationPrice);
  } else if (tradeDirection === TradeDirectionEnum.SHORT) {
    maxProfit = BigNumber(MAX_PROFIT_MULTIPLIER - 1)
      .times(tradeEntryPrice)
      .times(
        BigNumber(1).minus(BigNumber(1).dividedBy(BigNumber(leverage).plus(1)))
      );
    maxProfitHit = currPrice.isLessThanOrEqualTo(maxProfit);
    if (takeProfit !== null && takeProfit != "0.0") {
      takeProfitHit = currPrice.isLessThanOrEqualTo(takeProfit);
    }
    if (stopLoss !== null && stopLoss != "0.0") {
      stopLossHit = currPrice.isGreaterThanOrEqualTo(stopLoss);
    }
    liquidationPrice = BigNumber(tradeEntryPrice).times(
      BigNumber(1).plus(BigNumber(1).dividedBy(leverage))
    );
    liquidationHit = currPrice.isGreaterThanOrEqualTo(liquidationPrice);
  }
  const shouldCloseTrade =
    (maxProfitHit || takeProfitHit || stopLossHit || liquidationHit) &&
    closeTxnHash === null;
  let reason = TradeCloseReason.MANUALLY_CLOSED;
  if (shouldCloseTrade) {
    if (maxProfitHit) {
      reason = TradeCloseReason.MAX_PROFIT;
    } else if (takeProfitHit) {
      reason = TradeCloseReason.TAKE_PROFIT;
    } else if (stopLossHit) {
      reason = TradeCloseReason.STOP_LOSS;
    } else if (liquidationHit) {
      reason = TradeCloseReason.LIQUIDATION;
    }
    console.log("tradeEntryPrice ", tradeEntryPrice);
    console.log("currPrice", currPrice.toFixed(targetPrecision));
    console.log("maxProfit Threshold ", maxProfit.toFixed(targetPrecision));
    console.log("maxProfitHit ", maxProfitHit);
    console.log(
      "takeProfit Threshold ",
      BigNumber(takeProfit ?? 0).toFixed(targetPrecision)
    );
    console.log("takeProfitHit ", takeProfitHit);
    console.log(
      "stopLoss Threshold ",
      BigNumber(stopLoss ?? 0).toFixed(targetPrecision)
    );
    console.log("stopLossHit ", stopLossHit);
    console.log("liquidationPrice ", liquidationPrice.toFixed(targetPrecision));
    console.log("liquidationHit ", liquidationHit);
    console.log("shouldCloseTrade ", shouldCloseTrade);
  }
  return { shouldClose: shouldCloseTrade, reason: reason };
};

const envConfigCache: { [key: string]: SdkConfig } = {};
export async function getEnvConfig(params: {
  environment: NetworkEnv;
}): Promise<SdkConfig> {
  let envConfig: SdkConfig;
  if (envConfigCache[params.environment]) {
    envConfig = envConfigCache[params.environment];
  } else {
    const {
      kind: tag,
      ethAssetTag,
      sifAssetTag,
    } = PROFILE_LOOKUP[params.environment];

    if (typeof tag === "undefined") {
      throw new Error(`environment "${params.environment}" not found`);
    }
    // @ts-ignore: TS2322
    envConfig = await getConfig(tag, sifAssetTag, ethAssetTag);
    envConfigCache[params.environment] = envConfig;
  }
  return envConfig;
}

export const getEffectiveInterestRateForMarket = async (
  targetTokenType: string
): Promise<number> => {
  if (!initialized) {
    await createClients(
      PROCESS.USE_TESTNET === "true" ? TESTNET_SIF_ENV : MAINNET_SIF_ENV
    );
  }
  const market = tokenToMarket[targetTokenType];
  const matcherInterestRate = await getEffectiveAnnualizedFundingRate(
    indexerClient,
    market
  );
  if (matcherInterestRate == null) {
    return TRADER_APY;
  }
  return BigNumber.max(
    TRADER_APY,
    BigNumber(matcherInterestRate).times(hedgeInterestMultiplier)
  ).toNumber();
};

export const getEffectiveAnnualizedFundingRate = async (
  client: IndexerClient,
  market: DydxMarket
) => {
  if (!initialized) {
    await createClients(
      PROCESS.USE_TESTNET === "true" ? TESTNET_SIF_ENV : MAINNET_SIF_ENV
    );
  }
  const fundingRate = await getLatestFundingRateForMarket(client, market);
  return fundingRate == null ? TRADER_APY : Number(fundingRate) * HOURS_IN_YEAR;
};

export const getLatestFundingRateForMarket = async (
  client: IndexerClient,
  market: DydxMarket
): Promise<string | null> => {
  try {
    const markets = await client.markets.getPerpetualMarkets(market);
    const nextFundingRate = markets.markets[market]["nextFundingRate"];
    return nextFundingRate;
  } catch (error: any) {
    console.log(error.message);
  }
  return null;
};
