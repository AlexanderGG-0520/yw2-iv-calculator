import { Worker } from "node:worker_threads";
import { executeAgentTool } from "../src/agent/tools";

const MAX_CONCURRENT_REVERSE_SEARCHES = 1;
const DEFAULT_REVERSE_SEARCH_TIMEOUT_MS = 5_000;
const MAX_CONFIGURED_TIMEOUT_MS = 30_000;

let activeReverseSearches = 0;

type WorkerMessage =
  | { ok: true; result: unknown }
  | { ok: false; error: string };

function reverseSearchTimeoutMs(): number {
  const configured = Number(process.env.MCP_REVERSE_TIMEOUT_MS);
  if (!Number.isFinite(configured) || configured <= 0) {
    return DEFAULT_REVERSE_SEARCH_TIMEOUT_MS;
  }
  return Math.min(Math.trunc(configured), MAX_CONFIGURED_TIMEOUT_MS);
}

export class ReverseSearchBusyError extends Error {
  constructor() {
    super("reverse search is busy; try again after the current search completes");
    this.name = "ReverseSearchBusyError";
  }
}

export class ReverseSearchTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`reverse search exceeded the ${timeoutMs}ms timeout`);
    this.name = "ReverseSearchTimeoutError";
  }
}

export function activeRemoteReverseSearches(): number {
  return activeReverseSearches;
}

export function executeRemoteReverseSearch(args: unknown): Promise<unknown> {
  if (activeReverseSearches >= MAX_CONCURRENT_REVERSE_SEARCHES) {
    return Promise.reject(new ReverseSearchBusyError());
  }

  activeReverseSearches += 1;

  let worker: Worker;
  try {
    worker = new Worker(new URL("./reverseSearch.worker.js", import.meta.url), {
      resourceLimits: {
        maxOldGenerationSizeMb: 32,
        maxYoungGenerationSizeMb: 8,
        codeRangeSizeMb: 16,
        stackSizeMb: 2,
      },
    });
  } catch (error) {
    activeReverseSearches -= 1;
    return Promise.reject(error);
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const timeoutMs = reverseSearchTimeoutMs();

    const releaseSlot = () => {
      activeReverseSearches = Math.max(0, activeReverseSearches - 1);
    };

    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker.removeAllListeners();

      void worker
        .terminate()
        .catch(() => undefined)
        .finally(() => {
          releaseSlot();
          callback();
        });
    };

    const timer = setTimeout(() => {
      finish(() => reject(new ReverseSearchTimeoutError(timeoutMs)));
    }, timeoutMs);

    worker.once("message", (message: WorkerMessage) => {
      if (message.ok) {
        finish(() => resolve(message.result));
      } else {
        finish(() => reject(new Error(message.error)));
      }
    });

    worker.once("error", (error) => {
      finish(() => reject(error));
    });

    worker.once("exit", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      releaseSlot();
      reject(new Error(`reverse-search worker exited before responding (code ${code})`));
    });

    try {
      worker.postMessage(args);
    } catch (error) {
      finish(() => reject(error));
    }
  });
}

export async function executeRemoteAgentTool(
  name: string,
  args: unknown,
): Promise<unknown> {
  if (name === "yw2_reverse_search") {
    return executeRemoteReverseSearch(args);
  }

  return executeAgentTool(name, args);
}
