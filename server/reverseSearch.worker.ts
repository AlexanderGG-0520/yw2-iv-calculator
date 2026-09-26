import { parentPort } from "node:worker_threads";
import { reverseSearchForAgent } from "../src/agent/tools";

if (!parentPort) {
  throw new Error("reverse-search worker requires a parent port");
}

parentPort.once("message", (args: unknown) => {
  try {
    parentPort?.postMessage({
      ok: true,
      result: reverseSearchForAgent(args),
    });
  } catch (error) {
    parentPort?.postMessage({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
