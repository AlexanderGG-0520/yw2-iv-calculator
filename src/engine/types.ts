export const STAT_KEYS = ["hp", "strength", "spirit", "defense", "speed"] as const;

export type StatKey = (typeof STAT_KEYS)[number];
export type StatBlock = Record<StatKey, number>;

export interface YokaiSpecies {
  id: string;
  number: number;
  name: string;
  baseA: StatBlock;
  baseB: StatBlock;
  source: "togenyan-yw2";
}

export interface SportsSessions {
  strength: number;
  spirit: number;
  defense: number;
  speed: number;
}

export type ScoreProfileId =
  | "physical"
  | "magic"
  | "physicalSpeed"
  | "magicSpeed"
  | "mixed"
  | "physicalBruiser"
  | "magicBruiser"
  | "tank"
  | "hpTank"
  | "defense"
  | "speed"
  | "healer"
  | "buffer"
  | "statDebuffer"
  | "statusController"
  | "dotDebuffer"
  | "purifier"
  | "reviver"
  | "utility"
  | "backlineSupport"
  | "balanced";

export interface SearchInput {
  speciesId: string;
  level: number;
  observed: StatBlock;
  ev: StatBlock;
  sessions: SportsSessions;
  equipment: StatBlock;
  scoreProfile: ScoreProfileId;
  maxResults: number;
}

export interface IvCandidate {
  stat: StatKey;
  iv: number;
  calculated: number;
}

export interface ReverseResult {
  id: string;
  iv: StatBlock;
  calculated: StatBlock;
  score: number;
}

export interface SearchSummary {
  perStatCandidateCounts: StatBlock;
  combinationsVisited: number;
  validCandidateCount: number;
  truncated: boolean;
}

export interface SearchResponse {
  results: ReverseResult[];
  summary: SearchSummary;
}
