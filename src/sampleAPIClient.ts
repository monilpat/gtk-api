import {
  PnlTypeEnum,
  TradeDirectionEnum,
  TradeStatusEnum,
} from "./serverUtils/dbTypes";
import { APIClientWrapper } from "./index"; // Import from index which is the public API entry point

import { NetworkEnv } from "./common";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";

export async function main() {
  // Initialize the APIClientWrapper
  const network: NetworkEnv = "mainnet"; // Replace with the appropriate network
  const wallet: DirectSecp256k1HdWallet =
    await DirectSecp256k1HdWallet.fromMnemonic(
      "mnemonic", // Replace with the appropriate mnemonic
      {
        prefix: "sif",
      }
    );
  const client = await APIClientWrapper.create(wallet, network);
  console.log("APIClientWrapper:", client);
  // // Call placeOrder method - WORKING
  // const trade = await client.placeOrder(
  //   'uusdc', // tokenType
  //   0.00001, // tokenAmount
  //   'btc', // targetTokenType
  //   TradeDirectionEnum.LONG, // tradeDirection
  //   2, // leverage
  //   45000, // stopLoss or null
  //   70000, // takeProfit or null
  //   null // limit_price
  // )
  // console.log('Place Order:', trade)

  // Call closeOrder method - WORKING
  // const closedTrade = await client.closeOrder(1615) // Use a mock orderId
  // console.log('Close Order:', closedTrade)

  // // Call cancelOrder method - WORKING
  // const cancelledTrade = await client.cancelOrder(1615) // Use a mock orderId
  // console.log('Cancel Order:', cancelledTrade)

  // Call getCurrentInterestRate method - WORKING
  // const interestRate = await client.getCurrentInterestRate('btc')
  // console.log('Current Interest Rate:', interestRate)

  // Call getTrades method with specific parameters
  // const trades = await client.getTrades(
  //   TradeDirectionEnum.LONG, // tradeType
  //   TradeStatusEnum.ACTIVE // status
  // )
  // console.log('Get Trades:', trades)

  // Call getTrade method - WORKING
  // const tradeDetails = await client.getTrade('123') // Use a mock tradeId
  // console.log('Get Trade:', tradeDetails)

  // Call getTopMatch method
  // const topMatch = await client.getTopMatch('uusdc')
  // console.log('Top Match:', topMatch)

  // Call getPnl method - WORKING
  // const pnl = await client.getPnl(PnlTypeEnum.REALIZED)
  // console.log('PnL:', pnl)
}

// // Execute the main function
// main().catch(console.error)