import { describe, expect, it } from "vitest";
import {
  MCP_MODERN_VERSION,
  handleMcpRpc,
} from "./mcpProtocol";

const META_KEY = "io.modelcontextprotocol/protocolVersion";

function modernHeaders(method: string, name?: string) {
  return {
    "MCP-Protocol-Version": MCP_MODERN_VERSION,
    "Mcp-Method": method,
    ...(name ? { "Mcp-Name": name } : {}),
  };
}

function modernParams(extra: Record<string, unknown> = {}) {
  return {
    ...extra,
    _meta: {
      [META_KEY]: MCP_MODERN_VERSION,
      "io.modelcontextprotocol/clientCapabilities": {},
      "io.modelcontextprotocol/clientInfo": {
        name: "yw2-test-client",
        version: "1.0.0",
      },
    },
  };
}

describe("MCP protocol", () => {
  it("supports modern server/discover without an initialize handshake", () => {
    const response = handleMcpRpc(
      {
        jsonrpc: "2.0",
        id: 1,
        method: "server/discover",
        params: modernParams(),
      },
      modernHeaders("server/discover"),
    );

    expect(response.status).toBe(200);
    const payload = response.payload as any;
    expect(payload.result.supportedVersions).toContain(MCP_MODERN_VERSION);
    expect(payload.result.resultType).toBe("complete");
  });

  it("lists tools for modern MCP clients", () => {
    const response = handleMcpRpc(
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
        params: modernParams(),
      },
      modernHeaders("tools/list"),
    );

    const payload = response.payload as any;
    expect(payload.result.tools.map((tool: any) => tool.name)).toContain(
      "yw2_reverse_search",
    );
    expect(payload.result.resultType).toBe("complete");
  });

  it("calls a tool with the modern protocol envelope", () => {
    const response = handleMcpRpc(
      {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: modernParams({
          name: "yw2_search_yokai",
          arguments: { query: "ジバニャン", limit: 5 },
        }),
      },
      modernHeaders("tools/call", "yw2_search_yokai"),
    );

    const payload = response.payload as any;
    expect(payload.result.isError).not.toBe(true);
    expect(payload.result.structuredContent.results.length).toBeGreaterThan(0);
    expect(payload.result.resultType).toBe("complete");
  });

  it("rejects modern calls whose routing headers do not match JSON-RPC", () => {
    const response = handleMcpRpc(
      {
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: modernParams({
          name: "yw2_search_yokai",
          arguments: { query: "ジバニャン" },
        }),
      },
      modernHeaders("tools/call", "wrong_tool"),
    );

    expect(response.status).toBe(400);
    const payload = response.payload as any;
    expect(payload.error.code).toBe(-32020);
  });

  it("rejects unsupported modern protocol versions with the MCP error code", () => {
    const unsupported = "2026-09-01";
    const response = handleMcpRpc(
      {
        jsonrpc: "2.0",
        id: 5,
        method: "tools/list",
        params: {
          _meta: {
            [META_KEY]: unsupported,
            "io.modelcontextprotocol/clientCapabilities": {},
          },
        },
      },
      {
        "MCP-Protocol-Version": unsupported,
        "Mcp-Method": "tools/list",
      },
    );

    expect(response.status).toBe(400);
    const payload = response.payload as any;
    expect(payload.error.code).toBe(-32022);
    expect(payload.error.data.requested).toBe(unsupported);
    expect(payload.error.data.supported).toContain(MCP_MODERN_VERSION);
  });

  it("keeps legacy initialize + tools/list compatibility", () => {
    const initialize = handleMcpRpc({
      jsonrpc: "2.0",
      id: 6,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "test-client", version: "1.0.0" },
      },
    });

    const initPayload = initialize.payload as any;
    expect(initPayload.result.protocolVersion).toBe("2025-06-18");

    const list = handleMcpRpc({
      jsonrpc: "2.0",
      id: 7,
      method: "tools/list",
      params: {},
    });

    const listPayload = list.payload as any;
    expect(listPayload.result.tools.length).toBe(4);
    expect(listPayload.result.resultType).toBeUndefined();
  });

  it("returns tool validation failures as MCP tool errors", () => {
    const response = handleMcpRpc({
      jsonrpc: "2.0",
      id: 8,
      method: "tools/call",
      params: {
        name: "yw2_calculate_stats",
        arguments: {
          species: "yw2-136",
          level: 40,
          iv: { hp: 0, strength: 40, spirit: 40, defense: 0, speed: 0 },
        },
      },
    });

    const payload = response.payload as any;
    expect(payload.result.isError).toBe(true);
    expect(payload.result.content[0].text).toContain("IV");
  });
});
