/**
 * Example autonomous AI agent workflow using VerifyStack x402 APIs on Base.
 * Demonstrates:
 *   1. Universal Research Search ($0.004)
 *   2. Web-to-LLM Markdown Extraction ($0.005)
 *   3. DeFi Stablecoin Yield Scanning on Base ($0.005)
 *   4. Prediction Market Divergence Scan ($0.008)
 *   5. Pre-Sign EVM Calldata Firewall ($0.005)
 *
 * Usage:
 *   X402_BUYER_KEY="0xYOUR_BASE_BUYER_KEY" node examples/agent-workflow.mjs
 */
import { x402Client } from "@x402/core/client";
import { x402HTTPClient } from "@x402/core/http";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

const BASE_URL =
  process.env.VERIFYSTACK_URL ||
  "https://x402-crypto-math-api.verifystack.workers.dev";
const PRIVATE_KEY = process.env.X402_BUYER_KEY;

if (!PRIVATE_KEY || !/^0x[0-9a-fA-F]{64}$/.test(PRIVATE_KEY)) {
  console.error("Set X402_BUYER_KEY=0x<64-hex-chars> funded with USDC on Base (eip155:8453).");
  process.exit(1);
}

const account = privateKeyToAccount(PRIVATE_KEY);
const coreClient = new x402Client();
registerExactEvmScheme(coreClient, { signer: account });
const httpClient = new x402HTTPClient(coreClient);

async function payAndFetch(path, init = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, init);
  if (res.status !== 402) return res.json();

  const req = httpClient.getPaymentRequiredResponse((h) => res.headers.get(h));
  const payload = await httpClient.createPaymentPayload(req);
  const authHeaders = httpClient.encodePaymentSignatureHeader(payload);

  const paid = await fetch(url, {
    ...init,
    headers: { ...(init.headers || {}), ...authHeaders },
  });
  return paid.json();
}

// 1. Universal Research Search ($0.004)
const research = await payAndFetch("/api/web-research?q=x402+protocol&limit=2");
console.log("1) Web Research results:", research.totalResults);

// 2. Clean a web page into compact Markdown ($0.005)
const markdown = await payAndFetch("/api/clean-url", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ url: "https://example.com", maxChars: 2000 }),
});
console.log("2) Clean URL:", markdown.title, "| tokens:", markdown.estimatedTokens);

// 3. Top organic USDC yields on Base ($0.005)
const yields = await payAndFetch("/api/defi-yields?chain=Base&symbol=USDC&stablecoin=true&limit=3");
console.log("3) Base USDC Yields:", yields.pools?.slice(0, 2));

// 4. Prediction markets cross-platform divergence ($0.008)
const odds = await payAndFetch("/api/prediction-markets?q=bitcoin&limit=3");
console.log("4) Prediction Markets matched:", odds.totalMatchedMarkets, "| divergences:", odds.crossPlatformMatches?.length);

// 5. Pre-sign calldata firewall ($0.005)
const txCheck = await payAndFetch("/api/decode-tx", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    data: "0x095ea7b3000000000000000000000000000000000000000000000000000000000000deadffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
  }),
});
console.log("5) Calldata Firewall verdict:", txCheck.verdict, txCheck.actionSummary);
