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
    name: "verifystack_prediction_markets",
    description:
      "Paid x402 API ($0.008 USDC on Base): Live prediction market scanner aggregating Polymarket, Kalshi, and Manifold Markets with normalized YES/NO probabilities, spreads, and cross-venue arbitrage divergences.",
    inputSchema: {
      type: "object",
      properties: {
        q: {
          type: "string",
          description: "Optional keyword search across market questions (e.g. bitcoin, fed, eth)",
        },
        platform: {
          type: "string",
          description: "Filter platforms: polymarket, kalshi, manifold, or all",
        },
        minLiquidity: {
          type: "number",
          description: "Minimum market liquidity threshold",
        },
        limit: {
          type: "number",
          description: "Max markets returned (1-100, default 20)",
        },
      },
    },
  },
  {
    name: "verifystack_defi_yields",
    description:
      "Paid x402 API ($0.005 USDC on Base): Live DeFi yield & stablecoin APY scanner powered by DefiLlama; filters by chain, symbol, TVL, and separates organic Base APY from reward emissions.",
    inputSchema: {
      type: "object",
      properties: {
        chain: {
          type: "string",
          description: "Comma-separated chain filter (e.g. Base, Arbitrum, Ethereum, Solana)",
        },
        symbol: {
          type: "string",
          description: "Asset symbol substring filter (e.g. USDC, ETH)",
        },
        project: {
          type: "string",
          description: "Protocol slug filter (e.g. aave-v3, morpho-v1)",
        },
        stablecoin: { type: "boolean", description: "Only stablecoin pools" },
        singleAsset: { type: "boolean", description: "Only single-asset no-IL pools" },
        minTvl: { type: "number", description: "Minimum TVL in USD (default 100000)" },
        minApy: { type: "number", description: "Minimum total APY %" },
        limit: { type: "number", description: "Max pools returned (1-100, default 20)" },
      },
    },
  },
  {
    name: "verifystack_decode_tx",
    description:
      "Paid x402 API ($0.005 USDC on Base): EVM calldata & live transaction decoder via OpenChain + EVM RPC; flags unlimited ERC-20/NFT approvals before signing.",
    inputSchema: {
      type: "object",
      properties: {
        data: { type: "string", description: "Raw 0x hex calldata to decode" },
        to: { type: "string", description: "Optional target contract address" },
        valueWei: { type: "string", description: "Optional native value in wei" },
        txHash: { type: "string", description: "Optional live 0x tx hash to fetch and decode" },
        chain: {
          type: "string",
          enum: ["base", "ethereum", "arbitrum", "optimism", "polygon"],
        },
      },
    },
  },
  {
    name: "verifystack_domain_intel",
    description:
      "Paid x402 API ($0.004 USDC on Base): Domain anti-phishing & trust profiler via Cloudflare DoH (A/MX/SPF/DMARC), RDAP registration age, and HTTPS security headers.",
    inputSchema: {
      type: "object",
      required: ["domainOrUrl"],
      properties: {
        domainOrUrl: {
          type: "string",
          description: "Public domain or URL to inspect (e.g. https://app.uniswap.org)",
        },
      },
    },
  },
  {
    name: "verifystack_web_research",
    description:
      "Paid x402 API ($0.004 USDC on Base): Universal multi-source research & news search across HackerNews, GitHub Repositories, arXiv papers, and Wikipedia with zero API keys (60s cache).",
    inputSchema: {
      type: "object",
      required: ["q"],
      properties: {
        q: { type: "string", description: "Search query (2-200 characters)" },
        sources: {
          type: "string",
          description: "Comma-separated: hackernews, github, arxiv, wikipedia, or all",
        },
        limit: {
          type: "number",
          description: "Max items per source (1-15, default 5)",
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
    name: "verifystack_wallet_profile",
    description:
      "Paid x402 API ($0.008 USDC on Base): Multichain EVM wallet counterparty & gas profiler across Base, Ethereum, Arbitrum, Optimism, and Polygon (native/USDC balances, EOA vs contract check, nonce activity, live gas fees).",
    inputSchema: {
      type: "object",
      required: ["address"],
      properties: {
        address: {
          type: "string",
          description: "EVM 0x address to inspect across chains",
        },
        chains: {
          type: "array",
          items: {
            type: "string",
            enum: ["base", "ethereum", "arbitrum", "optimism", "polygon"],
          },
          description: "Optional list of chains (defaults to all 5)",
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
  {
    name: "verifystack_contract_intel",
    description:
      "Paid x402 API ($0.008 USDC on Base): Smart contract firewall & EIP-1967 proxy inspector via EVM RPC, Blockscout verification/ABI, and Sourcify across Base, Ethereum, Arbitrum, Optimism, and Polygon.",
    inputSchema: {
      type: "object",
      required: ["address"],
      properties: {
        address: {
          type: "string",
          description: "0x EVM smart contract address to inspect",
        },
        chain: {
          type: "string",
          enum: ["base", "ethereum", "arbitrum", "optimism", "polygon"],
          description: "Target EVM chain (default: base)",
        },
      },
    },
  },
  {
    name: "verifystack_spot_perp_basis",
    description:
      "Paid x402 API ($0.008 USDC on Base): Live cross-exchange cash-and-carry Spot vs Perpetual basis, executable BBO spread, and combined 30d carry APR scanner across Gate.io, OKX, and Hyperliquid.",
    inputSchema: {
      type: "object",
      properties: {
        symbol: {
          type: "string",
          description: "Optional asset ticker filter (e.g. BTC, ETH, SOL)",
        },
        minBasisBps: {
          type: "number",
          description: "Minimum absolute executable basis spread in bps (0-5000)",
        },
        notionalUsd: {
          type: "number",
          description: "Optional position size in USD to estimate 30d carry return",
        },
        limit: {
          type: "number",
          description: "Max opportunities returned (1-100, default 15)",
        },
      },
    },
  },
  {
    name: "verifystack_dex_market_intel",
    description:
      "Paid x402 API ($0.006 USDC on Base): Multi-chain DEX liquidity, 24h volume, price changes, and buy/sell order-flow oracle powered by DexScreener and GeckoTerminal.",
    inputSchema: {
      type: "object",
      properties: {
        q: {
          type: "string",
          description: "Token symbol or name query (e.g. AERO, VIRTUAL, PEPE)",
        },
        address: {
          type: "string",
          description: "Optional token contract/mint address",
        },
        chain: {
          type: "string",
          description: "Optional chain filter (base, ethereum, solana, arbitrum, bsc, polygon)",
        },
        minLiquidityUsd: {
          type: "number",
          description: "Minimum pool liquidity in USD (default 5000)",
        },
        limit: {
          type: "number",
          description: "Max pools returned (1-30, default 10)",
        },
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
  if (toolName === "verifystack_prediction_markets") {
    const params = new URLSearchParams();
    if (args.q) params.set("q", String(args.q));
    if (args.platform) params.set("platform", String(args.platform));
    if (args.minLiquidity !== undefined) params.set("minLiquidity", String(args.minLiquidity));
    if (args.limit !== undefined) params.set("limit", String(args.limit));
    const qs = params.toString();
    return {
      url: `${baseUrl}/api/prediction-markets${qs ? `?${qs}` : ""}`,
      init: { method: "GET" },
    };
  }
  if (toolName === "verifystack_defi_yields") {
    const params = new URLSearchParams();
    if (args.chain) params.set("chain", String(args.chain));
    if (args.symbol) params.set("symbol", String(args.symbol));
    if (args.project) params.set("project", String(args.project));
    if (args.stablecoin !== undefined) params.set("stablecoin", String(args.stablecoin));
    if (args.singleAsset !== undefined) params.set("singleAsset", String(args.singleAsset));
    if (args.minTvl !== undefined) params.set("minTvl", String(args.minTvl));
    if (args.minApy !== undefined) params.set("minApy", String(args.minApy));
    if (args.limit !== undefined) params.set("limit", String(args.limit));
    const qs = params.toString();
    return {
      url: `${baseUrl}/api/defi-yields${qs ? `?${qs}` : ""}`,
      init: { method: "GET" },
    };
  }
  if (toolName === "verifystack_web_research") {
    const params = new URLSearchParams();
    if (args.q) params.set("q", String(args.q));
    if (args.sources) params.set("sources", String(args.sources));
    if (args.limit !== undefined) params.set("limit", String(args.limit));
    const qs = params.toString();
    return {
      url: `${baseUrl}/api/web-research${qs ? `?${qs}` : ""}`,
      init: { method: "GET" },
    };
  }
  if (toolName === "verifystack_spot_perp_basis") {
    const params = new URLSearchParams();
    if (args.symbol) params.set("symbol", String(args.symbol));
    if (args.minBasisBps !== undefined) params.set("minBasisBps", String(args.minBasisBps));
    if (args.notionalUsd !== undefined) params.set("notionalUsd", String(args.notionalUsd));
    if (args.limit !== undefined) params.set("limit", String(args.limit));
    const qs = params.toString();
    return {
      url: `${baseUrl}/api/spot-perp-basis${qs ? `?${qs}` : ""}`,
      init: { method: "GET" },
    };
  }
  if (toolName === "verifystack_dex_market_intel") {
    const params = new URLSearchParams();
    if (args.q) params.set("q", String(args.q));
    if (args.address) params.set("address", String(args.address));
    if (args.chain) params.set("chain", String(args.chain));
    if (args.minLiquidityUsd !== undefined) params.set("minLiquidityUsd", String(args.minLiquidityUsd));
    if (args.limit !== undefined) params.set("limit", String(args.limit));
    const qs = params.toString();
    return {
      url: `${baseUrl}/api/dex-market-intel${qs ? `?${qs}` : ""}`,
      init: { method: "GET" },
    };
  }

  const postRoutes = {
    verifystack_clean_url: "/api/clean-url",
    verifystack_contract_intel: "/api/contract-intel",
    verifystack_decode_tx: "/api/decode-tx",
    verifystack_domain_intel: "/api/domain-intel",
    verifystack_wallet_profile: "/api/wallet-profile",
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
        serverInfo: { name: "verifystack-x402-mcp", version: "0.4.0" },
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
