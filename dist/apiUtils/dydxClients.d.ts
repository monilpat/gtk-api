import { ValidatorClient, IndexerClient, CompositeClient, NobleClient } from "@dydxprotocol/v4-client-js";
export declare let validatorClient: ValidatorClient;
export declare let indexerClient: IndexerClient;
export declare let compositeClient: CompositeClient;
export declare let nobleClient: NobleClient;
export declare let clientEnv: "mainnet" | "testnet" | undefined;
export declare let initialized: boolean;
export declare const createClients: (env: "mainnet" | "testnet" | undefined) => Promise<void>;
