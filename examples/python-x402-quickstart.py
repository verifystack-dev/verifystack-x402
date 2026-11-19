"""
VerifyStack x402 Python Quickstart (x402 v2 SDK + httpx)

Install dependencies:
  pip install "x402[httpx,evm]" eth-account

Run (wallet funded with USDC on Base eip155:8453):
  export X402_BUYER_KEY="0xYOUR_BASE_BUYER_PRIVATE_KEY"
  python examples/python-x402-quickstart.py
"""
import asyncio
import os
from eth_account import Account
from x402 import x402Client
from x402.http.clients import x402HttpxClient
from x402.mechanisms.evm import EthAccountSigner
from x402.mechanisms.evm.exact.register import register_exact_evm_client

BASE_URL = os.environ.get(
    "VERIFYSTACK_URL",
    "https://x402-crypto-math-api.verifystack.workers.dev",
)


async def main() -> None:
    private_key = os.environ.get("X402_BUYER_KEY")
    if not private_key:
        raise SystemExit("Set X402_BUYER_KEY=0x<64-hex-chars> funded with Base USDC.")

    account = Account.from_key(private_key)
    client = x402Client()
    register_exact_evm_client(client, EthAccountSigner(account))

    async with x402HttpxClient(client, timeout=30.0) as http:
        # 1. Universal Research Search ($0.004 USDC)
        res = await http.get(f"{BASE_URL}/api/web-research?q=x402+agents&limit=3")
        print("Web Research:", res.status_code, res.json())

        # 2. DeFi Organic USDC Yields on Base ($0.005 USDC)
        yields = await http.get(
            f"{BASE_URL}/api/defi-yields?chain=Base&symbol=USDC&stablecoin=true&limit=3"
        )
        print("Base USDC Yields:", yields.status_code, yields.json())

        # 3. Pre-Trade Token Safety Audit ($0.008 USDC)
        safety = await http.post(
            f"{BASE_URL}/api/token-safety",
            json={
                "chain": "base",
                "address": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            },
        )
        print("Token Safety:", safety.status_code, safety.json())


if __name__ == "__main__":
    asyncio.run(main())
