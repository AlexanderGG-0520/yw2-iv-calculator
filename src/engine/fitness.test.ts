import { describe, expect, it } from "vitest";
import { fitnessFromSessions, totalSessions } from "./fitness";

describe("Sports Club", () => {
  it("applies the documented session effects", () => {
    expect(fitnessFromSessions({ strength: 1, spirit: 1, defense: 1, speed: 1 })).toEqual({
      hp: 0,
      strength: 5,
      spirit: 5,
      defense: 1,
      speed: 1,
    });
  });

  it("counts all four session categories against the shared five-session limit", () => {
    expect(totalSessions({ strength: 2, spirit: 1, defense: 1, speed: 1 })).toBe(5);
  });
});
