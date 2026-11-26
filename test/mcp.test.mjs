import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { handleRpcMessage, TOOLS } from "../bin/verifystack-mcp.mjs";

describe("VerifyStack x402 MCP Server", () => {
  it("handles initialize and lists all 17 x402 tools", async () => {
    const initRes = await handleRpcMessage({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {},
    });
    assert.equal(initRes.result.serverInfo.name, "verifystack-x402-mcp");
    assert.equal(initRes.result.serverInfo.version, "0.6.1");

    const listRes = await handleRpcMessage({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
    });
    assert.equal(listRes.result.tools.length, 17);
    assert.deepEqual(
      listRes.result.tools.map((t) => t.name),
      TOOLS.map((t) => t.name)
    );
    for (const tool of listRes.result.tools) {
      assert.ok(tool.title && tool.title.length > 0, `${tool.name} missing title`);
      assert.equal(tool.annotations?.readOnlyHint, true, `${tool.name} missing readOnlyHint`);
      assert.equal(tool.annotations?.destructiveHint, false, `${tool.name} missing destructiveHint`);
      assert.equal(tool.inputSchema?.additionalProperties, false, `${tool.name} missing additionalProperties: false`);
      for (const [propName, propSchema] of Object.entries(tool.inputSchema?.properties ?? {})) {
        assert.ok(
          propSchema.description && propSchema.description.length > 0,
          `${tool.name}.${propName} missing description`
        );
      }
    }
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

  it("routes verifystack_alpha_history GET query parameters properly", async () => {
    let capturedUrl = "";
    const mockFetch = async (url) => {
      capturedUrl = String(url);
      return new Response(JSON.stringify({ recordsReturned: 1, records: [{ symbol: "BTC" }] }), {
        status: 200,
      });
    };

    const res = await handleRpcMessage(
      {
        jsonrpc: "2.0",
        id: 5,
        method: "tools/call",
        params: {
          name: "verifystack_alpha_history",
          arguments: { feed: "funding", days: 3, symbol: "BTC", minApr: 50 },
        },
      },
      { fetchFn: mockFetch }
    );

    assert.equal(res.result.isError, false);
    assert.match(capturedUrl, /\/api\/alpha-history\?/);
    assert.match(capturedUrl, /feed=funding/);
    assert.match(capturedUrl, /days=3/);
    assert.match(capturedUrl, /symbol=BTC/);
    assert.match(capturedUrl, /minApr=50/);
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
