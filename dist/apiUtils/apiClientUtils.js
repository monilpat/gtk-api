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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLatestFundingRateForMarket = exports.getEffectiveAnnualizedFundingRate = exports.getEffectiveInterestRateForMarket = exports.shouldCloseTrade = exports.onRequestATradeAPI = exports.signAndBroadcastTransaction = exports.onCancelTradeRequestAPI = exports.onCloseTradeAPI = exports.getPrecisionForToken = void 0;
const types_1 = require("../api/types");
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const stargate_1 = require("@cosmjs/stargate");
const tx_1 = require("cosmjs-types/cosmos/tx/v1beta1/tx");
const constants_1 = require("./constants");
const dydxClients_1 = require("./dydxClients");
const tokenPrecisionCache = {};
const getPrecisionForToken = (tokenData) => {
    let tokenPrecision;
    if (tokenPrecisionCache[tokenData.baseDenom]) {
        tokenPrecision = tokenPrecisionCache[tokenData.baseDenom];
    }
    else {
        tokenPrecision = Number(BigInt(tokenData.decimals.high) + BigInt(tokenData.decimals.low));
        tokenPrecisionCache[tokenData.baseDenom] = tokenPrecision;
    }
    return tokenPrecision;
};
exports.getPrecisionForToken = getPrecisionForToken;
const onCloseTradeAPI = (trade, offlineSigner, rpcUrl) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { id, traderAddress } = trade;
    const sendingAddress = (_a = (yield offlineSigner.getAccounts())[0]) === null || _a === void 0 ? void 0 : _a.address;
    if (sendingAddress !== traderAddress) {
        console.error("sending address does not match trader address on trade");
        return null;
    }
    const rowanPrecision = 18;
    const minAmount = (0, bignumber_js_1.default)(10)
        .exponentiatedBy(-rowanPrecision)
        .toFixed(rowanPrecision);
    try {
        const txn = yield (0, exports.signAndBroadcastTransaction)(offlineSigner, traderAddress, constants_1.PROCESS.PENDING_TRADE_ADDRESS, constants_1.DEFAULT_TRANSACTION_TOKEN_DENOM, minAmount, {
            transaction_type: "close_trade",
            data: {
                trade_id: String(id),
            },
        }, rowanPrecision, rpcUrl);
        return txn;
    }
    catch (ex) {
        console.error(ex);
    }
    return null;
});
exports.onCloseTradeAPI = onCloseTradeAPI;
const onCancelTradeRequestAPI = (trade, offlineSigner, rpcUrl) => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    const { id, traderAddress } = trade;
    const sendingAddress = (_b = (yield offlineSigner.getAccounts())[0]) === null || _b === void 0 ? void 0 : _b.address;
    if (sendingAddress !== traderAddress) {
        console.error("sending address does not match trader address on trade");
        return null;
    }
    const rowanPrecision = 18;
    const minAmount = (0, bignumber_js_1.default)(10)
        .exponentiatedBy(-rowanPrecision)
        .toFixed(rowanPrecision);
    try {
        const txn = yield (0, exports.signAndBroadcastTransaction)(offlineSigner, traderAddress, constants_1.PROCESS.PENDING_TRADE_ADDRESS, constants_1.DEFAULT_TRANSACTION_TOKEN_DENOM, minAmount, {
            transaction_type: "cancel_trade_request",
            data: {
                trade_id: String(id),
            },
        }, rowanPrecision, rpcUrl);
        return txn;
    }
    catch (ex) {
        console.error(ex);
    }
    return null;
});
exports.onCancelTradeRequestAPI = onCancelTradeRequestAPI;
const signAndBroadcastTransaction = (offlineSigner, sendingAddress, receivingAddress, collateralTokenType, collateralTokenAmount, memo, collateralPrecision, rpcUrl) => __awaiter(void 0, void 0, void 0, function* () {
    const client = yield stargate_1.SigningStargateClient.connectWithSigner(rpcUrl, offlineSigner);
    const txnRaw = yield client.sign(sendingAddress, [
        {
            typeUrl: "/cosmos.bank.v1beta1.MsgSend",
            value: {
                fromAddress: sendingAddress,
                toAddress: receivingAddress,
                amount: [
                    {
                        denom: collateralTokenType,
                        amount: (0, bignumber_js_1.default)(collateralTokenAmount)
                            .times((0, bignumber_js_1.default)(10).exponentiatedBy(collateralPrecision))
                            .toFixed(0),
                    },
                ],
            },
        },
    ], {
        amount: [
            {
                denom: "rowan",
                amount: (0, bignumber_js_1.default)(10).exponentiatedBy(18).toFixed(0),
            },
        ],
        gas: "250000",
    }, JSON.stringify(memo));
    const txBytes = tx_1.TxRaw.encode(txnRaw).finish();
    const txn = yield client.broadcastTx(txBytes);
    yield client.getTx(txn.transactionHash);
    console.log("txn ", txn);
    return txn;
});
exports.signAndBroadcastTransaction = signAndBroadcastTransaction;
const onRequestATradeAPI = (offlineSigner, accountAddress, collateralType, collateralAmount, tradeData, collateralPrecision, rpcUrl) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const txn = yield (0, exports.signAndBroadcastTransaction)(offlineSigner, accountAddress, constants_1.PROCESS.PENDING_TRADE_ADDRESS, collateralType, collateralAmount, {
            transaction_type: "open_trade",
            data: tradeData,
        }, collateralPrecision, rpcUrl);
        console.log("txn", txn);
        return txn;
    }
    catch (ex) {
        console.error(ex);
    }
    return null;
});
exports.onRequestATradeAPI = onRequestATradeAPI;
const shouldCloseTrade = (targetTokenType, tradeEntryPrice, tradeDirection, leverage, takeProfit, stopLoss, requestToCloseTime, closeTxnHash, closeReason, currentPrice) => {
    let closeTradeRequestPast = false;
    // If request to close time has passed and not manually closed, then close
    if (requestToCloseTime !== null &&
        (0, bignumber_js_1.default)(new Date(requestToCloseTime).getTime()).isLessThanOrEqualTo(Date.now()) &&
        closeReason !== types_1.TradeCloseReason.MANUALLY_CLOSED) {
        console.log(`closing since request to close time past ${new Date(requestToCloseTime)} and current time is ${Date.now()}`);
        closeTradeRequestPast = true;
    }
    if (closeTradeRequestPast) {
        return {
            shouldClose: true,
            reason: types_1.TradeCloseReason.REQUEST_TO_CLOSE_WINDOW_HIT,
        };
    }
    let takeProfitHit = false;
    let stopLossHit = false;
    let maxProfitHit = false;
    let liquidationHit = false;
    let maxProfit = (0, bignumber_js_1.default)(0);
    let liquidationPrice = (0, bignumber_js_1.default)(0);
    const currPrice = (0, bignumber_js_1.default)(currentPrice);
    const targetPrecision = constants_1.TOKEN_PRECISION_MAP[targetTokenType];
    // Need to resolve SLIPPAGE_TOLERANCE discrepancy
    // longMaxProfit = shortLiquidation
    // shortMaxProfit = longLiquidation
    if (tradeDirection === types_1.TradeDirectionEnum.LONG) {
        maxProfit = (0, bignumber_js_1.default)(constants_1.MAX_PROFIT_MULTIPLIER - 1)
            .times(tradeEntryPrice)
            .times((0, bignumber_js_1.default)(1).plus((0, bignumber_js_1.default)(1).dividedBy(leverage)));
        maxProfitHit = currPrice.isGreaterThanOrEqualTo(maxProfit);
        if (takeProfit !== null && takeProfit != "0.0") {
            takeProfitHit = currPrice.isGreaterThanOrEqualTo(takeProfit);
        }
        if (stopLoss !== null && stopLoss != "0.0") {
            stopLossHit = currPrice.isLessThanOrEqualTo(stopLoss);
        }
        liquidationPrice = (0, bignumber_js_1.default)(tradeEntryPrice).times((0, bignumber_js_1.default)(1).minus((0, bignumber_js_1.default)(1).dividedBy((0, bignumber_js_1.default)(leverage).plus(1))));
        liquidationHit = currPrice.isLessThanOrEqualTo(liquidationPrice);
    }
    else if (tradeDirection === types_1.TradeDirectionEnum.SHORT) {
        maxProfit = (0, bignumber_js_1.default)(constants_1.MAX_PROFIT_MULTIPLIER - 1)
            .times(tradeEntryPrice)
            .times((0, bignumber_js_1.default)(1).minus((0, bignumber_js_1.default)(1).dividedBy((0, bignumber_js_1.default)(leverage).plus(1))));
        maxProfitHit = currPrice.isLessThanOrEqualTo(maxProfit);
        if (takeProfit !== null && takeProfit != "0.0") {
            takeProfitHit = currPrice.isLessThanOrEqualTo(takeProfit);
        }
        if (stopLoss !== null && stopLoss != "0.0") {
            stopLossHit = currPrice.isGreaterThanOrEqualTo(stopLoss);
        }
        liquidationPrice = (0, bignumber_js_1.default)(tradeEntryPrice).times((0, bignumber_js_1.default)(1).plus((0, bignumber_js_1.default)(1).dividedBy(leverage)));
        liquidationHit = currPrice.isGreaterThanOrEqualTo(liquidationPrice);
    }
    const shouldCloseTrade = (maxProfitHit || takeProfitHit || stopLossHit || liquidationHit) &&
        closeTxnHash === null;
    let reason = types_1.TradeCloseReason.MANUALLY_CLOSED;
    if (shouldCloseTrade) {
        if (maxProfitHit) {
            reason = types_1.TradeCloseReason.MAX_PROFIT;
        }
        else if (takeProfitHit) {
            reason = types_1.TradeCloseReason.TAKE_PROFIT;
        }
        else if (stopLossHit) {
            reason = types_1.TradeCloseReason.STOP_LOSS;
        }
        else if (liquidationHit) {
            reason = types_1.TradeCloseReason.LIQUIDATION;
        }
        console.log("tradeEntryPrice ", tradeEntryPrice);
        console.log("currPrice", currPrice.toFixed(targetPrecision));
        console.log("maxProfit Threshold ", maxProfit.toFixed(targetPrecision));
        console.log("maxProfitHit ", maxProfitHit);
        console.log("takeProfit Threshold ", (0, bignumber_js_1.default)(takeProfit !== null && takeProfit !== void 0 ? takeProfit : 0).toFixed(targetPrecision));
        console.log("takeProfitHit ", takeProfitHit);
        console.log("stopLoss Threshold ", (0, bignumber_js_1.default)(stopLoss !== null && stopLoss !== void 0 ? stopLoss : 0).toFixed(targetPrecision));
        console.log("stopLossHit ", stopLossHit);
        console.log("liquidationPrice ", liquidationPrice.toFixed(targetPrecision));
        console.log("liquidationHit ", liquidationHit);
        console.log("shouldCloseTrade ", shouldCloseTrade);
    }
    return { shouldClose: shouldCloseTrade, reason: reason };
};
exports.shouldCloseTrade = shouldCloseTrade;
const getEffectiveInterestRateForMarket = (targetTokenType) => __awaiter(void 0, void 0, void 0, function* () {
    if (!dydxClients_1.initialized) {
        yield (0, dydxClients_1.createClients)(constants_1.PROCESS.USE_TESTNET === "true" ? constants_1.TESTNET_SIF_ENV : constants_1.MAINNET_SIF_ENV);
    }
    const market = constants_1.tokenToMarket[targetTokenType];
    const matcherInterestRate = yield (0, exports.getEffectiveAnnualizedFundingRate)(dydxClients_1.indexerClient, market);
    if (matcherInterestRate == null) {
        return constants_1.TRADER_APY;
    }
    return bignumber_js_1.default.max(constants_1.TRADER_APY, (0, bignumber_js_1.default)(matcherInterestRate).times(constants_1.hedgeInterestMultiplier)).toNumber();
});
exports.getEffectiveInterestRateForMarket = getEffectiveInterestRateForMarket;
const getEffectiveAnnualizedFundingRate = (client, market) => __awaiter(void 0, void 0, void 0, function* () {
    if (!dydxClients_1.initialized) {
        yield (0, dydxClients_1.createClients)(constants_1.PROCESS.USE_TESTNET === "true" ? constants_1.TESTNET_SIF_ENV : constants_1.MAINNET_SIF_ENV);
    }
    const fundingRate = yield (0, exports.getLatestFundingRateForMarket)(client, market);
    return fundingRate == null ? constants_1.TRADER_APY : Number(fundingRate) * constants_1.HOURS_IN_YEAR;
});
exports.getEffectiveAnnualizedFundingRate = getEffectiveAnnualizedFundingRate;
const getLatestFundingRateForMarket = (client, market) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const markets = yield client.markets.getPerpetualMarkets(market);
        const nextFundingRate = markets.markets[market]["nextFundingRate"];
        return nextFundingRate;
    }
    catch (error) {
        console.log(error.message);
    }
    return null;
});
exports.getLatestFundingRateForMarket = getLatestFundingRateForMarket;
