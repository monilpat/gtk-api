# gtk-api

The `gtk-api` package provides a wrapper for the internal API client to manage and execute trade operations. This README will guide you through the installation, usage, and API methods available in the package.

## Installation

To install the `gtk-api` package, use the following command:

```bash
yarn add gtk-api

```

OR

```bash
npm install gtk-api

```

# Usage

Example Usage of APIClientWrapper
The following example demonstrates how to use the APIClientWrapper to interact with the API.

```typescript
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { APIClientWrapper } from "gtk-api";

async function main() {
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic("your-mnemonic");
  const client = await APIClientWrapper.create(wallet, "mainnet");

  // Place an order
  const response = await client.placeOrder(
    "btc",
    100,
    "uusdc",
    TradeDirectionEnum.LONG,
    2,
    50,
    150,
    null
  );
  console.log(response);
}

main();
```

# API Methods

## APIClientWrapper.create

Factory method to create an instance of APIClientWrapper.

### Parameters:

wallet (DirectSecp256k1HdWallet): The wallet instance for signing transactions.
network (NetworkEnv): The network environment to connect to.

### Returns:

A promise that resolves to an APIClientWrapper instance.

### Example:

```typescript
const wallet = await DirectSecp256k1HdWallet.fromMnemonic("your-mnemonic");
const client = await APIClientWrapper.create(wallet, "mainnet");
```

## placeOrder

Places a new order.

### Parameters:

- tokenType (string): The type of the token to trade.
- tokenAmount (number): The amount of the token to trade.
- targetTokenType (string): The type of the target token.
- tradeDirection (TradeDirectionEnum): The direction of the trade (LONG or SHORT).
- leverage (number): The leverage to use for the trade.
- stopLoss (number | null): The stop loss value, if any.
- takeProfit (number | null): The take profit value, if any.
- limitPrice (number | null): The limit price for the order, if any.

### Returns:

A promise that resolves to the transaction response or null if failed.

### Example:

```typescript
const response = await client.placeOrder(
  "btc",
  100,
  "uusdc",
  TradeDirectionEnum.LONG,
  2,
  50,
  150,
  null
);
console.log(response);
```

## closeOrder

Closes an existing order.

### Parameters:

tradeId (number): The ID of the trade to close.

### Returns:

A promise that resolves to the transaction response or null if failed.

### Example:

```typescript
const closedTrade = await client.closeOrder(1615);
console.log("Close Order:", closedTrade);
```

## cancelOrder

Cancels an existing order.

### Parameters:

tradeId (number): The ID of the trade to cancel.

### Returns:

A promise that resolves to the transaction response or null if failed.

### Example:

```typescript
const cancelledTrade = await client.cancelOrder(1615);
console.log("Cancel Order:", cancelledTrade);
```

## getCurrentInterestRate

Retrieves the current interest rate for a given token.

### Parameters:

targetTokenType (string): The type of the target token.

### Returns:

A promise that resolves to the current interest rate.

### Example:

```typescript
const interestRate = await client.getCurrentInterestRate("btc");
console.log("Current Interest Rate:", interestRate);
```

## getTrades

Retrieves a list of trades. If both are undefined, returns all trades for your address.

### Parameters:

tradeType (TradeDirectionEnum | undefined): The type of the trade (LONG or SHORT), if any.
status (TradeStatusEnum | undefined): The status of the trade (PENDING, ACTIVE, etc.), if any.

### Returns:

A promise that resolves to an array of trades.

### Example:

```typescript
const trades = await client.getTrades(
  TradeDirectionEnum.LONG,
  TradeStatusEnum.ACTIVE
);
console.log("Get Trades:", trades);
```

## getTrade

Retrieves a specific trade by its ID.

### Parameters:

tradeId (number): The ID of the trade to retrieve.

### Returns:

A promise that resolves to the trade or null if not found.

### Example:

```typescript
const tradeDetails = await client.getTrade(123);
console.log("Get Trade:", tradeDetails);
```

## getTopMatch

Retrieves the top match for a given collateral type.

### Parameters:

collateralType (string): The type of the collateral.

### Returns:

A promise that resolves to the top match vault or null if not found.

### Example:

```typescript
const topMatch = await client.getTopMatch("uusdc");
console.log("Top Match:", topMatch);
```

## getPnl

Retrieves the profit and loss (PnL) for a given type.

### Parameters:

type (string): The type of the PnL (REALIZED, UNREALIZED, OVERALL).

### Returns:

A promise that resolves to the PnL value.

### Example:

```typescript
const pnl = await client.getPnl(PnlTypeEnum.REALIZED);
console.log("PnL:", pnl);
```

## Full Example

Below is a full example demonstrating the use of all available methods in APIClientWrapper.

```typescript
import {
  PnlTypeEnum,
  TradeDirectionEnum,
  TradeStatusEnum,
} from "gtk-api/serverUtils/dbTypes";
import { APIClientWrapper } from "gtk-api";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";

export async function main() {
  const network = "mainnet";
  const wallet: DirectSecp256k1HdWallet =
    await DirectSecp256k1HdWallet.fromMnemonic("mnemonic", {
      prefix: "sif",
    });
  const client = await APIClientWrapper.create(wallet, network);
  console.log("APIClientWrapper:", client);

  const trade = await client.placeOrder(
    "uusdc",
    0.00001,
    "btc",
    TradeDirectionEnum.LONG,
    2,
    45000,
    70000,
    null
  );
  console.log("Place Order:", trade);

  const closedTrade = await client.closeOrder(1615);
  console.log("Close Order:", closedTrade);

  const cancelledTrade = await client.cancelOrder(1615);
  console.log("Cancel Order:", cancelledTrade);

  const interestRate = await client.getCurrentInterestRate("btc");
  console.log("Current Interest Rate:", interestRate);

  const trades = await client.getTrades(
    TradeDirectionEnum.LONG,
    TradeStatusEnum.ACTIVE
  );
  console.log("Get Trades:", trades);

  const tradeDetails = await client.getTrade(123);
  console.log("Get Trade:", tradeDetails);

  const topMatch = await client.getTopMatch("uusdc");
  console.log("Top Match:", topMatch);

  const pnl = await client.getPnl(PnlTypeEnum.REALIZED);
  console.log("PnL:", pnl);
}

main().catch(console.error);
```
