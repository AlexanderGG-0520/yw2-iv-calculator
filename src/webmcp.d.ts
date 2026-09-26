export {};

type WebMcpExecuteContext = {
  signal?: AbortSignal;
};

type WebMcpTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: {
    readOnlyHint?: boolean;
    consequentialHint?: boolean;
    untrustedContentHint?: boolean;
    debugging?: boolean;
  };
  execute: (
    args: Record<string, unknown>,
    context?: WebMcpExecuteContext,
  ) => unknown | Promise<unknown>;
};

interface WebMcpModelContext {
  registerTool(
    tool: WebMcpTool,
    options?: {
      signal?: AbortSignal;
      exposedTo?: string[];
    },
  ): Promise<void>;
}

declare global {
  interface Document {
    modelContext?: WebMcpModelContext;
  }

  interface Navigator {
    /** @deprecated WebMCP moved to document.modelContext. Kept only as a compatibility fallback. */
    modelContext?: WebMcpModelContext;
  }
}
