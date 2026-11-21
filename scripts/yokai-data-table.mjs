// Source table includes a story-only character and boss variants with non-zero Base B.
// These cannot be used with playable Yo-kai IV calculations.
const EXCLUDED_SOURCE_NUMBERS = new Set([389, 427, 428, 429]);

function decodeHtml(value) {
  return value
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .trim();
}

export function parseTable(html) {
  const rows = [];
  for (const rowMatch of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...rowMatch[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)]
      .map((match) => decodeHtml(match[1]));
    if (cells.length < 12) continue;

    const number = Number(cells[0]);
    const values = cells.slice(2, 12).map(Number);
    if (!Number.isInteger(number) || values.some((value) => !Number.isFinite(value))) continue;
    if (EXCLUDED_SOURCE_NUMBERS.has(number)) continue;

    const [aHp, aStr, aSpr, aDef, aSpd, bHp, bStr, bSpr, bDef, bSpd] = values;
    if (bHp === 0 && bStr === 0 && bSpr === 0 && bDef === 0 && bSpd === 0) continue;

    rows.push({
      id: "yw2-" + String(number).padStart(3, "0"),
      number,
      name: cells[1],
      baseA: { hp: aHp, strength: aStr, spirit: aSpr, defense: aDef, speed: aSpd },
      baseB: { hp: bHp, strength: bStr, spirit: bSpr, defense: bDef, speed: bSpd },
      source: "togenyan-yw2",
    });
  }
  return rows;
}

