import { runReverseSearchInBrowserWorker } from "./browserReverseSearch";
import {
  AGENT_TOOL_DEFINITIONS,
  WEBMCP_FORWARD_RESULT_EVENT,
  WEBMCP_REVERSE_RESULT_EVENT,
  completeReverseSearchForAgent,
  executeAgentTool,
  prepareReverseSearchForAgent,
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

async function executeWebMcpTool(
  toolName: string,
  args: unknown,
  signal?: AbortSignal,
): Promise<unknown> {
  if (toolName !== "yw2_reverse_search") {
    return executeAgentTool(toolName, args);
  }

  const prepared = prepareReverseSearchForAgent(args);
  const response = await runReverseSearchInBrowserWorker(prepared.input, signal);
  return completeReverseSearchForAgent(prepared, response);
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
        execute: async (args, context) => {
          const result = await executeWebMcpTool(
            definition.name,
            args,
            context?.signal,
          );
          syncResultToUi(definition.name, result);
          return JSON.stringify(result, null, 2);
        },
      },
      { signal: controller.signal },
    );
  }

  return controller;
}
