import { describe, expect, it } from "vitest";
import {
  SCORE_PROFILE_DESCRIPTIONS,
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

describe("score profiles", () => {
  it("exposes labels and descriptions for every profile", () => {
    expect(SCORE_PROFILE_IDS).toHaveLength(13);

    for (const id of SCORE_PROFILE_IDS) {
      expect(SCORE_PROFILE_LABELS[id].length).toBeGreaterThan(0);
      expect(SCORE_PROFILE_DESCRIPTIONS[id].length).toBeGreaterThan(0);
      expect(Number.isFinite(scoreIv(strengthHeavy, id))).toBe(true);
    }
  });

  it("ranks specialized spreads according to their intended axes", () => {
    expect(scoreIv(strengthHeavy, "physical")).toBeGreaterThan(scoreIv(spiritHeavy, "physical"));
    expect(scoreIv(spiritHeavy, "magic")).toBeGreaterThan(scoreIv(strengthHeavy, "magic"));
    expect(scoreIv(speedHeavy, "speed")).toBeGreaterThan(scoreIv(defenseHeavy, "speed"));
    expect(scoreIv(hpHeavy, "hpTank")).toBeGreaterThan(scoreIv(speedHeavy, "hpTank"));
    expect(scoreIv(defenseHeavy, "defense")).toBeGreaterThan(scoreIv(hpHeavy, "defense"));
  });

  it("keeps balanced evaluation neutral across weighted IV allocation", () => {
    expect(scoreIv(strengthHeavy, "balanced")).toBe(40);
    expect(scoreIv(spiritHeavy, "balanced")).toBe(40);
    expect(scoreIv(speedHeavy, "balanced")).toBe(40);
    expect(scoreIv(hpHeavy, "balanced")).toBe(40);
    expect(scoreIv(defenseHeavy, "balanced")).toBe(40);
  });
});
