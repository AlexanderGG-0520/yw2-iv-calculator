import { describe, expect, it } from "vitest";
import { reverseSearch } from "./reverseSearch";

describe("reverseSearch", () => {
  it("finds the balanced IV spread from a known Thornyan fixture", () => {
    const response = reverseSearch({
      speciesId: "yw2-136",
      level: 40,
      observed: { hp: 169, strength: 91, spirit: 80, defense: 71, speed: 91 },
      ev: { hp: 0, strength: 10, spirit: 10, defense: 0, speed: 0 },
      sessions: { strength: 0, spirit: 0, defense: 0, speed: 0 },
      equipment: { hp: 0, strength: 0, spirit: 0, defense: 0, speed: 0 },
      scoreProfile: "balanced",
      maxResults: 500,
    });

    expect(response.summary.validCandidateCount).toBeGreaterThan(0);
    expect(response.results.some((result) =>
      result.iv.hp === 16 &&
      result.iv.strength === 8 &&
      result.iv.spirit === 8 &&
      result.iv.defense === 8 &&
      result.iv.speed === 8
    )).toBe(true);
  });
});
