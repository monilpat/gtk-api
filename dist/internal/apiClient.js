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
exports.APIClient = void 0;
const constants_1 = require("../apiUtils/constants");
const types_1 = require("../api/types");
const apiUtils_1 = require("../apiUtils/apiUtils");
const apiClientUtils_1 = require("../apiUtils/apiClientUtils");
const dydxClients_1 = require("../apiUtils/dydxClients");
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const nullthrows_1 = __importDefault(require("nullthrows"));
class APIClient {
    constructor(wallet, address, network, sifRpcUrl) {
        this.address = null;
        this.sifRpcUrl = null;
        this.sifRpcUrl = sifRpcUrl;
        this.wallet = wallet;
        this.network = network;
        this.address = address;
    }
    static create(wallet, network) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!dydxClients_1.initialized) {
                yield (0, dydxClients_1.createClients)(network);
            }
            return new APIClient(wallet, (yield wallet.getAccounts())[0].address, network, network === "testnet" ? "https://proxies.sifchain.finance/api/sifchain-testnet/rpc" : "https://proxies.sifchain.finance/api/sifchain-1/rpc");
        });
    }
    placeOrder(tokenType, tokenAmount, targetTokenType, tradeDirection, leverage, stopLoss, takeProfit, limitPrice) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const isInvalidLeverage = !(((0, bignumber_js_1.default)(leverage).isGreaterThanOrEqualTo(0) &&
                (0, bignumber_js_1.default)(leverage).isLessThanOrEqualTo(targetTokenType != null
                    ? (0, bignumber_js_1.default)((_a = constants_1.tokenToLeverage[targetTokenType]) !== null && _a !== void 0 ? _a : 5).times(constants_1.HEDGE_LIQUIDITY_MULTIPLIER)
                    : 20)) ||
                !leverage);
            if (isInvalidLeverage) {
                return null;
            }
            const marketToTradeIn = constants_1.tokenToMarket[targetTokenType];
            const markets = (yield dydxClients_1.indexerClient.markets.getPerpetualMarkets(marketToTradeIn)).markets;
            let tickSize = Math.log10(Number(markets[marketToTradeIn].tickSize));
            tickSize = tickSize >= 0 ? 0 : Math.abs(tickSize);
            const targetTokenPrice = (0, bignumber_js_1.default)((0, bignumber_js_1.default)(markets[marketToTradeIn].oraclePrice).toFixed(tickSize)).toString();
            const { shouldClose } = (0, apiClientUtils_1.shouldCloseTrade)(targetTokenType, targetTokenPrice, tradeDirection, String(leverage), takeProfit != null ? String(takeProfit) : null, stopLoss != null ? String(stopLoss) : null, null, null, null, targetTokenPrice);
            if (shouldClose) {
                return null;
            }
            const collateralTypeRegistryData = yield (0, apiUtils_1.getTokenRegistryEntry)(tokenType, (0, nullthrows_1.default)(this === null || this === void 0 ? void 0 : this.sifRpcUrl));
            const precision = (0, apiClientUtils_1.getPrecisionForToken)(collateralTypeRegistryData);
            const txn = yield (0, apiClientUtils_1.onRequestATradeAPI)(this.wallet, (0, nullthrows_1.default)(this === null || this === void 0 ? void 0 : this.address), collateralTypeRegistryData.denom, String(tokenAmount), {
                target_token_type: targetTokenType,
                limit_price: limitPrice ? String(limitPrice) : null,
                trade_direction: String(tradeDirection),
                stop_loss: String(stopLoss),
                take_profit: String(takeProfit),
                leverage_quantity: String(leverage),
            }, precision, this === null || this === void 0 ? void 0 : this.sifRpcUrl);
            console.log("txn", txn);
            return txn;
        });
    }
    closeOrder(tradeId) {
        return __awaiter(this, void 0, void 0, function* () {
            const trade = yield this.getTrade(tradeId);
            if (trade == null) {
                return null;
            }
            const txn = yield (0, apiClientUtils_1.onCloseTradeAPI)(trade, this.wallet, this === null || this === void 0 ? void 0 : this.sifRpcUrl);
            console.log("txn", txn);
            return txn;
        });
    }
    cancelOrder(tradeId) {
        return __awaiter(this, void 0, void 0, function* () {
            const trade = yield this.getTrade(tradeId);
            if (trade == null) {
                return null;
            }
            const txn = yield (0, apiClientUtils_1.onCancelTradeRequestAPI)(trade, this.wallet, this === null || this === void 0 ? void 0 : this.sifRpcUrl);
            console.log("txn", txn);
            return txn;
        });
    }
    getCurrentInterestRate(targetTokenType) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield (0, apiClientUtils_1.getEffectiveInterestRateForMarket)(targetTokenType);
        });
    }
    getTrades(tradeType, status) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            let trades = [];
            const headers = Object.assign({ "Content-Type": "application/json" }, (0, apiUtils_1.constructCookie)());
            if (tradeType === undefined && status === undefined) {
                trades = (yield ((_a = (yield (0, apiUtils_1.fetchWithRetries)(`${constants_1.DOMAIN}/api/data/trade/all_for_trade_address?traderAddress=${this.address}`, { headers }))) === null || _a === void 0 ? void 0 : _a.json()));
            }
            else if (tradeType !== undefined && status === undefined) {
                trades = (yield ((_b = (yield (0, apiUtils_1.fetchWithRetries)(`${constants_1.DOMAIN}/api/data/trade/get_trades_by_direction?direction=${tradeType}&address=${this.address}`, { headers }))) === null || _b === void 0 ? void 0 : _b.json()));
            }
            else if (tradeType === undefined && status !== undefined) {
                const response = yield (0, apiUtils_1.fetchWithRetries)(`${constants_1.DOMAIN}/api/data/trade/get_trade_by_status?status=${status}&address=${this.address}`, { headers });
                if (response == null) {
                    return [];
                }
                trades = (yield response.json());
            }
            else {
                const response = yield (0, apiUtils_1.fetchWithRetries)(`${constants_1.DOMAIN}/api/data/trade/get_trade_by_status?status=${status}&direction=${tradeType}&address=${this.address}`, { headers });
                if (response == null) {
                    return [];
                }
                trades = (yield response.json());
            }
            return trades;
        });
    }
    getTrade(tradeId) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const trade = (yield ((_a = (yield (0, apiUtils_1.fetchWithRetries)(`${constants_1.DOMAIN}/api/data/trade/get_trade?id=${tradeId}&address=${this.address}`, {
                headers: Object.assign({ "Content-Type": "application/json" }, (0, apiUtils_1.constructCookie)()),
            }))) === null || _a === void 0 ? void 0 : _a.json()));
            console.log("trade ", trade);
            return trade;
        });
    }
    getTopMatch(collateralType, collateralTokenAmount) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield (0, apiUtils_1.fetchWithRetries)(`${constants_1.DOMAIN}/api/data/match/top_match?tokenType=${collateralType}&tokenAmount=${(0, bignumber_js_1.default)(collateralTokenAmount).times(constants_1.MATCHER_MULTIPLIER)}&traderAddress=${this.address}`, {
                headers: Object.assign({ "Content-Type": "application/json" }, (0, apiUtils_1.constructCookie)()),
            });
            if (response == null) {
                return null;
            }
            const match = (yield response.json());
            if (match == null) {
                return null;
            }
            return (0, bignumber_js_1.default)(match.tokenAmount)
                .minus(match.encumberedTokenAmount)
                .toNumber();
        });
    }
    getPnl(type) {
        return __awaiter(this, void 0, void 0, function* () {
            let total = 0;
            if ([types_1.PnlTypeEnum.REALIZED, types_1.PnlTypeEnum.OVERALL].includes(type)) {
                const completedTrades = yield this.getTrades(undefined, types_1.TradeStatusEnum.COMPLETED);
                total =
                    total +
                        completedTrades.reduce((acc, trade) => {
                            var _a;
                            return (0, bignumber_js_1.default)(acc)
                                .plus((_a = trade.pandL) !== null && _a !== void 0 ? _a : 0)
                                .toNumber();
                        }, 0);
            }
            if ([types_1.PnlTypeEnum.UNREALIZED, types_1.PnlTypeEnum.OVERALL].includes(type)) {
                const activeTrades = yield this.getTrades(undefined, types_1.TradeStatusEnum.ACTIVE);
                total =
                    total +
                        activeTrades.reduce((acc, trade) => {
                            var _a;
                            return (0, bignumber_js_1.default)(acc)
                                .plus((_a = trade.pandL) !== null && _a !== void 0 ? _a : 0)
                                .toNumber();
                        }, 0);
            }
            return total;
        });
    }
}
exports.APIClient = APIClient;
