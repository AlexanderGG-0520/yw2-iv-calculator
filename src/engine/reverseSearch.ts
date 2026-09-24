import { calculateStat } from "./calculationEngine";
import { fitnessFromSessions } from "./fitness";
import { scoreIv } from "./scoring";
import {
  STAT_KEYS,
  type IvCandidate,
  type ReverseResult,
  type SearchInput,
  type SearchResponse,
  type StatBlock,
  type StatKey,
} from "./types";
import { getYokaiSpecies } from "./yokaiData";

const emptyStatBlock = (): StatBlock => ({ hp: 0, strength: 0, spirit: 0, defense: 0, speed: 0 });

function ivValues(stat: StatKey): number[] {
  if (stat === "hp") return Array.from({ length: 41 }, (_, i) => i * 2);
  return Array.from({ length: 41 }, (_, i) => i);
}

function ivCost(stat: StatKey, iv: number): number {
  return stat === "hp" ? iv / 2 : iv;
}

export function buildCandidatesForStat(input: SearchInput, stat: StatKey): IvCandidate[] {
  const species = getYokaiSpecies(input.speciesId);
  const fitness = fitnessFromSessions(input.sessions);
  const candidates: IvCandidate[] = [];

  for (const iv of ivValues(stat)) {
    const calculated = calculateStat({
      species,
      stat,
      level: input.level,
      iv,
      ev: input.ev[stat],
      fitness: fitness[stat],
      equipment: input.equipment[stat],
    });
    if (calculated === input.observed[stat]) {
      candidates.push({ stat, iv, calculated });
    }
  }

  return candidates;
}

export function reverseSearch(input: SearchInput): SearchResponse {
  const maxResults = Math.max(1, Math.min(500, input.maxResults));
  const perStat = Object.fromEntries(
    STAT_KEYS.map((stat) => [stat, buildCandidatesForStat(input, stat)]),
  ) as Record<StatKey, IvCandidate[]>;
  const perStatCandidateCounts = Object.fromEntries(
    STAT_KEYS.map((stat) => [stat, perStat[stat].length]),
  ) as StatBlock;

  const workingIv = emptyStatBlock();
  const workingCalculated = emptyStatBlock();
  const results: ReverseResult[] = [];
  let combinationsVisited = 0;
  let validCandidateCount = 0;
  let truncated = false;
  const maxCombinations = 2_000_000;

  function visit(statIndex: number, weightedTotal: number): void {
    if (truncated) return;
    if (combinationsVisited >= maxCombinations) {
      truncated = true;
      return;
    }

    if (statIndex === STAT_KEYS.length) {
      combinationsVisited += 1;
      if (weightedTotal !== 40) return;

      validCandidateCount += 1;
      const iv = { ...workingIv };
      const calculated = { ...workingCalculated };
      results.push({
        id: String(validCandidateCount),
        iv,
        calculated,
        score: scoreIv(iv, input.scoreProfile),
      });
      results.sort((a, b) => b.score - a.score);
      if (results.length > maxResults) results.length = maxResults;
      return;
    }

    const stat = STAT_KEYS[statIndex];
    const remaining = STAT_KEYS.length - statIndex - 1;
    for (const candidate of perStat[stat]) {
      const next = weightedTotal + ivCost(stat, candidate.iv);
      if (next > 40) continue;
      if (next + remaining * 40 < 40) continue;

      workingIv[stat] = candidate.iv;
      workingCalculated[stat] = candidate.calculated;
      visit(statIndex + 1, next);
    }
  }

  visit(0, 0);

  return {
    results,
    summary: {
      perStatCandidateCounts,
      combinationsVisited,
      validCandidateCount,
      truncated,
    },
  };
}
