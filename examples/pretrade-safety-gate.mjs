/**
 * 4-Layer Pre-Trade Safety & Anti-Phishing Gatekeeper for DeFi / Trading Bots.
 * Total cost per full check: ~$0.025 USDC on Base (or call individual endpoints).
 *
 * Usage:
 *   X402_BUYER_KEY="0xYOUR_BASE_BUYER_KEY" node examples/pretrade-safety-gate.mjs
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
  console.error("Set X402_BUYER_KEY=0x<64-hex-chars> funded with Base USDC.");
  process.exit(1);
}

const account = privateKeyToAccount(PRIVATE_KEY);
const coreClient = new x402Client();
registerExactEvmScheme(coreClient, { signer: account });
const httpClient = new x402HTTPClient(coreClient);

async function callPaid(path, body) {
  const url = `${BASE_URL}${path}`;
  const init = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
  const first = await fetch(url, init);
  if (first.status !== 402) return first.json();

  const req = httpClient.getPaymentRequiredResponse((h) => first.headers.get(h));
  const payload = await httpClient.createPaymentPayload(req);
  const authHeaders = httpClient.encodePaymentSignatureHeader(payload);

  const paid = await fetch(url, {
    ...init,
    headers: { ...init.headers, ...authHeaders },
  });
  return paid.json();
}

const TARGET_TOKEN = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // Base USDC
const TARGET_SITE = "https://app.uniswap.org";
const SAMPLE_CALLDATA =
  "0x095ea7b3000000000000000000000000000000000000000000000000000000000000deadffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

const [tokenAudit, txAudit, domainAudit, walletAudit] = await Promise.all([
  callPaid("/api/token-safety", { chain: "base", address: TARGET_TOKEN }),
  callPaid("/api/decode-tx", { data: SAMPLE_CALLDATA }),
  callPaid("/api/domain-intel", { domainOrUrl: TARGET_SITE }),
  callPaid("/api/wallet-profile", { address: account.address, chains: ["base", "arbitrum"] }),
]);

const blocked =
  tokenAudit.verdict === "CRITICAL_DO_NOT_TRADE" ||
  txAudit.verdict === "CRITICAL_UNLIMITED_APPROVAL" ||
  domainAudit.verdict === "HIGH_RISK_NEW_OR_SUSPICIOUS";

console.log(
  JSON.stringify(
    {
      tradeAllowed: !blocked,
      tokenVerdict: tokenAudit.verdict,
      txVerdict: txAudit.verdict,
      domainVerdict: domainAudit.verdict,
      walletTotalUsdc: walletAudit.summary?.totalUsdcBalance,
    },
    null,
    2
  )
);
