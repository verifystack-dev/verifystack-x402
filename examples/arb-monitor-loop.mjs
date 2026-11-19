/**
 * Automated Quant & Arbitrage Scanner Loop using VerifyStack x402 APIs.
 * Polls cross-exchange funding spreads, prediction market divergences, and Base USDC yields.
 *
 * Usage:
 *   X402_BUYER_KEY="0xYOUR_BASE_BUYER_KEY" node examples/arb-monitor-loop.mjs
 *   (Optional env: INTERVAL_SEC=300 MAX_TICKS=1 MIN_APR=25)
 */
import { x402Client } from "@x402/core/client";
import { x402HTTPClient } from "@x402/core/http";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

const BASE_URL =
  process.env.VERIFYSTACK_URL ||
  "https://x402-crypto-math-api.verifystack.workers.dev";
const PRIVATE_KEY = process.env.X402_BUYER_KEY;
const INTERVAL_SEC = Number(process.env.INTERVAL_SEC || 300);
const MAX_TICKS = Number(process.env.MAX_TICKS || 1);
const MIN_APR = Number(process.env.MIN_APR || 20);

if (!PRIVATE_KEY || !/^0x[0-9a-fA-F]{64}$/.test(PRIVATE_KEY)) {
  console.error("Set X402_BUYER_KEY=0x<64-hex-chars> funded with Base USDC.");
  process.exit(1);
}

const account = privateKeyToAccount(PRIVATE_KEY);
const coreClient = new x402Client();
registerExactEvmScheme(coreClient, { signer: account });
const httpClient = new x402HTTPClient(coreClient);

async function fetchPaidJson(path) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url);
  if (res.status !== 402) return res.json();

  const req = httpClient.getPaymentRequiredResponse((h) => res.headers.get(h));
  const payload = await httpClient.createPaymentPayload(req);
  const authHeaders = httpClient.encodePaymentSignatureHeader(payload);

  const paid = await fetch(url, { headers: authHeaders });
  return paid.json();
}

async function runTick(tick) {
  const [funding, predictions, yields] = await Promise.all([
    fetchPaidJson(`/api/live-funding-arb?minApr=${MIN_APR}&limit=5`),
    fetchPaidJson(`/api/prediction-markets?limit=10`),
    fetchPaidJson(`/api/defi-yields?chain=Base&symbol=USDC&stablecoin=true&minTvl=1000000&limit=3`),
  ]);

  console.log(`\n=== Tick #${tick} (${new Date().toISOString()}) ===`);
  console.log("Top Funding Arb:", funding.opportunities?.[0] ?? "none");
  console.log(
    "Top Prediction Divergence:",
    predictions.crossPlatformMatches?.[0] ?? "none"
  );
  console.log("Top Base Organic USDC Pool:", yields.pools?.[0] ?? "none");
}

for (let tick = 1; tick <= MAX_TICKS; tick++) {
  await runTick(tick);
  if (tick < MAX_TICKS) {
    await new Promise((r) => setTimeout(r, INTERVAL_SEC * 1000));
  }
}
