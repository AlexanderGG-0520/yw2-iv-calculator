import type { ScoreProfileId, StatBlock } from "./types";

const PROFILES: Record<ScoreProfileId, StatBlock> = {
  physical: { hp: 0.2, strength: 2, spirit: 0, defense: 0.5, speed: 1 },
  magic: { hp: 0.2, strength: 0, spirit: 2, defense: 0.5, speed: 1 },
  tank: { hp: 1.2, strength: 0.2, spirit: 0.2, defense: 2, speed: 0.2 },
  speed: { hp: 0.2, strength: 0.5, spirit: 0.5, defense: 0.2, speed: 2 },
  balanced: { hp: 1, strength: 1, spirit: 1, defense: 1, speed: 1 },
};

export const SCORE_PROFILE_LABELS: Record<ScoreProfileId, string> = {
  physical: "物理アタッカー",
  magic: "妖術アタッカー",
  tank: "壁・耐久",
  speed: "すばやさ重視",
  balanced: "バランス",
};

export function scoreIv(iv: StatBlock, profile: ScoreProfileId): number {
  const weights = PROFILES[profile];
  return (
    (iv.hp / 2) * weights.hp +
    iv.strength * weights.strength +
    iv.spirit * weights.spirit +
    iv.defense * weights.defense +
    iv.speed * weights.speed
  );
}
