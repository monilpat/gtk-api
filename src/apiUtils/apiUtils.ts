import nullthrows from "nullthrows";
import {
  COOKIE_NAME_SIF_ENV,
  MAINNET_SIF_ENV,
  TESTNET_SIF_ENV,
  PROCESS,
  DEFAULT_RETRIES,
  DEFAULT_RETRY_DELAY,
  DEFAULT_TIMEOUT,
} from "./constants";
import { createQueryClient } from "@sifchain/sdk";
import { RegistryEntry } from "@sifchain/sdk/build/typescript/generated/proto/sifnode/tokenregistry/v1/types";
type RegistryCacheResult = RegistryEntry[] | undefined;

/**
 * A fetch wrapper with retry logic, specifically checking for status code 200.
 * @param {string} url - The URL to fetch.
 * @param {RequestInit} options - Fetch options.
 * @param {number} [maxRetries=3] - Maximum number of retries.
 * @param {number} [retryDelay=1000] - Delay between retries in seconds.
 * @returns {Promise<Response>} The fetch response.
 */
export const fetchWithRetries = async (
  url: string,
  options: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      ...constructCookie(),
    },
  },
  maxRetries: number = DEFAULT_RETRIES,
  retryDelay: number = DEFAULT_RETRY_DELAY
): Promise<Response | null> => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.status !== 200) {
        const data = await response.json();
        console.log(`ERROR: response= ${JSON.stringify(data)}`);
        console.trace("Trace: ");
        continue;
      }
      return response;
    } catch (error) {
      console.error(
        `Attempt ${attempt + 1} at ${url} failed: ${JSON.stringify(error)}`
      );
      if (attempt < maxRetries - 1) {
        await delay(retryDelay);
      }
    }
  }
  return null;
};

export const delay = async (
  seconds: number | null = DEFAULT_TIMEOUT
): Promise<void> => {
  return await new Promise((resolve) =>
    setTimeout(resolve, (seconds ?? DEFAULT_TIMEOUT) * 1000)
  );
};

export const getTokenRegistryEntry = async (
  tokenType: string,
  rpcUrl: string
): Promise<RegistryEntry> => {
  const tokenEntries = await getRegistryEntries(rpcUrl);
  return nullthrows(
    tokenEntries?.find(
      (x) => x.baseDenom === tokenType || x.denom === tokenType
    ),
    `token ${tokenType} was not found in registry`
  );
};

const registryCache: { [key: string]: RegistryCacheResult } = {};
export const getRegistryEntries = async (
  rpcUrl: string
): Promise<RegistryEntry[]> => {
  let registry: RegistryCacheResult;
  if (registryCache[rpcUrl]) {
    registry = registryCache[rpcUrl];
  } else {
    const queryClients = await createQueryClient(rpcUrl);
    registry = await queryClients.tokenRegistry
      .Entries({})
      .then((x) => x.registry?.entries);
    registryCache[rpcUrl] = registry;
  }
  return registry ?? [];
};

export const cookie: { Cookie: string } = {
  Cookie: `${COOKIE_NAME_SIF_ENV}=${
    PROCESS.USE_TESTNET === "true" ? TESTNET_SIF_ENV : MAINNET_SIF_ENV
  };`,
};
export function constructCookie(): { Cookie: string } | {} {
  return PROCESS.USE_COOKIE === "true" ? cookie : {};
}
