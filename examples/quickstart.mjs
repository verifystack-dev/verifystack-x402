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

async function fetchPaid(path, init = {}) {
  const url = `${BASE_URL}${path}`;
  const initial = await fetch(url, init);
  if (initial.status !== 402) return initial;

  const paymentRequired = httpClient.getPaymentRequiredResponse((name) =>
    initial.headers.get(name)
  );
  const payload = await httpClient.createPaymentPayload(paymentRequired);
  const headers = httpClient.encodePaymentSignatureHeader(payload);

  return fetch(url, {
    ...init,
    headers: { ...(init.headers || {}), ...headers },
  });
}

const arbRes = await fetchPaid("/api/live-funding-arb?limit=5");
console.log("Live Funding Arb:", arbRes.status, await arbRes.json());

const safetyRes = await fetchPaid("/api/token-safety", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    chain: "base",
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  }),
});
console.log("Token Safety:", safetyRes.status, await safetyRes.json());
