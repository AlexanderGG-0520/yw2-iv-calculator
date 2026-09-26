import { describe, expect, it } from "vitest";
import {
  AGENT_TOOL_DEFINITIONS,
  calculateStatsForAgent,
  listScoreProfiles,
  reverseSearchForAgent,
  searchYokai,
} from "./tools";

const zero = { hp: 0, strength: 0, spirit: 0, defense: 0, speed: 0 };
const zeroSessions = { strength: 0, spirit: 0, defense: 0, speed: 0 };

describe("agent tools", () => {
  it("exposes a stable four-tool surface", () => {
    expect(AGENT_TOOL_DEFINITIONS.map((tool) => tool.name)).toEqual([
      "yw2_search_yokai",
      "yw2_list_score_profiles",
      "yw2_calculate_stats",
      "yw2_reverse_search",
    ]);
  });

  it("searches Yo-kai by name and returns species identifiers", () => {
    const result = searchYokai({ query: "トゲニャン", limit: 10 });

    expect(result.results.some((entry) => entry.id === "yw2-136")).toBe(true);
  });

  it("calculates the published Thornyan level 40 fixture", () => {
    const result = calculateStatsForAgent({
      species: "yw2-136",
      level: 40,
      iv: { hp: 16, strength: 8, spirit: 8, defense: 8, speed: 8 },
      ev: zero,
      sessions: zeroSessions,
      equipment: zero,
    });

    expect(result.stats).toEqual({
      hp: 169,
      strength: 79,
      spirit: 68,
      defense: 71,
      speed: 91,
    });
  });

  it("reverse-searches the same fixture and includes its exact IV spread", () => {
    const result = reverseSearchForAgent({
      species: "トゲニャン",
      level: 40,
      observed: {
        hp: 169,
        strength: 79,
        spirit: 68,
        defense: 71,
        speed: 91,
      },
      ev: zero,
      sessions: zeroSessions,
      equipment: zero,
      scoreProfile: "balanced",
      maxResults: 100,
    });

    expect(
      result.response.results.some(
        (entry) =>
          entry.iv.hp === 16 &&
          entry.iv.strength === 8 &&
          entry.iv.spirit === 8 &&
          entry.iv.defense === 8 &&
          entry.iv.speed === 8,
      ),
    ).toBe(true);
  });

  it("lists role profiles including bad-inspirit roles", () => {
    const result = listScoreProfiles();
    const ids = result.groups.flatMap((group) =>
      group.profiles.map((profile) => profile.id),
    );

    expect(ids).toContain("statDebuffer");
    expect(ids).toContain("statusController");
    expect(ids).toContain("dotDebuffer");
  });

  it("rejects invalid forward IV spreads", () => {
    expect(() =>
      calculateStatsForAgent({
        species: "yw2-136",
        level: 40,
        iv: { hp: 0, strength: 40, spirit: 40, defense: 0, speed: 0 },
      }),
    ).toThrow(/IV/);
  });
});
