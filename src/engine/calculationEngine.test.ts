import { describe, expect, it } from "vitest";
import { calculateStats, evWeightedTotal, isValidIvSpread, ivWeightedTotal } from "./calculationEngine";
import { getYokaiSpecies } from "./yokaiData";

const zero = { hp: 0, strength: 0, spirit: 0, defense: 0, speed: 0 };

describe("YW2 calculation engine", () => {
  it("reproduces the published level-40 Thornyan example", () => {
    const thornyan = getYokaiSpecies("yw2-136");
    const iv = { hp: 16, strength: 8, spirit: 8, defense: 8, speed: 8 };
    const stats = calculateStats(thornyan, 40, iv, zero, zero, zero);
    expect(stats).toEqual({ hp: 169, strength: 79, spirit: 68, defense: 71, speed: 91 });
  });

  it("reproduces the published fusion EV example at levels 40 and 99", () => {
    const thornyan = getYokaiSpecies("yw2-136");
    const iv = { hp: 16, strength: 8, spirit: 8, defense: 8, speed: 8 };
    const ev = { hp: 0, strength: 10, spirit: 10, defense: 0, speed: 0 };
    expect(calculateStats(thornyan, 40, iv, ev, zero, zero)).toEqual({
      hp: 169, strength: 91, spirit: 80, defense: 71, speed: 91,
    });
    expect(calculateStats(thornyan, 99, iv, ev, zero, zero)).toEqual({
      hp: 360, strength: 182, spirit: 161, defense: 151, speed: 195,
    });
  });

  it("uses the weighted 40-point IV pool", () => {
    const balanced = { hp: 16, strength: 8, spirit: 8, defense: 8, speed: 8 };
    expect(ivWeightedTotal(balanced)).toBe(40);
    expect(isValidIvSpread(balanced)).toBe(true);
    expect(isValidIvSpread({ ...balanced, hp: 15 })).toBe(false);
  });

  it("uses the weighted EV pool", () => {
    expect(evWeightedTotal({ hp: 0, strength: 10, spirit: 10, defense: 0, speed: 0 })).toBe(20);
  });
});
