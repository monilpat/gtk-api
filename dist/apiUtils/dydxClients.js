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
exports.createClients = exports.initialized = exports.clientEnv = exports.nobleClient = exports.compositeClient = exports.indexerClient = exports.validatorClient = void 0;
const v4_client_js_1 = require("@dydxprotocol/v4-client-js");
const constants_1 = require("./constants");
exports.initialized = false;
const createClients = (env) => __awaiter(void 0, void 0, void 0, function* () {
    let validatorConfig = null;
    let network = null;
    let indexerConfig = null;
    let nobleClientInitialized = false;
    if (env === "testnet") {
        validatorConfig = v4_client_js_1.Network.testnet().validatorConfig;
        network = v4_client_js_1.Network.testnet();
        indexerConfig = v4_client_js_1.Network.testnet().indexerConfig;
        try {
            exports.nobleClient = new v4_client_js_1.NobleClient(constants_1.DYDX_CONFIG.testnet.nobleClient, "Noble example");
            nobleClientInitialized = true;
        }
        catch (e) {
            console.log(`Failed to connect to noble client: ${e.message}`);
        }
        exports.clientEnv = "testnet";
    }
    else {
        const denomConfig = {
            USDC_DENOM: constants_1.DYDX_CONFIG.general.usdcIbcHash,
            USDC_DECIMALS: 6,
            USDC_GAS_DENOM: "uusdc",
            CHAINTOKEN_DENOM: "adydx",
            CHAINTOKEN_DECIMALS: 18,
        };
        validatorConfig = new v4_client_js_1.ValidatorConfig(
        // 'https://dydx-grpc.publicnode.com:443', // tried
        // 'https://dydx-mainnet-lcd.autostake.com:443', // also tried
        "https://dydx-ops-rpc.kingnodes.com", // one in docs
        constants_1.DYDX_CONFIG.mainnetREST.chainId, denomConfig);
        indexerConfig = new v4_client_js_1.IndexerConfig(
        // 'https://indexer.dydx.trade',
        // 'wss://indexer.dydx.trade'
        // 'https://indexer.dydx.trade/',
        // 'wss://indexer.dydx.trade/v4/ws',
        constants_1.DYDX_CONFIG.mainnetREST.indexerRestEndpoint, constants_1.DYDX_CONFIG.mainnetREST.indexerWsEndpoint);
        network = new v4_client_js_1.Network("mainnet", indexerConfig, validatorConfig);
        exports.clientEnv = "mainnet";
        try {
            exports.nobleClient = new v4_client_js_1.NobleClient(constants_1.DYDX_CONFIG.mainnetREST.nobleClient, "noble transfer");
            nobleClientInitialized = true;
        }
        catch (e) {
            console.log(`Failed to connect to noble client: ${e.message}`);
        }
    }
    // console.log('**Validator Config**')
    // console.log(validatorConfig)
    // console.log('**Indexer Config**')
    // console.log(indexerConfig)
    // console.log('**Network**')
    // console.log(network)
    // console.log('** Noble Client **')
    // console.log(nobleClient)
    let validatorClientInitialized = false;
    let indexerClientInitialized = false;
    let compositeClientInitialized = false;
    try {
        exports.validatorClient = yield v4_client_js_1.ValidatorClient.connect(network.validatorConfig);
        // console.log('**Validator Client**')
        // console.log(validatorClient)
        validatorClientInitialized = true;
        exports.initialized = true;
    }
    catch (e) {
        console.log(`Failed to connect to validator client: ${e.message}`);
    }
    try {
        exports.indexerClient = new v4_client_js_1.IndexerClient(network.indexerConfig);
        // console.log('**Indexer Client**')
        // console.log(indexerClient)
        indexerClientInitialized = true;
    }
    catch (e) {
        console.log(`Failed to connect to indexer client: ${e.message}`);
    }
    try {
        exports.compositeClient = yield v4_client_js_1.CompositeClient.connect(network);
        // console.log('**Composite Client**')
        // console.log(compositeClient)
        compositeClientInitialized = true;
    }
    catch (e) {
        console.log(`Failed to connect to Composite client: ${e.stack}`);
    }
    exports.initialized =
        validatorClientInitialized &&
            indexerClientInitialized &&
            compositeClientInitialized &&
            nobleClientInitialized;
});
exports.createClients = createClients;
