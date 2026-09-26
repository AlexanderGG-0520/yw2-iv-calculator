// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import {
  WEBMCP_FORWARD_RESULT_EVENT,
  type ForwardToolResult,
} from "./tools";
import { registerWebMcpTools } from "./webmcp";

describe("WebMCP registration", () => {
  afterEach(() => {
    delete document.modelContext;
    delete navigator.modelContext;
  });

  it("registers all browser-native tools on document.modelContext", async () => {
    const registered: Array<{
      name: string;
      execute: (args: Record<string, unknown>) => unknown | Promise<unknown>;
    }> = [];

    document.modelContext = {
      registerTool: async (tool) => {
        registered.push(tool);
      },
    };

    const controller = await registerWebMcpTools();

    expect(controller).not.toBeNull();
    expect(registered.map((tool) => tool.name)).toEqual([
      "yw2_search_yokai",
      "yw2_list_score_profiles",
      "yw2_calculate_stats",
      "yw2_reverse_search",
    ]);

    controller?.abort();
  });

  it("syncs forward tool results back to the visible page through an event", async () => {
    const registered: Array<{
      name: string;
      execute: (args: Record<string, unknown>) => unknown | Promise<unknown>;
    }> = [];

    document.modelContext = {
      registerTool: async (tool) => {
        registered.push(tool);
      },
    };

    const forwarded: { current: ForwardToolResult | null } = { current: null };
    const listener = (event: Event) => {
      forwarded.current = (event as CustomEvent<ForwardToolResult>).detail;
    };
    window.addEventListener(WEBMCP_FORWARD_RESULT_EVENT, listener);

    const controller = await registerWebMcpTools();
    const calculate = registered.find((tool) => tool.name === "yw2_calculate_stats");
    expect(calculate).toBeDefined();

    const result = await calculate!.execute({
      species: "yw2-136",
      level: 40,
      iv: { hp: 16, strength: 8, spirit: 8, defense: 8, speed: 8 },
    });

    expect(typeof result).toBe("string");
    expect(forwarded.current?.stats).toEqual({
      hp: 169,
      strength: 79,
      spirit: 68,
      defense: 71,
      speed: 91,
    });

    window.removeEventListener(WEBMCP_FORWARD_RESULT_EVENT, listener);
    controller?.abort();
  });

  it("does nothing on browsers without WebMCP", async () => {
    expect(await registerWebMcpTools()).toBeNull();
  });
});
