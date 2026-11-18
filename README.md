# VerifyStack x402 — Crypto Intelligence & Verification API for AI Agents

Real-time cross-exchange funding rate arbitrage scanner, multi-source pre-trade token security audit, and deterministic EVM/Solana signature & risk APIs monetized natively via **HTTP 402 (`x402`)** USDC micropayments on **Base Mainnet (`eip155:8453`)**.

No API keys. No subscriptions. Agents pay per request using standard `PAYMENT-REQUIRED` / `PAYMENT-SIGNATURE` headers.

- **Live Endpoint Root:** `https://x402-crypto-math-api.verifystack.workers.dev`
- **x402scan Registry:** [x402scan.com/server/6f29bbaa-8a3a-40d8-971e-059a789d3019](https://www.x402scan.com/server/6f29bbaa-8a3a-40d8-971e-059a789d3019)
- **TryPoncho Merchant Playground:** [tryponcho.com/m/x402-crypto-math-api.verifystack.workers.dev](https://tryponcho.com/m/x402-crypto-math-api.verifystack.workers.dev)
- **OpenAPI 3.1 Spec:** `https://x402-crypto-math-api.verifystack.workers.dev/openapi.json`
- **Discovery Manifest:** `https://x402-crypto-math-api.verifystack.workers.dev/.well-known/x402`
- **LLM Crawler Index:** `https://x402-crypto-math-api.verifystack.workers.dev/llms.txt`

---

## Paid Endpoints (Base Mainnet USDC)

| Method | Endpoint | Price (USDC) | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/live-funding-arb` | **$0.01** | Live cross-exchange perp funding arbitrage across **Hyperliquid, dYdX v4, and Gate.io** normalized to hourly spreads & gross APR (20s cache). Query: `?symbol=BTC&limit=15&minApr=10` |
| `POST` | `/api/token-safety` | **$0.015** | Pre-trade token security & liquidity risk audit combining **GoPlus Security**, **Honeypot.is**, and **DexScreener** (`base`, `ethereum`, `arbitrum`, `bsc`, `polygon`, `solana`). |
| `POST` | `/api/verify-signature` | **$0.005** | Deterministic signature verifier for `evm_personal` (EIP-191), `evm_eip712`, `evm_erc1271` (live on-chain Smart Wallet RPC), and `ed25519` (Solana Base58/Hex/Base64). |
| `POST` | `/api/arb-net-profit` | **$0.005** | Exact arbitrage net profit, break-even spread, and APR after fees, slippage, transfer gas, and funding. |
| `POST` | `/api/liquidation-sim` | **$0.005** | Isolated-margin liquidation price, distance-to-liquidation %, risk/reward, and half-Kelly collateral sizing. |

---

## Example Responses

### 1. `GET /api/live-funding-arb?limit=2`
```json
{
  "updatedAt": "2026-11-16T15:01:42.964Z",
  "sourcesSucceeded": ["hyperliquid", "dydx", "gateio"],
  "totalOpportunities": 101,
  "opportunities": [
    {
      "symbol": "INIT",
      "longExchange": "hyperliquid",
      "shortExchange": "gateio",
      "longHourlyRatePct": -0.157644,
      "shortHourlyRatePct": -0.0764,
      "hourlySpreadPct": 0.081244,
      "aprGrossPercent": 711.7,
      "longMarkPrice": 0.099624,
      "shortMarkPrice": 0.09947,
      "priceSpreadBps": -15.46,
      "estimatedBreakEvenDays": 0.1
    }
  ]
}
```

### 2. `POST /api/token-safety`
```json
{
  "chain": "base",
  "address": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  "symbol": "USDC",
  "name": "USD Coin",
  "riskScore": 0,
  "verdict": "LOW_RISK",
  "sourcesUsed": ["honeypot_is", "dexscreener"],
  "security": {
    "isHoneypot": false,
    "buyTaxPercent": 0,
    "sellTaxPercent": 0
  },
  "market": {
    "priceUsd": 1.000078,
    "liquidityUsd": 86196.87,
    "volume24hUsd": 1488.85,
    "dexId": "alien-base"
  }
}
```

---

## Use via MCP (Claude Desktop, Cursor, AI Agents)

Clone and install dependencies:

```bash
git clone https://github.com/verifystack-dev/verifystack-x402.git
cd verifystack-x402
npm install
```

Add to your `mcpServers` config (funded with USDC on Base `eip155:8453`, no ETH gas required):

```json
{
  "mcpServers": {
    "verifystack-x402": {
      "command": "node",
      "args": ["/absolute/path/to/verifystack-x402/bin/verifystack-mcp.mjs"],
      "env": {
        "X402_BUYER_KEY": "0xYOUR_BASE_BUYER_PRIVATE_KEY"
      }
    }
  }
}
```

---

## Quickstart Script (Node.js)

See [examples/quickstart.mjs](./examples/quickstart.mjs):

```bash
X402_BUYER_KEY="0xYOUR_BASE_BUYER_PRIVATE_KEY" node examples/quickstart.mjs
```

Inspect payment requirements directly with `curl`:

```bash
curl -i https://x402-crypto-math-api.verifystack.workers.dev/api/live-funding-arb
```
