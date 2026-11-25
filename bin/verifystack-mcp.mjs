#!/usr/bin/env node
import readline from "node:readline";
import { pathToFileURL } from "node:url";

const DEFAULT_BASE_URL = "https://x402-crypto-math-api.verifystack.workers.dev";

const READ_NETWORK_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
};

const PURE_COMPUTE_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export const TOOLS = [
  {
    name: "verifystack_live_funding_arb",
    title: "Live Cross-Exchange Funding Rate Arbitrage Scanner",
    annotations: READ_NETWORK_ANNOTATIONS,
    description:
      "Paid x402 API ($0.01 USDC on Base): Real-time cross-exchange perpetual funding rate arbitrage scanner aggregating Hyperliquid, dYdX v4, and Gate.io normalized to hourly spreads and gross APR.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
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
    title: "Live Multi-Venue Prediction Market Scanner",
    annotations: READ_NETWORK_ANNOTATIONS,
    description:
      "Paid x402 API ($0.008 USDC on Base): Live prediction market scanner aggregating Polymarket, Kalshi, and Manifold Markets with normalized YES/NO probabilities, spreads, and cross-venue arbitrage divergences.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
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
    title: "Live DeFi Yield & Stablecoin APY Scanner",
    annotations: READ_NETWORK_ANNOTATIONS,
    description:
      "Paid x402 API ($0.005 USDC on Base): Live DeFi yield & stablecoin APY scanner powered by DefiLlama; filters by chain, symbol, TVL, and separates organic Base APY from reward emissions.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
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
    title: "EVM Transaction Decoder & Calldata Firewall",
    annotations: READ_NETWORK_ANNOTATIONS,
    description:
      "Paid x402 API ($0.005 USDC on Base): EVM calldata & live transaction decoder via OpenChain + EVM RPC; flags unlimited ERC-20/NFT approvals before signing.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        data: { type: "string", description: "Raw 0x hex calldata to decode" },
        to: { type: "string", description: "Optional target contract address" },
        valueWei: { type: "string", description: "Optional native value in wei" },
        txHash: { type: "string", description: "Optional live 0x tx hash to fetch and decode" },
        chain: {
          type: "string",
          enum: ["base", "ethereum", "arbitrum", "optimism", "polygon"],
          description: "Target EVM chain used when fetching live txHash (default: base)",
        },
      },
    },
  },
  {
    name: "verifystack_domain_intel",
    title: "Domain Anti-Phishing & Trust Profiler",
    annotations: READ_NETWORK_ANNOTATIONS,
    description:
      "Paid x402 API ($0.004 USDC on Base): Domain anti-phishing & trust profiler via Cloudflare DoH (A/MX/SPF/DMARC), RDAP registration age, and HTTPS security headers.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
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
    title: "Universal Multi-Source Web & Academic Search",
    annotations: READ_NETWORK_ANNOTATIONS,
    description:
      "Paid x402 API ($0.004 USDC on Base): Universal multi-source research & news search across HackerNews, GitHub Repositories, arXiv papers, and Wikipedia with zero API keys (60s cache).",
    inputSchema: {
      type: "object",
      additionalProperties: false,
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
    title: "Web-to-Markdown Cleaner & Token Estimator",
    annotations: READ_NETWORK_ANNOTATIONS,
    description:
      "Paid x402 API ($0.005 USDC on Base): Fetches any public URL, strips ads/scripts/navigation boilerplate, and returns clean LLM-ready Markdown, metadata, and token-count estimation.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
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
    title: "Multichain EVM Wallet & Gas Profiler",
    annotations: READ_NETWORK_ANNOTATIONS,
    description:
      "Paid x402 API ($0.008 USDC on Base): Multichain EVM wallet counterparty & gas profiler across Base, Ethereum, Arbitrum, Optimism, and Polygon (native/USDC balances, EOA vs contract check, nonce activity, live gas fees).",
    inputSchema: {
      type: "object",
      additionalProperties: false,
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
    title: "Pre-Trade Token Security & Liquidity Audit",
    annotations: READ_NETWORK_ANNOTATIONS,
    description:
      "Paid x402 API ($0.008 USDC on Base): Pre-trade token security and DEX liquidity risk audit aggregating GoPlus Security, Honeypot.is simulation, and DexScreener liquidity.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["chain", "address"],
      properties: {
        chain: {
          type: "string",
          enum: ["base", "ethereum", "arbitrum", "bsc", "polygon", "solana"],
          description: "Blockchain network hosting the token contract",
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
    title: "Cryptographic Signature & Smart Wallet Verifier",
    annotations: READ_NETWORK_ANNOTATIONS,
    description:
      "Paid x402 API ($0.005 USDC on Base): Deterministic cryptographic signature verifier for EVM EIP-191 personal_sign, EIP-712 typed data, ERC-1271 on-chain smart wallets, and Ed25519 (Solana).",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["scheme", "signature"],
      properties: {
        scheme: {
          type: "string",
          enum: ["evm_personal", "evm_eip712", "evm_erc1271", "ed25519"],
          description: "Signature verification scheme to evaluate",
        },
        chain: {
          type: "string",
          enum: ["base", "ethereum", "arbitrum", "optimism", "polygon"],
          description: "Target EVM chain for live on-chain ERC-1271 smart wallet verification",
        },
        message: {
          type: "string",
          description: "Signed plaintext, hex, or base64 payload (required for personal_sign, ERC-1271, Ed25519)",
        },
        messageEncoding: {
          type: "string",
          enum: ["utf8", "hex", "base64"],
          description: "Input encoding of message (default: utf8)",
        },
        signature: {
          type: "string",
          description: "Cryptographic signature bytes (0x hex for EVM; Base58/hex/base64 for Ed25519)",
        },
        expectedAddress: {
          type: "string",
          description: "Expected 0x EVM signer or smart-wallet address to match against",
        },
        publicKey: {
          type: "string",
          description: "Ed25519 public key (Solana Base58 or hex) required for ed25519 scheme",
        },
        typedData: {
          type: "object",
          description: "EIP-712 structured object containing domain, types, primaryType, and message",
        },
      },
    },
  },
  {
    name: "verifystack_arb_net_profit",
    title: "Arbitrage Net Profit & Break-Even Calculator",
    annotations: PURE_COMPUTE_ANNOTATIONS,
    description:
      "Paid x402 API ($0.005 USDC on Base): Exact arbitrage net profit, break-even spread, and APR calculator accounting for maker/taker fees, slippage, transfer gas, and funding.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: [
        "notionalUsd",
        "buyPrice",
        "sellPrice",
        "buyFeeBps",
        "sellFeeBps",
      ],
      properties: {
        notionalUsd: { type: "number", description: "Trade position notional size in USD" },
        buyPrice: { type: "number", description: "Execution buy price on long venue" },
        sellPrice: { type: "number", description: "Execution sell price on short venue" },
        buyFeeBps: { type: "number", description: "Buy-side taker/maker fee in basis points" },
        sellFeeBps: { type: "number", description: "Sell-side taker/maker fee in basis points" },
        slippageBps: { type: "number", description: "Estimated combined slippage in basis points (default 0)" },
        gasAndTransferUsd: { type: "number", description: "Fixed on-chain gas or bridge transfer cost in USD (default 0)" },
        fundingRate8hBps: { type: "number", description: "Expected net 8-hour funding rate advantage in bps" },
        holdHours: { type: "number", description: "Planned holding duration in hours for APR & funding accrual" },
      },
    },
  },
  {
    name: "verifystack_liquidation_sim",
    title: "Perpetual Liquidation & Half-Kelly Risk Simulator",
    annotations: PURE_COMPUTE_ANNOTATIONS,
    description:
      "Paid x402 API ($0.005 USDC on Base): Isolated-margin perpetual liquidation threshold, distance-to-liquidation %, risk-reward ratio, and conservative half-Kelly sizing simulator.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["side", "entryPrice", "leverage", "collateralUsd"],
      properties: {
        side: { type: "string", enum: ["long", "short"], description: "Position direction (long or short)" },
        entryPrice: { type: "number", description: "Position entry price in USD" },
        leverage: { type: "number", description: "Position leverage multiplier (e.g. 5, 10, 20)" },
        collateralUsd: { type: "number", description: "Isolated initial margin collateral in USD" },
        maintenanceMarginRate: { type: "number", description: "Exchange maintenance margin ratio (e.g. 0.005 for 0.5%)" },
        targetPrice: { type: "number", description: "Optional take-profit target price for R:R calculation" },
        stopLossPrice: { type: "number", description: "Optional stop-loss price for R:R calculation" },
        winProbability: { type: "number", description: "Estimated trade win probability (0 to 1) for half-Kelly sizing" },
      },
    },
  },
  {
    name: "verifystack_contract_intel",
    title: "Smart Contract Firewall & EIP-1967 Proxy Inspector",
    annotations: READ_NETWORK_ANNOTATIONS,
    description:
      "Paid x402 API ($0.008 USDC on Base): Smart contract firewall & EIP-1967 proxy inspector via EVM RPC, Blockscout verification/ABI, and Sourcify across Base, Ethereum, Arbitrum, Optimism, and Polygon.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
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
    title: "Spot vs Perpetual Cash-and-Carry Basis Scanner",
    annotations: READ_NETWORK_ANNOTATIONS,
    description:
      "Paid x402 API ($0.008 USDC on Base): Live cross-exchange cash-and-carry Spot vs Perpetual basis, executable BBO spread, and combined 30d carry APR scanner across Gate.io, OKX, and Hyperliquid.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
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
    title: "Multi-Chain DEX Liquidity & Order-Flow Oracle",
    annotations: READ_NETWORK_ANNOTATIONS,
    description:
      "Paid x402 API ($0.006 USDC on Base): Multi-chain DEX liquidity, 24h volume, price changes, and buy/sell order-flow oracle powered by DexScreener and GeckoTerminal.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
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
  {
    name: "verifystack_render_url",
    title: "Headless Chromium JS Web Renderer & Screenshotter",
    annotations: READ_NETWORK_ANNOTATIONS,
    description:
      "Paid x402 API ($0.02 USDC on Base): Renders dynamic JavaScript/SPA/React web pages inside a real headless Chromium browser with SSRF protection, returning clean Markdown, metadata, optional links, and optional JPEG/PNG screenshot.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["url"],
      properties: {
        url: {
          type: "string",
          description: "Public http:// or https:// URL to render in Chromium",
        },
        waitUntil: {
          type: "string",
          description: "Navigation readiness event: domcontentloaded, load, or networkidle (default networkidle)",
        },
        waitMs: {
          type: "number",
          description: "Extra settle delay in ms after load for SPA hydration (0-5000, default 500)",
        },
        waitForSelector: {
          type: "string",
          description: "Optional CSS selector to wait for before extracting content",
        },
        maxChars: {
          type: "number",
          description: "Maximum Markdown length returned (200-40000, default 12000)",
        },
        includeLinks: {
          type: "boolean",
          description: "Include extracted outbound links array (default false)",
        },
        includeScreenshot: {
          type: "boolean",
          description: "Capture base64 JPEG or PNG screenshot of rendered page (default false)",
        },
        screenshotFormat: {
          type: "string",
          description: "Screenshot encoding when includeScreenshot is true: jpeg or png (default jpeg)",
        },
        fullPage: {
          type: "boolean",
          description: "Capture full scrollable page screenshot instead of viewport (default false)",
        },
        blockMedia: {
          type: "boolean",
          description: "Block images/fonts/video for faster extraction (defaults true unless includeScreenshot is true)",
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
    verifystack_render_url: "/api/render-url",
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
        serverInfo: { name: "verifystack-x402-mcp", version: "0.5.0" },
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
