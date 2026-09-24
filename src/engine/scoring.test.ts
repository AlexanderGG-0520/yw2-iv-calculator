import { describe, expect, it } from "vitest";
import {
  SCORE_PROFILE_DESCRIPTIONS,
  SCORE_PROFILE_GROUPS,
  SCORE_PROFILE_IDS,
  SCORE_PROFILE_LABELS,
  scoreIv,
} from "./scoring";
import type { StatBlock } from "./types";

const strengthHeavy: StatBlock = { hp: 0, strength: 40, spirit: 0, defense: 0, speed: 0 };
const spiritHeavy: StatBlock = { hp: 0, strength: 0, spirit: 40, defense: 0, speed: 0 };
const speedHeavy: StatBlock = { hp: 0, strength: 0, spirit: 0, defense: 0, speed: 40 };
const hpHeavy: StatBlock = { hp: 80, strength: 0, spirit: 0, defense: 0, speed: 0 };
const defenseHeavy: StatBlock = { hp: 0, strength: 0, spirit: 0, defense: 40, speed: 0 };
const mixedBalanced: StatBlock = { hp: 0, strength: 20, spirit: 20, defense: 0, speed: 0 };
const mixedSkewed: StatBlock = { hp: 0, strength: 30, spirit: 10, defense: 0, speed: 0 };
const mixedSkewedReverse: StatBlock = { hp: 0, strength: 10, spirit: 30, defense: 0, speed: 0 };

describe("score profiles", () => {
  it("exposes labels and descriptions for every profile", () => {
    expect(SCORE_PROFILE_IDS).toHaveLength(21);
    expect(new Set(SCORE_PROFILE_IDS).size).toBe(SCORE_PROFILE_IDS.length);
    expect(SCORE_PROFILE_GROUPS.flatMap((group) => group.ids)).toEqual(SCORE_PROFILE_IDS);

    for (const id of SCORE_PROFILE_IDS) {
      expect(SCORE_PROFILE_LABELS[id].length).toBeGreaterThan(0);
      expect(SCORE_PROFILE_DESCRIPTIONS[id].length).toBeGreaterThan(0);
      expect(Number.isFinite(scoreIv(strengthHeavy, id))).toBe(true);
    }
  });

  it("ranks offensive and defensive spreads according to their intended axes", () => {
    expect(scoreIv(strengthHeavy, "physical")).toBeGreaterThan(scoreIv(spiritHeavy, "physical"));
    expect(scoreIv(spiritHeavy, "magic")).toBeGreaterThan(scoreIv(strengthHeavy, "magic"));
    expect(scoreIv(speedHeavy, "speed")).toBeGreaterThan(scoreIv(defenseHeavy, "speed"));
    expect(scoreIv(hpHeavy, "hpTank")).toBeGreaterThan(scoreIv(speedHeavy, "hpTank"));
    expect(scoreIv(defenseHeavy, "defense")).toBeGreaterThan(scoreIv(hpHeavy, "defense"));
  });

  it("rewards investment in both attacking stats for mixed attackers", () => {
    expect(scoreIv(strengthHeavy, "mixed")).toBe(54);
    expect(scoreIv(mixedSkewed, "mixed")).toBe(61.5);
    expect(scoreIv(mixedBalanced, "mixed")).toBe(69);

    expect(scoreIv(mixedBalanced, "mixed")).toBeGreaterThan(scoreIv(mixedSkewed, "mixed"));
    expect(scoreIv(mixedSkewed, "mixed")).toBeGreaterThan(scoreIv(strengthHeavy, "mixed"));
    expect(scoreIv(mixedSkewed, "mixed")).toBe(scoreIv(mixedSkewedReverse, "mixed"));
  });

  it("gives support roles distinct priorities", () => {
    expect(scoreIv(spiritHeavy, "healer")).toBeGreaterThan(scoreIv(strengthHeavy, "healer"));
    expect(scoreIv(speedHeavy, "buffer")).toBeGreaterThan(scoreIv(strengthHeavy, "buffer"));
    expect(scoreIv(speedHeavy, "statDebuffer")).toBeGreaterThan(scoreIv(strengthHeavy, "statDebuffer"));
    expect(scoreIv(speedHeavy, "statusController")).toBeGreaterThan(scoreIv(hpHeavy, "statusController"));
    expect(scoreIv(speedHeavy, "dotDebuffer")).toBeGreaterThan(scoreIv(strengthHeavy, "dotDebuffer"));
    expect(scoreIv(hpHeavy, "backlineSupport")).toBeGreaterThan(scoreIv(strengthHeavy, "backlineSupport"));
  });

  it("keeps balanced evaluation neutral across weighted IV allocation", () => {
    expect(scoreIv(strengthHeavy, "balanced")).toBe(40);
    expect(scoreIv(spiritHeavy, "balanced")).toBe(40);
    expect(scoreIv(speedHeavy, "balanced")).toBe(40);
    expect(scoreIv(hpHeavy, "balanced")).toBe(40);
    expect(scoreIv(defenseHeavy, "balanced")).toBe(40);
  });
});
