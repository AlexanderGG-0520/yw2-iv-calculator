import { afterEach, describe, expect, it, vi } from "vitest";

const fakeWorkerState = vi.hoisted(() => ({
  instances: [] as any[],
}));

vi.mock("node:worker_threads", () => {
  class FakeWorker {
    handlers = new Map<string, (...args: any[]) => void>();
    lastMessage: unknown;
    options: unknown;
    resolveTermination!: (code: number) => void;
    termination = new Promise<number>((resolve) => {
      this.resolveTermination = resolve;
    });

    constructor(_url: URL, options: unknown) {
      this.options = options;
      fakeWorkerState.instances.push(this);
    }

    once(event: string, handler: (...args: any[]) => void) {
      this.handlers.set(event, handler);
      return this;
    }

    removeAllListeners() {
      this.handlers.clear();
      return this;
    }

    postMessage(message: unknown) {
      this.lastMessage = message;
    }

    terminate() {
      return this.termination;
    }

    emit(event: string, ...args: any[]) {
      const handler = this.handlers.get(event);
      if (!handler) return;
      this.handlers.delete(event);
      handler(...args);
    }
  }

  return { Worker: FakeWorker };
});

import {
  ReverseSearchBusyError,
  activeRemoteReverseSearches,
  executeRemoteReverseSearch,
} from "./remoteToolExecutor";

describe("remote reverse-search executor", () => {
  afterEach(() => {
    fakeWorkerState.instances = [];
    delete process.env.MCP_REVERSE_TIMEOUT_MS;
  });

  it("allows only one reverse-search worker and holds the slot until termination completes", async () => {
    const first = executeRemoteReverseSearch({ request: 1 });
    expect(activeRemoteReverseSearches()).toBe(1);

    await expect(executeRemoteReverseSearch({ request: 2 })).rejects.toBeInstanceOf(
      ReverseSearchBusyError,
    );

    const worker = fakeWorkerState.instances[0];
    expect(worker.lastMessage).toEqual({ request: 1 });
    expect(worker.options).toMatchObject({
      resourceLimits: {
        maxOldGenerationSizeMb: 32,
        maxYoungGenerationSizeMb: 8,
        codeRangeSizeMb: 16,
        stackSizeMb: 2,
      },
    });

    worker.emit("message", { ok: true, result: { done: true } });

    // The response has arrived, but the Worker is still terminating.
    expect(activeRemoteReverseSearches()).toBe(1);
    await expect(executeRemoteReverseSearch({ request: 3 })).rejects.toBeInstanceOf(
      ReverseSearchBusyError,
    );

    worker.resolveTermination(0);
    await expect(first).resolves.toEqual({ done: true });
    expect(activeRemoteReverseSearches()).toBe(0);
  });
});
