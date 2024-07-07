import { RegistryEntry } from "@sifchain/sdk/build/typescript/generated/proto/sifnode/tokenregistry/v1/types";
/**
 * A fetch wrapper with retry logic, specifically checking for status code 200.
 * @param {string} url - The URL to fetch.
 * @param {RequestInit} options - Fetch options.
 * @param {number} [maxRetries=3] - Maximum number of retries.
 * @param {number} [retryDelay=1000] - Delay between retries in seconds.
 * @returns {Promise<Response>} The fetch response.
 */
export declare const fetchWithRetries: (url: string, options?: RequestInit, maxRetries?: number, retryDelay?: number) => Promise<Response | null>;
export declare const delay: (seconds?: number | null) => Promise<void>;
export declare const getTokenRegistryEntry: (tokenType: string, rpcUrl: string) => Promise<RegistryEntry>;
export declare const getRegistryEntries: (rpcUrl: string) => Promise<RegistryEntry[]>;
export declare const cookie: {
    Cookie: string;
};
export declare function constructCookie(): {
    Cookie: string;
} | {};
