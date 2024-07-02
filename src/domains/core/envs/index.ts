import {
  IAsset,
  NetworkChainConfigLookup,
  NetworkEnv,
  NETWORK_ENVS,
} from "../common";
import { useEffect, useMemo, useState } from "react";
import { useCookies } from "react-cookie";
import { useQuery } from "@tanstack/react-query";
import { KeplrChainConfig } from "~/common/utils/parseConfig";
import { getEnvConfig } from "~/utils/clientUtils";
import {
  COOKIE_NAME_CUSTOM_PRICE,
  COOKIE_NAME_SIF_ENV,
} from "../utils/constants/constants";

export type DexEnvironment = {
  kind: NetworkEnv;
  sifnodeUrl: string;
  vanirUrl: string;
  registryUrl: string;
};

export type SdkConfig =
  | {
      peggyCompatibleCosmosBaseDenoms: Set<string>;
      chains: never[];
      chainConfigsByNetwork: NetworkChainConfigLookup;
      sifAddrPrefix: string;
      sifApiUrl: string;
      sifRpcUrl: string;
      sifChainId: string;
      vanirUrl: string;
      registryUrl: string;
      blockExplorerUrl: string;
      assets: IAsset[];
      nativeAsset: IAsset;
      bridgebankContractAddress: string | undefined;
      bridgetokenContractAddress: string | undefined;
      keplrChainConfig: KeplrChainConfig;
    }
  | undefined;

export type ZeroOrOne = "0" | "1";

export function useDexEnvKind(): NetworkEnv {
  const [{ sif_dex_env }, setCookie] = useCookies([COOKIE_NAME_SIF_ENV]);
  const [resolvedEnv, setResolvedEnv] = useState<NetworkEnv | null>(null);

  useEffect(() => {
    const queryString = new URLSearchParams(window.location.search);
    const envKind = queryString.get("_env");
    if (
      envKind &&
      NETWORK_ENVS.has(envKind as NetworkEnv) &&
      envKind !== sif_dex_env
    ) {
      setCookie(COOKIE_NAME_SIF_ENV, envKind);
      setResolvedEnv(envKind as NetworkEnv);
    }
    if (envKind) {
      const url = new URL(window.location.href);
      url.searchParams.delete("_env");
      window.history.replaceState({}, document.title, url.toString());
    }
  }, [setCookie, sif_dex_env]);

  return useMemo(() => {
    return resolvedEnv ?? sif_dex_env ?? "testnet";
  }, [resolvedEnv, sif_dex_env]);
}

export function useCustomPricing() {
  const [{ sif_custom_price }, setCookie] = useCookies([
    COOKIE_NAME_CUSTOM_PRICE,
  ]);
  const [resolvedCustomPrice, setCustomPrice] = useState<ZeroOrOne | null>(
    null
  );

  useEffect(() => {
    const queryString = new URLSearchParams(window.location.search);
    const customPrice = queryString.get("_cp");
    if (
      customPrice &&
      (customPrice === "0" || customPrice === "1") &&
      customPrice !== sif_custom_price
    ) {
      setCookie(COOKIE_NAME_CUSTOM_PRICE, customPrice);
      setCustomPrice(customPrice as ZeroOrOne);
    }
    if (customPrice) {
      const url = new URL(window.location.href);
      url.searchParams.delete("_cp");
      window.history.replaceState({}, document.title, url.toString());
    }
  }, [setCookie, sif_custom_price]);

  return useMemo(() => {
    return resolvedCustomPrice ?? sif_custom_price ?? "0";
  }, [resolvedCustomPrice, sif_custom_price]);
}

export function useDexEnvironment() {
  const environment = useDexEnvKind();
  useCustomPricing();

  return useQuery(
    ["dex_env", environment],
    async () => {
      return await getEnvConfig({ environment });
    },
    {
      staleTime: 3600_000,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    }
  );
}
