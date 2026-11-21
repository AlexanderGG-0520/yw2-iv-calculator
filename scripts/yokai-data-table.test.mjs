import { describe, expect, it } from "vitest";
import { parseTable } from "./yokai-data-table.mjs";

function row(number, name, baseA, baseB) {
  const cells = [number, name, ...baseA, ...baseB];
  return "<tr>" + cells.map((value) => "<td>" + value + "</td>").join("") + "</tr>";
}

describe("YW2 source data sync", () => {
  const boss = [999, 100, 100, 100, 100];
  const normalA = [50, 20, 15, 10, 20];
  const normalB = [400, 200, 150, 100, 180];
  const html = [
    row(136, "トゲニャン", normalA, normalB),
    row(389, "デカニャン", normalA, normalB),
    row(427, "赤鬼", boss, boss),
    row(428, "青鬼", boss, boss),
    row(429, "黒鬼", boss, boss),
    row(438, "赤鬼", [358, 135, 9, 2, 87], [480, 236, 133, 178, 183]),
    row(439, "青鬼", [358, 2, 112, 20, 99], [461, 182, 220, 179, 168]),
    row(440, "黒鬼", [362, 60, 70, 82, 26], [502, 245, 83, 250, 140]),
    row(390, "大後悔船長", normalA, [0, 0, 0, 0, 0]),
  ].join("\n");

  it("excludes Dekanyan and boss-only Oni even when Base B is populated", () => {
    const species = parseTable(html);
    expect(species.map(({ number }) => number)).toEqual([136, 438, 439, 440]);
  });

  it("retains exactly the playable Oni variants with their original source IDs and stats", () => {
    const species = parseTable(html);
    for (const [name, number] of [["赤鬼", 438], ["青鬼", 439], ["黒鬼", 440]]) {
      const matches = species.filter((entry) => entry.name === name);
      expect(matches).toHaveLength(1);
      expect(matches[0].number).toBe(number);
      expect(matches[0].id).toBe("yw2-" + number);
    }
    expect(species.find((entry) => entry.number === 438).baseB).toEqual({
      hp: 480,
      strength: 236,
      spirit: 133,
      defense: 178,
      speed: 183,
    });
  });

  it("continues to exclude rows without a usable Base B", () => {
    expect(parseTable(html).some((entry) => entry.number === 390)).toBe(false);
  });
});
