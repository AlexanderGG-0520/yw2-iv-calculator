import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { handleMcpRpc } from "./mcpProtocol";

const PORT = Number(process.env.PORT ?? 8080);
const HOST = process.env.HOST ?? "0.0.0.0";
const DIST_ROOT = fileURLToPath(new URL("../dist/", import.meta.url));
const MAX_BODY_BYTES = 1_000_000;

const MIME_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
};

function setCorsHeaders(res: import("node:http").ServerResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Accept, Authorization, MCP-Protocol-Version, Mcp-Method, Mcp-Name, Mcp-Session-Id",
  );
  res.setHeader(
    "Access-Control-Expose-Headers",
    "MCP-Protocol-Version, Mcp-Session-Id",
  );
}

function json(
  res: import("node:http").ServerResponse,
  status: number,
  payload: unknown,
): void {
  const body = JSON.stringify(payload);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Length", Buffer.byteLength(body));
  res.end(body);
}

async function readJsonBody(
  req: import("node:http").IncomingMessage,
): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) {
      throw new Error("request body too large");
    }
    chunks.push(buffer);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return JSON.parse(raw || "{}");
}

function authorized(req: import("node:http").IncomingMessage): boolean {
  const expected = process.env.MCP_BEARER_TOKEN;
  if (!expected) return true;
  return req.headers.authorization === "Bearer " + expected;
}

async function serveMcp(
  req: import("node:http").IncomingMessage,
  res: import("node:http").ServerResponse,
): Promise<void> {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Allow", "POST, OPTIONS");
    res.end("Method Not Allowed");
    return;
  }

  if (!authorized(req)) {
    res.statusCode = 401;
    res.setHeader("WWW-Authenticate", 'Bearer realm="yw2-iv-calculator-mcp"');
    res.end("Unauthorized");
    return;
  }

  try {
    const body = await readJsonBody(req);
    const headers = Object.fromEntries(
      Object.entries(req.headers).map(([key, value]) => [
        key,
        Array.isArray(value) ? value.join(", ") : value,
      ]),
    );

    const result = handleMcpRpc(body, headers);
    if (result.payload === undefined) {
      res.statusCode = result.status;
      res.end();
      return;
    }

    json(res, result.status, result.payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "request body too large") {
      json(res, 413, {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32600, message },
      });
      return;
    }

    json(res, 400, {
      jsonrpc: "2.0",
      id: null,
      error: {
        code: -32700,
        message: "Parse error",
      },
    });
  }
}

function safeStaticPath(pathname: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  const relative = decoded.replace(/^\/+/, "");
  const candidate = resolve(DIST_ROOT, relative);
  const rootPrefix = DIST_ROOT.endsWith(sep) ? DIST_ROOT : DIST_ROOT + sep;

  if (candidate !== DIST_ROOT && !candidate.startsWith(rootPrefix)) return null;
  return candidate;
}

async function sendFile(
  res: import("node:http").ServerResponse,
  filePath: string,
  cache = true,
): Promise<boolean> {
  try {
    const info = await stat(filePath);
    if (!info.isFile()) return false;

    const body = await readFile(filePath);
    res.statusCode = 200;
    res.setHeader(
      "Content-Type",
      MIME_TYPES[extname(filePath).toLowerCase()] ?? "application/octet-stream",
    );
    res.setHeader(
      "Cache-Control",
      cache ? "public, max-age=604800" : "no-cache",
    );
    res.setHeader("Content-Length", body.length);
    res.end(body);
    return true;
  } catch {
    return false;
  }
}

async function serveStatic(
  pathname: string,
  res: import("node:http").ServerResponse,
): Promise<void> {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const path = safeStaticPath(requested);

  if (path && (await sendFile(res, path, requested !== "/index.html" && requested !== "/robots.txt"))) {
    return;
  }

  await sendFile(res, resolve(DIST_ROOT, "index.html"), false);
}

const server = createServer((req, res) => {
  res.setHeader("Origin-Agent-Cluster", "?1");
  res.setHeader("Permissions-Policy", "tools=(self)");
  res.setHeader("X-Content-Type-Options", "nosniff");

  void (async () => {
    const url = new URL(req.url ?? "/", "http://localhost");

    if (url.pathname === "/healthz") {
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("ok\n");
      return;
    }

    if (url.pathname === "/mcp") {
      await serveMcp(req, res);
      return;
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      res.statusCode = 405;
      res.end("Method Not Allowed");
      return;
    }

    await serveStatic(url.pathname, res);
  })().catch((error) => {
    console.error(error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
    }
    res.end("Internal Server Error");
  });
});

server.listen(PORT, HOST, () => {
  console.log(`YW2 IV Calculator listening on http://${HOST}:${PORT}`);
  console.log("MCP endpoint: /mcp");
});
