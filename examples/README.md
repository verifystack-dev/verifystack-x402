# VerifyStack x402 Code Examples

Ready-to-run examples for integrating VerifyStack's 12 pay-per-request x402 tools (Base Mainnet USDC, zero API keys).

| File | Language / Target | What it demonstrates |
| :--- | :--- | :--- |
| [mcp-configs.json](./mcp-configs.json) | JSON (Claude Desktop, Cursor, Windsurf) | Zero-install `npx -y verifystack-x402-mcp` MCP server setup |
| [python-x402-quickstart.py](./python-x402-quickstart.py) | Python (`x402[httpx,evm]`) | Async Python agent calling `/api/web-research`, `/api/defi-yields`, and `/api/token-safety` |
| [quickstart.mjs](./quickstart.mjs) | Node.js | Minimal x402 payment client calling `/api/live-funding-arb` & `/api/token-safety` |
| [agent-workflow.mjs](./agent-workflow.mjs) | Node.js | 5-step autonomous workflow (`web-research` -> `clean-url` -> `defi-yields` -> `prediction-markets` -> `decode-tx`) |
| [pretrade-safety-gate.mjs](./pretrade-safety-gate.mjs) | Node.js | 4-layer pre-trade risk gate (`token-safety`, `decode-tx`, `domain-intel`, `wallet-profile`) |
| [arb-monitor-loop.mjs](./arb-monitor-loop.mjs) | Node.js | Scheduled scanner loop monitoring funding spreads, prediction odds & Base USDC yields |
