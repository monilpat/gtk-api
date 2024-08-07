import {
  DOMAIN,
  HEDGE_LIQUIDITY_MULTIPLIER,
  MATCHER_MULTIPLIER,
  tokenToLeverage,
  tokenToMarket,
} from "../apiUtils/constants";
import {
  CollateralTokenType,
  TargetTokenType,
  MatchVault,
  PnlTypeEnum,
  Trade,
  TradeDirectionEnum,
  TradeStatusEnum,
} from "../api/types";
import {
  constructCookie,
  fetchWithRetries,
  getTokenRegistryEntry,
} from "../apiUtils/apiUtils";
import { IAPIClient } from "../api/IAPIClient";
import {
  getPrecisionForToken,
  onCancelTradeRequestAPI,
  onCloseTradeAPI,
  onRequestATradeAPI,
  shouldCloseTrade,
  getEffectiveInterestRateForMarket,
} from "../apiUtils/apiClientUtils";
import {
  createClients,
  indexerClient,
  initialized,
} from "../apiUtils/dydxClients";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import BigNumber from "bignumber.js";
import nullthrows from "nullthrows";
import { DeliverTxResponse } from "@sifchain/sdk";

export class APIClient implements IAPIClient {
  private wallet: DirectSecp256k1HdWallet;
  private network: "mainnet" | "testnet";
  private address: string | null = null;
  private sifRpcUrl: string | null = null;

  constructor(
    wallet: DirectSecp256k1HdWallet,
    address: string,
    network: "mainnet" | "testnet",
    sifRpcUrl: string | null
  ) {
    this.sifRpcUrl = sifRpcUrl;
    this.wallet = wallet;
    this.network = network;
    this.address = address;
  }
  static async create(
    wallet: DirectSecp256k1HdWallet,
    network: "mainnet" | "testnet"
  ): Promise<APIClient> {
    if (!initialized) {
      await createClients(network);
    }
    return new APIClient(
      wallet,
      (await wallet.getAccounts())[0].address,
      network,
      network === "testnet"
        ? "https://proxies.sifchain.finance/api/sifchain-testnet/rpc"
        : "https://proxies.sifchain.finance/api/sifchain-1/rpc"
    );
  }
  async placeOrder(
    tokenType: CollateralTokenType,
    tokenAmount: number,
    targetTokenType: TargetTokenType,
    tradeDirection: TradeDirectionEnum,
    leverage: number,
    stopLoss: number | null,
    takeProfit: number | null,
    limitPrice: number | null
  ): Promise<DeliverTxResponse | null> {
    const isInvalidLeverage = !(
      (BigNumber(leverage).isGreaterThanOrEqualTo(0) &&
        BigNumber(leverage).isLessThanOrEqualTo(
          targetTokenType != null
            ? BigNumber(tokenToLeverage[targetTokenType] ?? 5).times(
                HEDGE_LIQUIDITY_MULTIPLIER
              )
            : 20
        )) ||
      !leverage
    );
    if (isInvalidLeverage) {
      return null;
    }
    const marketToTradeIn = tokenToMarket[targetTokenType];
    const markets: any = (
      await indexerClient.markets.getPerpetualMarkets(marketToTradeIn)
    ).markets;
    let tickSize = Math.log10(Number(markets[marketToTradeIn].tickSize));
    tickSize = tickSize >= 0 ? 0 : Math.abs(tickSize);
    const targetTokenPrice = BigNumber(
      BigNumber(markets[marketToTradeIn].oraclePrice).toFixed(tickSize)
    ).toString();
    const { shouldClose } = shouldCloseTrade(
      targetTokenType,
      targetTokenPrice,
      tradeDirection,
      String(leverage),
      takeProfit != null ? String(takeProfit) : null,
      stopLoss != null ? String(stopLoss) : null,
      null,
      null,
      null,
      targetTokenPrice
    );
    if (shouldClose) {
      return null;
    }
    const collateralTypeRegistryData = await getTokenRegistryEntry(
      tokenType,
      nullthrows(this?.sifRpcUrl)
    );
    const precision = getPrecisionForToken(collateralTypeRegistryData);
    const txn = await onRequestATradeAPI(
      this.wallet,
      nullthrows(this?.address),
      collateralTypeRegistryData.denom,
      String(tokenAmount),
      {
        target_token_type: targetTokenType,
        limit_price: limitPrice ? String(limitPrice) : null,
        trade_direction: String(tradeDirection),
        stop_loss: String(stopLoss),
        take_profit: String(takeProfit),
        leverage_quantity: String(leverage),
      },
      precision,
      this?.sifRpcUrl!
    );
    console.log("txn", txn);
    return txn;
  }
  async closeOrder(tradeId: number): Promise<DeliverTxResponse | null> {
    const trade = await this.getTrade(tradeId);
    if (trade == null) {
      return null;
    }
    const txn = await onCloseTradeAPI(trade, this.wallet, this?.sifRpcUrl!);
    console.log("txn", txn);
    return txn;
  }
  async cancelOrder(tradeId: number): Promise<DeliverTxResponse | null> {
    const trade = await this.getTrade(tradeId);
    if (trade == null) {
      return null;
    }
    const txn = await onCancelTradeRequestAPI(
      trade,
      this.wallet,
      this?.sifRpcUrl!
    );
    console.log("txn", txn);
    return txn;
  }
  async getCurrentInterestRate(
    targetTokenType: TargetTokenType
  ): Promise<number> {
    return await getEffectiveInterestRateForMarket(targetTokenType);
  }
  async getTrades(
    tradeType: TradeDirectionEnum | undefined,
    status: TradeStatusEnum | undefined
  ): Promise<Trade[]> {
    let trades: Trade[] = [];
    const headers = {
      "Content-Type": "application/json",
      ...constructCookie(),
    };
    if (tradeType === undefined && status === undefined) {
      trades = (await (
        await fetchWithRetries(
          `${DOMAIN}/api/data/trade/all_for_trade_address?traderAddress=${this.address}`,
          { headers }
        )
      )?.json()) as Trade[];
    } else if (tradeType !== undefined && status === undefined) {
      trades = (await (
        await fetchWithRetries(
          `${DOMAIN}/api/data/trade/get_trades_by_direction?direction=${tradeType}&address=${this.address}`,
          { headers }
        )
      )?.json()) as Trade[];
    } else if (tradeType === undefined && status !== undefined) {
      const response = await fetchWithRetries(
        `${DOMAIN}/api/data/trade/get_trade_by_status?status=${status}&address=${this.address}`,
        { headers }
      );
      if (response == null) {
        return [];
      }
      trades = (await response.json()) as Trade[];
    } else {
      const response = await fetchWithRetries(
        `${DOMAIN}/api/data/trade/get_trade_by_status?status=${status}&direction=${tradeType}&address=${this.address}`,
        { headers }
      );
      if (response == null) {
        return [];
      }
      trades = (await response.json()) as Trade[];
    }
    return trades;
  }
  async getTrade(tradeId: number): Promise<Trade | null> {
    const trade = (await (
      await fetchWithRetries(
        `${DOMAIN}/api/data/trade/get_trade?id=${tradeId}&address=${this.address}`,
        {
          headers: {
            "Content-Type": "application/json",
            ...constructCookie(),
          },
        }
      )
    )?.json()) as Trade | null;
    console.log("trade ", trade);
    return trade;
  }
  async getTopMatch(
    collateralType: CollateralTokenType,
    collateralTokenAmount: number
  ): Promise<number | null> {
    const response = await fetchWithRetries(
      `${DOMAIN}/api/data/match/top_match?tokenType=${collateralType}&tokenAmount=${BigNumber(
        collateralTokenAmount
      ).times(MATCHER_MULTIPLIER)}&traderAddress=${this.address}`,
      {
        headers: {
          "Content-Type": "application/json",
          ...constructCookie(),
        },
      }
    );
    if (response == null) {
      return null;
    }
    const match = (await response.json()) as MatchVault | null;
    if (match == null) {
      return null;
    }
    return BigNumber(match.tokenAmount)
      .minus(match.encumberedTokenAmount)
      .toNumber();
  }

  async getPnl(type: PnlTypeEnum): Promise<{ [key: string]: number }> {
    const pnlByCollateralTokenType: { [key: string]: number } = {};

    if ([PnlTypeEnum.REALIZED, PnlTypeEnum.OVERALL].includes(type)) {
      const completedTrades = await this.getTrades(
        undefined,
        TradeStatusEnum.COMPLETED
      );
      completedTrades.forEach((trade) => {
        const tokenType = trade.collateralTokenType;
        const pnl = BigNumber(trade.pandL ?? 0).toNumber();
        if (!pnlByCollateralTokenType[tokenType]) {
          pnlByCollateralTokenType[tokenType] = 0;
        }
        pnlByCollateralTokenType[tokenType] += pnl;
      });
    }

    if ([PnlTypeEnum.UNREALIZED, PnlTypeEnum.OVERALL].includes(type)) {
      const activeTrades = await this.getTrades(
        undefined,
        TradeStatusEnum.ACTIVE
      );
      activeTrades.forEach((trade) => {
        const tokenType = trade.collateralTokenType;
        const pnl = BigNumber(trade.pandL ?? 0).toNumber();
        if (!pnlByCollateralTokenType[tokenType]) {
          pnlByCollateralTokenType[tokenType] = 0;
        }
        pnlByCollateralTokenType[tokenType] += pnl;
      });
    }

    return pnlByCollateralTokenType;
  }

  //  // Match Methods
  // depositLiquidity(amount: number): Promise<any> {
  //     /**
  //      * Deposits liquidity into the match.
  //      *
  //      * Parameters:
  //      *  amount (number): The amount to deposit.
  //      *
  //      * Returns:
  //      *  Promise<any>: Response from the API after depositing liquidity.
  //      */
  //     // Implementation to deposit liquidity
  //     return Promise.resolve(); // Replace with actual API call
  // }
  // withdrawLiquidity(amount: number): Promise<any> {
  //     /**
  //      * Withdraws liquidity from the match.
  //      *
  //      * Parameters:
  //      *  amount (number): The amount to withdraw.
  //      *
  //      * Returns:
  //      *  Promise<any>: Response from the API after withdrawing liquidity.
  //      */
  //     // Implementation to withdraw liquidity
  //     return Promise.resolve(); // Replace with actual API call
  // }
  // requestToClose(matchId: string): Promise<any> {
  //     /**
  //      * Requests to close a match.
  //      *
  //      * Parameters:
  //      *  matchId (string): The ID of the match to close.
  //      *
  //      * Returns:
  //      *  Promise<any>: Response from the API after requesting to close the match.
  //      */
  //     // Implementation to request closing a match
  //     return Promise.resolve(); // Replace with actual API call
  // }
  // getMatchBalances(matchId: string): Promise<any> {
  //     /**
  //      * Retrieves the balances for a specific match.
  //      *
  //      * Parameters:
  //      *  matchId (string): The ID of the match to retrieve balances for.
  //      *
  //      * Returns:
  //      *  Promise<any>: The balances of the specified match.
  //      */
  //     // Implementation to get match balances
  //     return Promise.resolve({}); // Replace with actual API call
  // }
  // getMatchTransactionHistory(matchId: string): Promise<any[]> {
  //     /**
  //      * Retrieves the transaction history for a specific match.
  //      *
  //      * Parameters:
  //      *  matchId (string): The ID of the match to retrieve transaction history for.
  //      *
  //      * Returns:
  //      *  Promise<any[]>: A list of transactions for the specified match.
  //      */
  //     // Implementation to get match transaction history
  //     return Promise.resolve([]); // Replace with actual API call
  // }
  // getMatchTrades(matchId: string): Promise<any[]> {
  //     /**
  //      * Retrieves trades for a specific match.
  //      *
  //      * Parameters:
  //      *  matchId (string): The ID of the match to retrieve trades for.
  //      *
  //      * Returns:
  //      *  Promise<any[]>: A list of trades for the specified match.
  //      */
  //     // Implementation to get match trades
  //     return Promise.resolve([]); // Replace with actual API call
  // }
  // getTopPending(): Promise<any[]> {
  //     /**
  //      * Retrieves the top pending items.
  //      *
  //      * Returns:
  //      *  Promise<any[]>: A list of top pending items.
  //      */
  //     // Implementation to get top pending items
  //     return Promise.resolve([]); // Replace with actual API call
  // }
  // // Analytics Methods
  // getTradingVolume(): Promise<number> {
  //     /**
  //      * Retrieves the trading volume.
  //      *
  //      * Returns:
  //      *  Promise<number>: The trading volume.
  //      */
  //     // Implementation to get trading volume
  //     return Promise.resolve(0); // Replace with actual API call
  // }
  // getMatcherAverageAPR(): Promise<number> {
  //     /**
  //      * Retrieves the average annual percentage rate (APR) for matchers.
  //      *
  //      * Returns:
  //      *  Promise<number>: The average APR.
  //      */
  //     // Implementation to get matcher average APR
  //     return Promise.resolve(0); // Replace with actual API call
  // }
  // getTotalCapitalBorrowed(): Promise<number> {
  //     /**
  //      * Retrieves the total capital borrowed.
  //      *
  //      * Returns:
  //      *  Promise<number>: The total capital borrowed.
  //      */
  //     // Implementation to get total capital borrowed
  //     return Promise.resolve(0); // Replace with actual API call
  // }
  // getTotalInterestPaid(): Promise<number> {
  //     /**
  //      * Retrieves the total interest paid.
  //      *
  //      * Returns:
  //      *  Promise<number>: The total interest paid.
  //      */
  //     // Implementation to get total interest paid
  //     return Promise.resolve(0); // Replace with actual API call
  // }
  // Shared Methods
  // getOraclePrices(): Promise<{ [key: string]: any }> {
  //     /**
  //      * Retrieves the current oracle prices.
  //      *
  //      * Returns:
  //      *  Promise<{ [key: string]: any }>: The current oracle prices.
  //      */
  //     // Implementation to get oracle prices
  //     return Promise.resolve({}); // Replace with actual API call
  // }
  // // V2 - HEDGE Methods
  // placeOrder(orderDetails: { [key: string]: any }): Promise<any> {
  //     /**
  //      * Places a new hedge order.
  //      *
  //      * Parameters:
  //      *  orderDetails (object): Details of the hedge order to be placed.
  //      *
  //      * Returns:
  //      *  Promise<any>: Response from the API after placing the hedge order.
  //      */
  //     // Implementation to place a hedge order
  //     return Promise.resolve(); // Replace with actual API call
  // }
  // closeOrder(tradeId: string): Promise<any> {
  //     /**
  //      * Closes an open hedge order.
  //      *
  //      * Parameters:
  //      *  tradeId (string): The ID of the hedge order to close.
  //      *
  //      * Returns:
  //      *  Promise<any>: Response from the API after closing the hedge order.
  //      */
  //     // Implementation to close a hedge order
  //     return Promise.resolve(); // Replace with actual API call
  // }
  // cancelOrder(tradeId: string): Promise<any> {
  //     /**
  //      * Cancels a hedge order.
  //      *
  //      * Parameters:
  //      *  tradeId (string): The ID of the hedge order to cancel.
  //      *
  //      * Returns:
  //      *  Promise<any>: Response from the API after canceling the hedge order.
  //      */
  //     // Implementation to cancel a hedge order
  //     return Promise.resolve(); // Replace with actual API call
  // }
  // depositDYDX(amount: number): Promise<any> {
  //     /**
  //      * Deposits DYDX into the hedge account.
  //      *
  //      * Parameters:
  //      *  amount (number): The amount of DYDX to deposit.
  //      *
  //      * Returns:
  //      *  Promise<any>: Response from the API after depositing DYDX.
  //      */
  //     // Implementation to deposit DYDX
  //     return Promise.resolve(); // Replace with actual API call
  // }
  // withdrawDYDX(amount: number): Promise<any> {
  //     /**
  //      * Withdraws DYDX from the hedge account.
  //      *
  //      * Parameters:
  //      *  amount (number): The amount of DYDX to withdraw.
  //      *
  //      * Returns:
  //      *  Promise<any>: Response from the API after withdrawing DYDX.
  //      */
  //     // Implementation to withdraw DYDX
  //     return Promise.resolve(); // Replace with actual API call
  // }
  // transferDYDXToSIF(amount: number): Promise<any> {
  //     /**
  //      * Transfers DYDX to SIF account.
  //      *
  //      * Parameters:
  //      *  amount (number): The amount of DYDX to transfer.
  //      *
  //      * Returns:
  //      *  Promise<any>: Response from the API after transferring DYDX to SIF.
  //      */
  //     // Implementation to transfer DYDX to SIF
  //     return Promise.resolve(); // Replace with actual API call
  // }
  // transferSIFToDYDX(amount: number): Promise<any> {
  //     /**
  //      * Transfers SIF to DYDX account.
  //      *
  //      * Parameters:
  //      *  amount (number): The amount of SIF to transfer.
  //      *
  //      * Returns:
  //      *  Promise<any>: Response from the API after transferring SIF to DYDX.
  //      */
  //     // Implementation to transfer SIF to DYDX
  //     return Promise.resolve(); // Replace with actual API call
  // }
  // getExecutedTrades(): Promise<any[]> {
  //     /**
  //      * Retrieves the executed hedge trades.
  //      *
  //      * Returns:
  //      *  Promise<any[]>: A list of executed hedge trades.
  //      */
  //     // Implementation to get executed trades
  //     return Promise.resolve([]); // Replace with actual API call
  // }
}
