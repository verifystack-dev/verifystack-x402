#!/usr/bin/env node
import readline from "node:readline";
import { pathToFileURL } from "node:url";

const DEFAULT_BASE_URL = "https://x402-crypto-math-api.verifystack.workers.dev";

export const TOOLS = [
  {
    name: "verifystack_live_funding_arb",
    description:
      "Paid x402 API ($0.01 USDC on Base): Real-time cross-exchange perpetual funding rate arbitrage scanner aggregating Hyperliquid, dYdX v4, and Gate.io normalized to hourly spreads and gross APR.",
    inputSchema: {
      type: "object",
      properties: {
        symbol: {
          type: "string",
          description: "Optional asset ticker filter (e.g. BTC, ETH, SOL)",
        },
        limit: {
          type: "number",
          description: "Max results (1-100, default 15)",
        },
        minApr: {
          type: "number",
          description: "Minimum gross annualized APR percent filter",
        },
      },
    },
  },
  {
    name: "verifystack_clean_url",
    description:
      "Paid x402 API ($0.005 USDC on Base): Fetches any public URL, strips ads/scripts/navigation boilerplate, and returns clean LLM-ready Markdown, metadata, and token-count estimation.",
    inputSchema: {
      type: "object",
      required: ["url"],
      properties: {
        url: {
          type: "string",
          description: "Public http:// or https:// URL to fetch and clean",
        },
        maxChars: {
          type: "number",
          description: "Maximum output length in characters (200-40000, default 12000)",
        },
        includeLinks: {
          type: "boolean",
          description: "Include extracted page links array (default false)",
        },
      },
    },
  },
  {
    name: "verifystack_token_safety",
    description:
      "Paid x402 API ($0.008 USDC on Base): Pre-trade token security and DEX liquidity risk audit aggregating GoPlus Security, Honeypot.is simulation, and DexScreener liquidity.",
    inputSchema: {
      type: "object",
      required: ["chain", "address"],
      properties: {
        chain: {
          type: "string",
          enum: ["base", "ethereum", "arbitrum", "bsc", "polygon", "solana"],
        },
        address: {
          type: "string",
          description: "Token contract address (EVM 0x... or Solana Base58 mint)",
        },
      },
    },
  },
  {
    name: "verifystack_verify_signature",
    description:
      "Paid x402 API ($0.005 USDC on Base): Deterministic cryptographic signature verifier for EVM EIP-191 personal_sign, EIP-712 typed data, ERC-1271 on-chain smart wallets, and Ed25519 (Solana).",
    inputSchema: {
      type: "object",
      required: ["scheme", "signature"],
      properties: {
        scheme: {
          type: "string",
          enum: ["evm_personal", "evm_eip712", "evm_erc1271", "ed25519"],
        },
        chain: {
          type: "string",
          enum: ["base", "ethereum", "arbitrum", "optimism", "polygon"],
        },
        message: { type: "string" },
        messageEncoding: { type: "string", enum: ["utf8", "hex", "base64"] },
        signature: { type: "string" },
        expectedAddress: { type: "string" },
        publicKey: { type: "string" },
        typedData: { type: "object" },
      },
    },
  },
  {
    name: "verifystack_arb_net_profit",
    description:
      "Paid x402 API ($0.005 USDC on Base): Exact arbitrage net profit, break-even spread, and APR calculator accounting for maker/taker fees, slippage, transfer gas, and funding.",
    inputSchema: {
      type: "object",
      required: [
        "notionalUsd",
        "buyPrice",
        "sellPrice",
        "buyFeeBps",
        "sellFeeBps",
      ],
      properties: {
        notionalUsd: { type: "number" },
        buyPrice: { type: "number" },
        sellPrice: { type: "number" },
        buyFeeBps: { type: "number" },
        sellFeeBps: { type: "number" },
        slippageBps: { type: "number" },
        gasAndTransferUsd: { type: "number" },
        fundingRate8hBps: { type: "number" },
        holdHours: { type: "number" },
      },
    },
  },
  {
    name: "verifystack_liquidation_sim",
    description:
      "Paid x402 API ($0.005 USDC on Base): Isolated-margin perpetual liquidation threshold, distance-to-liquidation %, risk-reward ratio, and conservative half-Kelly sizing simulator.",
    inputSchema: {
      type: "object",
      required: ["side", "entryPrice", "leverage", "collateralUsd"],
      properties: {
        side: { type: "string", enum: ["long", "short"] },
        entryPrice: { type: "number" },
        leverage: { type: "number" },
        collateralUsd: { type: "number" },
        maintenanceMarginRate: { type: "number" },
        targetPrice: { type: "number" },
        stopLossPrice: { type: "number" },
        winProbability: { type: "number" },
      },
    },
  },
];

let cachedHttpClientPromise = null;

async function getX402HttpClient(privateKey) {
  if (!cachedHttpClientPromise) {
    cachedHttpClientPromise = (async () => {
      const [{ x402Client }, { x402HTTPClient }, { registerExactEvmScheme }, { privateKeyToAccount }] =
        await Promise.all([
          import("@x402/core/client"),
          import("@x402/core/http"),
          import("@x402/evm/exact/client"),
          import("viem/accounts"),
        ]);
      const account = privateKeyToAccount(privateKey);
      const client = new x402Client();
      registerExactEvmScheme(client, { signer: account });
      return new x402HTTPClient(client);
    })();
  }
  return cachedHttpClientPromise;
}

function buildRequestSpec(toolName, args = {}, baseUrl = DEFAULT_BASE_URL) {
  if (toolName === "verifystack_live_funding_arb") {
    const params = new URLSearchParams();
    if (args.symbol) params.set("symbol", String(args.symbol));
    if (args.limit !== undefined) params.set("limit", String(args.limit));
    if (args.minApr !== undefined) params.set("minApr", String(args.minApr));
    const qs = params.toString();
    return {
      url: `${baseUrl}/api/live-funding-arb${qs ? `?${qs}` : ""}`,
      init: { method: "GET" },
    };
  }

  const postRoutes = {
    verifystack_clean_url: "/api/clean-url",
    verifystack_token_safety: "/api/token-safety",
    verifystack_verify_signature: "/api/verify-signature",
    verifystack_arb_net_profit: "/api/arb-net-profit",
    verifystack_liquidation_sim: "/api/liquidation-sim",
  };
  const path = postRoutes[toolName];
  if (!path) {
    throw new Error(`Unknown tool: ${toolName}`);
  }
  return {
    url: `${baseUrl}${path}`,
    init: {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
    },
  };
}

export async function executeTool(
  toolName,
  args = {},
  {
    baseUrl = process.env.VERIFYSTACK_URL || DEFAULT_BASE_URL,
    buyerKey = process.env.X402_BUYER_KEY,
    fetchFn = fetch,
  } = {}
) {
  const { url, init } = buildRequestSpec(toolName, args, baseUrl);
  const firstRes = await fetchFn(url, init);

  if (firstRes.status !== 402) {
    const body = await firstRes.text();
    return {
      isError: !firstRes.ok,
      content: [{ type: "text", text: body }],
    };
  }

  const rawHeader = firstRes.headers.get("payment-required");
  if (!buyerKey) {
    const decoded = rawHeader
      ? JSON.parse(Buffer.from(rawHeader, "base64").toString("utf8"))
      : { error: "Payment required" };
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              error: "X402_BUYER_KEY env variable is not set for automatic Base USDC payment.",
              paymentRequired: decoded,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  const httpClient = await getX402HttpClient(buyerKey);
  const paymentRequired = httpClient.getPaymentRequiredResponse((name) =>
    firstRes.headers.get(name)
  );
  const payload = await httpClient.createPaymentPayload(paymentRequired);
  const authHeaders = httpClient.encodePaymentSignatureHeader(payload);

  const paidRes = await fetchFn(url, {
    ...init,
    headers: { ...(init.headers || {}), ...authHeaders },
  });
  const text = await paidRes.text();
  return {
    isError: !paidRes.ok,
    content: [{ type: "text", text }],
  };
}

export async function handleRpcMessage(msg, deps = {}) {
  if (!msg || typeof msg !== "object") {
    return {
      jsonrpc: "2.0",
      id: null,
      error: { code: -32600, message: "Invalid Request" },
    };
  }

  const { id, method, params } = msg;

  if (method === "notifications/initialized") {
    return null;
  }
  if (method === "initialize") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "verifystack-x402-mcp", version: "0.1.0" },
      },
    };
  }
  if (method === "tools/list") {
    return { jsonrpc: "2.0", id, result: { tools: TOOLS } };
  }
  if (method === "tools/call") {
    try {
      const result = await executeTool(params?.name, params?.arguments, deps);
      return { jsonrpc: "2.0", id, result };
    } catch (error) {
      return {
        jsonrpc: "2.0",
        id,
        result: {
          isError: true,
          content: [
            {
              type: "text",
              text: error instanceof Error ? error.message : String(error),
            },
          ],
        },
      };
    }
  }

  if (id === undefined) return null;
  return {
    jsonrpc: "2.0",
    id,
    error: { code: -32601, message: `Method not found: ${method}` },
  };
}

function startStdioServer() {
  const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
  rl.on("line", async (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      const msg = JSON.parse(trimmed);
      const reply = await handleRpcMessage(msg);
      if (reply) {
        process.stdout.write(`${JSON.stringify(reply)}\n`);
      }
    } catch {
      process.stdout.write(
        `${JSON.stringify({
          jsonrpc: "2.0",
          id: null,
          error: { code: -32700, message: "Parse error" },
        })}\n`
      );
    }
  });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  startStdioServer();
}
