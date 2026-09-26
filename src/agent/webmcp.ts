import {
  AGENT_TOOL_DEFINITIONS,
  WEBMCP_FORWARD_RESULT_EVENT,
  WEBMCP_REVERSE_RESULT_EVENT,
  executeAgentTool,
  type ForwardToolResult,
  type ReverseToolResult,
} from "./tools";

function currentModelContext() {
  return document.modelContext ?? navigator.modelContext;
}

function syncResultToUi(toolName: string, result: unknown): void {
  if (toolName === "yw2_calculate_stats") {
    window.dispatchEvent(
      new CustomEvent<ForwardToolResult>(WEBMCP_FORWARD_RESULT_EVENT, {
        detail: result as ForwardToolResult,
      }),
    );
  }

  if (toolName === "yw2_reverse_search") {
    window.dispatchEvent(
      new CustomEvent<ReverseToolResult>(WEBMCP_REVERSE_RESULT_EVENT, {
        detail: result as ReverseToolResult,
      }),
    );
  }
}

export async function registerWebMcpTools(): Promise<AbortController | null> {
  const modelContext = currentModelContext();
  if (!modelContext) return null;

  const controller = new AbortController();

  for (const definition of AGENT_TOOL_DEFINITIONS) {
    const mutatesVisibleUi =
      definition.name === "yw2_calculate_stats" ||
      definition.name === "yw2_reverse_search";

    await modelContext.registerTool(
      {
        ...definition,
        annotations: {
          readOnlyHint: !mutatesVisibleUi,
          consequentialHint: false,
          untrustedContentHint: false,
          debugging: false,
        },
        execute: async (args) => {
          const result = executeAgentTool(definition.name, args);
          syncResultToUi(definition.name, result);
          return JSON.stringify(result, null, 2);
        },
      },
      { signal: controller.signal },
    );
  }

  return controller;
}
