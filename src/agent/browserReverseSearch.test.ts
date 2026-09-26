// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import type { SearchInput, SearchResponse } from "../engine/types";
import { runReverseSearchInBrowserWorker } from "./browserReverseSearch";

const input: SearchInput = {
  speciesId: "yw2-136",
  level: 40,
  observed: { hp: 169, strength: 79, spirit: 68, defense: 71, speed: 91 },
  ev: { hp: 0, strength: 0, spirit: 0, defense: 0, speed: 0 },
  sessions: { strength: 0, spirit: 0, defense: 0, speed: 0 },
  equipment: { hp: 0, strength: 0, spirit: 0, defense: 0, speed: 0 },
  scoreProfile: "balanced",
  maxResults: 20,
};

const response: SearchResponse = {
  results: [],
  summary: {
    perStatCandidateCounts: { hp: 1, strength: 1, spirit: 1, defense: 1, speed: 1 },
    combinationsVisited: 1,
    validCandidateCount: 0,
    truncated: false,
  },
};

class FakeWorker {
  static instances: FakeWorker[] = [];

  onmessage: ((event: MessageEvent<any>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  terminated = false;
  lastMessage: unknown;

  constructor() {
    FakeWorker.instances.push(this);
  }

  postMessage(message: unknown) {
    this.lastMessage = message;
    queueMicrotask(() => {
      this.onmessage?.(
        new MessageEvent("message", {
          data: { ok: true, response },
        }),
      );
    });
  }

  terminate() {
    this.terminated = true;
  }
}

class HangingWorker extends FakeWorker {
  override postMessage(message: unknown) {
    this.lastMessage = message;
  }
}

describe("browser reverse-search worker helper", () => {
  afterEach(() => {
    FakeWorker.instances = [];
    vi.unstubAllGlobals();
  });

  it("runs reverse search outside the renderer thread", async () => {
    vi.stubGlobal("Worker", FakeWorker as any);

    await expect(runReverseSearchInBrowserWorker(input)).resolves.toEqual(response);

    expect(FakeWorker.instances).toHaveLength(1);
    expect(FakeWorker.instances[0].lastMessage).toEqual(input);
    expect(FakeWorker.instances[0].terminated).toBe(true);
  });

  it("terminates the worker when WebMCP execution is cancelled", async () => {
    vi.stubGlobal("Worker", HangingWorker as any);
    const controller = new AbortController();

    const pending = runReverseSearchInBrowserWorker(input, controller.signal);
    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(FakeWorker.instances[0].terminated).toBe(true);
  });
});
