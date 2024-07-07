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
exports.constructCookie = exports.cookie = exports.getRegistryEntries = exports.getTokenRegistryEntry = exports.delay = exports.fetchWithRetries = void 0;
const nullthrows_1 = __importDefault(require("nullthrows"));
const constants_1 = require("./constants");
const sdk_1 = require("@sifchain/sdk");
/**
 * A fetch wrapper with retry logic, specifically checking for status code 200.
 * @param {string} url - The URL to fetch.
 * @param {RequestInit} options - Fetch options.
 * @param {number} [maxRetries=3] - Maximum number of retries.
 * @param {number} [retryDelay=1000] - Delay between retries in seconds.
 * @returns {Promise<Response>} The fetch response.
 */
const fetchWithRetries = (url, options = {
    headers: Object.assign({ "Content-Type": "application/json" }, constructCookie()),
}, maxRetries = constants_1.DEFAULT_RETRIES, retryDelay = constants_1.DEFAULT_RETRY_DELAY) => __awaiter(void 0, void 0, void 0, function* () {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const response = yield fetch(url, options);
            if (response.status !== 200) {
                const data = yield response.json();
                console.log(`ERROR: response= ${JSON.stringify(data)}`);
                console.trace("Trace: ");
                continue;
            }
            return response;
        }
        catch (error) {
            console.error(`Attempt ${attempt + 1} at ${url} failed: ${JSON.stringify(error)}`);
            if (attempt < maxRetries - 1) {
                yield (0, exports.delay)(retryDelay);
            }
        }
    }
    return null;
});
exports.fetchWithRetries = fetchWithRetries;
const delay = (seconds = constants_1.DEFAULT_TIMEOUT) => __awaiter(void 0, void 0, void 0, function* () {
    return yield new Promise((resolve) => setTimeout(resolve, (seconds !== null && seconds !== void 0 ? seconds : constants_1.DEFAULT_TIMEOUT) * 1000));
});
exports.delay = delay;
const getTokenRegistryEntry = (tokenType, rpcUrl) => __awaiter(void 0, void 0, void 0, function* () {
    const tokenEntries = yield (0, exports.getRegistryEntries)(rpcUrl);
    return (0, nullthrows_1.default)(tokenEntries === null || tokenEntries === void 0 ? void 0 : tokenEntries.find((x) => x.baseDenom === tokenType || x.denom === tokenType), `token ${tokenType} was not found in registry`);
});
exports.getTokenRegistryEntry = getTokenRegistryEntry;
const registryCache = {};
const getRegistryEntries = (rpcUrl) => __awaiter(void 0, void 0, void 0, function* () {
    let registry;
    if (registryCache[rpcUrl]) {
        registry = registryCache[rpcUrl];
    }
    else {
        const queryClients = yield (0, sdk_1.createQueryClient)(rpcUrl);
        registry = yield queryClients.tokenRegistry
            .Entries({})
            .then((x) => { var _a; return (_a = x.registry) === null || _a === void 0 ? void 0 : _a.entries; });
        registryCache[rpcUrl] = registry;
    }
    return registry !== null && registry !== void 0 ? registry : [];
});
exports.getRegistryEntries = getRegistryEntries;
exports.cookie = {
    Cookie: `${constants_1.COOKIE_NAME_SIF_ENV}=${constants_1.PROCESS.USE_TESTNET === "true" ? constants_1.TESTNET_SIF_ENV : constants_1.MAINNET_SIF_ENV};`,
};
function constructCookie() {
    return constants_1.PROCESS.USE_COOKIE === "true" ? exports.cookie : {};
}
exports.constructCookie = constructCookie;
