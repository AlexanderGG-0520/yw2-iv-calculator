import type { ScoreProfileId, StatBlock } from "./types";

export const SCORE_PROFILE_IDS: readonly ScoreProfileId[] = [
  "balanced",
  "physical",
  "magic",
  "physicalSpeed",
  "magicSpeed",
  "mixed",
  "physicalBruiser",
  "magicBruiser",
  "tank",
  "hpTank",
  "defense",
  "speed",
  "support",
];

const PROFILES: Record<ScoreProfileId, StatBlock> = {
  balanced: { hp: 1, strength: 1, spirit: 1, defense: 1, speed: 1 },
  physical: { hp: 0.2, strength: 2, spirit: 0, defense: 0.5, speed: 1 },
  magic: { hp: 0.2, strength: 0, spirit: 2, defense: 0.5, speed: 1 },
  physicalSpeed: { hp: 0.15, strength: 1.8, spirit: 0, defense: 0.25, speed: 1.6 },
  magicSpeed: { hp: 0.15, strength: 0, spirit: 1.8, defense: 0.25, speed: 1.6 },
  mixed: { hp: 0.35, strength: 1.35, spirit: 1.35, defense: 0.4, speed: 0.8 },
  physicalBruiser: { hp: 0.9, strength: 1.6, spirit: 0, defense: 1.05, speed: 0.45 },
  magicBruiser: { hp: 0.9, strength: 0, spirit: 1.6, defense: 1.05, speed: 0.45 },
  tank: { hp: 1.2, strength: 0.2, spirit: 0.2, defense: 2, speed: 0.2 },
  hpTank: { hp: 2.2, strength: 0.1, spirit: 0.1, defense: 1.1, speed: 0.2 },
  defense: { hp: 0.55, strength: 0.1, spirit: 0.1, defense: 2.4, speed: 0.25 },
  speed: { hp: 0.2, strength: 0.5, spirit: 0.5, defense: 0.2, speed: 2 },
  support: { hp: 1.05, strength: 0.1, spirit: 0.9, defense: 0.75, speed: 1.45 },
};

export const SCORE_PROFILE_LABELS: Record<ScoreProfileId, string> = {
  balanced: "バランス",
  physical: "物理アタッカー",
  magic: "妖術アタッカー",
  physicalSpeed: "物理速攻",
  magicSpeed: "妖術速攻",
  mixed: "両刀アタッカー",
  physicalBruiser: "物理耐久",
  magicBruiser: "妖術耐久",
  tank: "総合タンク",
  hpTank: "HP耐久",
  defense: "まもり特化",
  speed: "すばやさ特化",
  support: "支援・回復",
};

export const SCORE_PROFILE_DESCRIPTIONS: Record<ScoreProfileId, string> = {
  balanced: "5ステータスを均等に評価します。用途が決まっていない個体の比較向けです。",
  physical: "ちからを最優先し、次にすばやさ、まもりを評価します。",
  magic: "ようりょくを最優先し、次にすばやさ、まもりを評価します。",
  physicalSpeed: "ちからとすばやさを強く評価する、先手物理アタッカー向けです。",
  magicSpeed: "ようりょくとすばやさを強く評価する、先手妖術アタッカー向けです。",
  mixed: "ちから・ようりょくを同程度に評価し、両方の攻撃手段を使う型を想定します。",
  physicalBruiser: "ちからを軸にHP・まもりも重視し、殴り合い性能を評価します。",
  magicBruiser: "ようりょくを軸にHP・まもりも重視し、耐久寄り妖術型を評価します。",
  tank: "まもりを最優先しつつHPも強く評価する、総合的な壁役向けです。",
  hpTank: "HPを最優先し、次にまもりを評価します。最大HPを伸ばしたい型向けです。",
  defense: "まもりへの配分を最優先する、防御特化型向けです。",
  speed: "すばやさを最優先し、攻撃系ステータスを次点で評価します。",
  support: "すばやさ・HPを中心に、ようりょくとまもりも評価する支援・回復役向けです。",
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
