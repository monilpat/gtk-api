import { connect, Connection } from "@planetscale/database";
import { NetworkEnv } from "../common";

export let connection: Connection;
export let dbConnectionEnv: NetworkEnv | undefined;

export const createConnection = (env: NetworkEnv | undefined) => {
  let config: {
    host: string | undefined;
    username: string | undefined;
    password: string | undefined;
  };
  if (env === "mainnet") {
    config = {
      host: process.env["DATABASE_HOST"],
      username: process.env["DATABASE_USERNAME"],
      password: process.env["DATABASE_PASSWORD"],
    };
    dbConnectionEnv = "mainnet";
  } else {
    config = {
      host: process.env["TEST_DATABASE_HOST"],
      username: process.env["TEST_DATABASE_USERNAME"],
      password: process.env["TEST_DATABASE_PASSWORD"],
    };
    dbConnectionEnv = "testnet";
  }

  connection = connect(config);
};
