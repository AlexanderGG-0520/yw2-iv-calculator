const DEFAULT_MCP_ALLOWED_ORIGINS = ["https://yw2-iv.alec-ofc.com"];

function normalizeOrigin(value: string): string {
  if (value === "null") return value;

  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("MCP_ALLOWED_ORIGINS only supports http(s) origins");
  }
  return url.origin;
}

export function mcpAllowedOrigins(
  configured = process.env.MCP_ALLOWED_ORIGINS,
): ReadonlySet<string> {
  const entries =
    configured === undefined
      ? DEFAULT_MCP_ALLOWED_ORIGINS
      : configured
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean);

  return new Set(entries.map(normalizeOrigin));
}

export function isAllowedMcpOrigin(
  origin: string | undefined,
  allowedOrigins: ReadonlySet<string>,
): boolean {
  if (origin === undefined) return true;
  if (origin === "null") return allowedOrigins.has("null");

  try {
    return allowedOrigins.has(normalizeOrigin(origin));
  } catch {
    return false;
  }
}
