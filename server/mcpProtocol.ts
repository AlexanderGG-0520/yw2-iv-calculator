import {
  AGENT_TOOL_DEFINITIONS,
  executeAgentTool,
  isKnownAgentTool,
} from "../src/agent/tools";

export const MCP_MODERN_VERSION = "2026-07-28";
export const MCP_LEGACY_VERSIONS = [
  "2025-11-25",
  "2025-06-18",
  "2025-03-26",
  "2024-11-05",
] as const;

const SERVER_INFO = {
  name: "yw2-iv-calculator",
  version: "1.0.0",
};

const SERVER_INFO_META_KEY = "io.modelcontextprotocol/serverInfo";
const PROTOCOL_VERSION_META_KEY = "io.modelcontextprotocol/protocolVersion";

const SERVER_INSTRUCTIONS =
  "妖怪ウォッチ2の個体値計算ツールです。speciesは名前・図鑑番号・species IDで指定できます。逆算前に曖昧な場合はyw2_search_yokaiを使い、役割別評価を確認したい場合はyw2_list_score_profilesを使ってください。全ツールはゲームデータを変更しない読み取り・計算専用です。";

export interface McpRpcHttpResult {
  status: number;
  payload?: unknown;
}

export type McpToolExecutor = (
  name: string,
  args: unknown,
) => unknown | Promise<unknown>;

type JsonRpcId = string | number | null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function responseMeta(): Record<string, unknown> {
  return {
    [SERVER_INFO_META_KEY]: SERVER_INFO,
  };
}

function success(id: JsonRpcId, result: unknown): McpRpcHttpResult {
  return {
    status: 200,
    payload: {
      jsonrpc: "2.0",
      id,
      result,
    },
  };
}

function failure(
  id: JsonRpcId,
  code: number,
  message: string,
  data?: unknown,
  status = 200,
): McpRpcHttpResult {
  return {
    status,
    payload: {
      jsonrpc: "2.0",
      id,
      error: {
        code,
        message,
        ...(data === undefined ? {} : { data }),
      },
    },
  };
}

function header(headers: Record<string, string | undefined>, name: string): string | undefined {
  const target = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === target) return value;
  }
  return undefined;
}

function modernResult<T extends Record<string, unknown>>(result: T): T & {
  resultType: "complete";
  _meta: Record<string, unknown>;
} {
  return {
    ...result,
    resultType: "complete",
    _meta: responseMeta(),
  };
}

function isModernRequest(
  method: string,
  params: Record<string, unknown>,
  headers: Record<string, string | undefined>,
): boolean {
  if (method === "server/discover") return true;

  const protocolHeader = header(headers, "MCP-Protocol-Version");
  if (protocolHeader === MCP_MODERN_VERSION) return true;
  if (
    protocolHeader &&
    !(MCP_LEGACY_VERSIONS as readonly string[]).includes(protocolHeader)
  ) {
    return true;
  }

  const meta = isRecord(params._meta) ? params._meta : undefined;
  const metaVersion = meta?.[PROTOCOL_VERSION_META_KEY];
  if (metaVersion === MCP_MODERN_VERSION) return true;
  return (
    typeof metaVersion === "string" &&
    !(MCP_LEGACY_VERSIONS as readonly string[]).includes(metaVersion)
  );
}

type ModernEnvelopeError = {
  code: number;
  message: string;
  data?: unknown;
};

function validateModernEnvelope(
  method: string,
  params: Record<string, unknown>,
  headers: Record<string, string | undefined>,
): ModernEnvelopeError | null {
  if (!isRecord(params._meta)) {
    return {
      code: -32602,
      message: "Modern MCP requests require params._meta",
    };
  }

  const protocolHeader = header(headers, "MCP-Protocol-Version");
  const metaVersion = params._meta[PROTOCOL_VERSION_META_KEY];

  if (
    typeof protocolHeader !== "string" ||
    typeof metaVersion !== "string" ||
    protocolHeader !== metaVersion
  ) {
    return {
      code: -32020,
      message: "MCP-Protocol-Version header must match params._meta protocolVersion",
    };
  }

  if (metaVersion !== MCP_MODERN_VERSION) {
    return {
      code: -32022,
      message: "Unsupported protocol version",
      data: {
        requested: metaVersion,
        supported: [MCP_MODERN_VERSION, ...MCP_LEGACY_VERSIONS],
      },
    };
  }

  if (!isRecord(params._meta["io.modelcontextprotocol/clientCapabilities"])) {
    return {
      code: -32602,
      message:
        "params._meta.io.modelcontextprotocol/clientCapabilities is required",
    };
  }

  const methodHeader = header(headers, "Mcp-Method");
  if (methodHeader !== method) {
    return {
      code: -32020,
      message: "Mcp-Method header must match the JSON-RPC method",
    };
  }

  if (method === "tools/call") {
    const requestedName = typeof params.name === "string" ? params.name : "";
    if (header(headers, "Mcp-Name") !== requestedName) {
      return {
        code: -32020,
        message: "Mcp-Name header must match params.name",
      };
    }
  }

  return null;
}

function mcpTools() {
  return AGENT_TOOL_DEFINITIONS.map((definition) => ({
    name: definition.name,
    description: definition.description,
    inputSchema: definition.inputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  }));
}

function toolCallResult(
  result: unknown,
  isModern: boolean,
  isError = false,
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    content: [
      {
        type: "text",
        text:
          typeof result === "string"
            ? result
            : JSON.stringify(result, null, 2),
      },
    ],
    ...(isError ? { isError: true } : {}),
    ...(!isError && (isRecord(result) || Array.isArray(result))
      ? { structuredContent: result }
      : {}),
  };

  return isModern ? modernResult(base) : base;
}

function discover(id: JsonRpcId): McpRpcHttpResult {
  return success(
    id,
    modernResult({
      supportedVersions: [MCP_MODERN_VERSION, ...MCP_LEGACY_VERSIONS],
      capabilities: {
        tools: {},
      },
      instructions: SERVER_INSTRUCTIONS,
      ttlMs: 300_000,
      cacheScope: "public",
    }),
  );
}

function initialize(
  id: JsonRpcId,
  params: Record<string, unknown>,
): McpRpcHttpResult {
  const requested =
    typeof params.protocolVersion === "string"
      ? params.protocolVersion
      : MCP_LEGACY_VERSIONS[0];

  const protocolVersion = (
    MCP_LEGACY_VERSIONS as readonly string[]
  ).includes(requested)
    ? requested
    : MCP_LEGACY_VERSIONS[0];

  return success(id, {
    protocolVersion,
    capabilities: {
      tools: {
        listChanged: false,
      },
    },
    serverInfo: SERVER_INFO,
    instructions: SERVER_INSTRUCTIONS,
  });
}

export async function handleMcpRpc(
  body: unknown,
  headers: Record<string, string | undefined> = {},
  executeTool: McpToolExecutor = executeAgentTool,
): Promise<McpRpcHttpResult> {
  if (!isRecord(body)) {
    return failure(null, -32600, "Invalid Request");
  }

  const id =
    typeof body.id === "string" || typeof body.id === "number" || body.id === null
      ? (body.id as JsonRpcId)
      : null;
  const method = typeof body.method === "string" ? body.method : "";
  const params = isRecord(body.params) ? body.params : {};

  if (body.jsonrpc !== "2.0" || !method) {
    return failure(id, -32600, "Invalid Request");
  }

  if (body.id === undefined) {
    return { status: 202 };
  }

  const modern = isModernRequest(method, params, headers);
  if (modern) {
    const envelopeError = validateModernEnvelope(method, params, headers);
    if (envelopeError) {
      return failure(
        id,
        envelopeError.code,
        envelopeError.message,
        envelopeError.data,
        400,
      );
    }
  }

  if (method === "server/discover") {
    return discover(id);
  }

  if (method === "initialize") {
    return initialize(id, params);
  }

  if (method === "ping") {
    if (modern) return failure(id, -32601, "Method not found");
    return success(id, {});
  }

  if (method === "tools/list") {
    const result = {
      tools: mcpTools(),
      ...(modern
        ? {
            ttlMs: 300_000,
            cacheScope: "public" as const,
          }
        : {}),
    };

    return success(id, modern ? modernResult(result) : result);
  }

  if (method === "tools/call") {
    const name = typeof params.name === "string" ? params.name : "";
    if (!name || !isKnownAgentTool(name)) {
      return failure(id, -32602, "Unknown tool", { name });
    }

    try {
      const result = await executeTool(name, params.arguments ?? {});
      return success(id, toolCallResult(result, modern));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return success(id, toolCallResult({ error: message }, modern, true));
    }
  }

  return failure(id, -32601, "Method not found", { method });
}
