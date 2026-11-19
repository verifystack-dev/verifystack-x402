import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { handleRpcMessage, TOOLS } from "../bin/verifystack-mcp.mjs";

describe("VerifyStack x402 MCP Server", () => {
  it("handles initialize and lists all 12 x402 tools", async () => {
    const initRes = await handleRpcMessage({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {},
    });
    assert.equal(initRes.result.serverInfo.name, "verifystack-x402-mcp");

    const listRes = await handleRpcMessage({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
    });
    assert.equal(listRes.result.tools.length, 12);
    assert.deepEqual(
      listRes.result.tools.map((t) => t.name),
      TOOLS.map((t) => t.name)
    );
  });

  it("returns decoded 402 quote when X402_BUYER_KEY is omitted", async () => {
    const paymentRequiredPayload = {
      x402Version: 2,
      accepts: [{ scheme: "exact", network: "eip155:8453", amount: "10000" }],
    };
    const mockFetch = async () =>
      new Response(JSON.stringify({ error: "Payment required" }), {
        status: 402,
        headers: {
          "PAYMENT-REQUIRED": Buffer.from(
            JSON.stringify(paymentRequiredPayload)
          ).toString("base64"),
        },
      });

    const callRes = await handleRpcMessage(
      {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: {
          name: "verifystack_live_funding_arb",
          arguments: { symbol: "SOL", limit: 5 },
        },
      },
      { fetchFn: mockFetch, buyerKey: "" }
    );

    assert.equal(callRes.result.isError, true);
    const body = JSON.parse(callRes.result.content[0].text);
    assert.equal(body.paymentRequired.accepts[0].network, "eip155:8453");
  });

  it("handles unknown tool errors gracefully", async () => {
    const res = await handleRpcMessage({
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: { name: "nonexistent_tool", arguments: {} },
    });
    assert.equal(res.result.isError, true);
    assert.match(res.result.content[0].text, /Unknown tool/);
  });
});
