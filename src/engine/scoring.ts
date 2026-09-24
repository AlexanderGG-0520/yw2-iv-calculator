import type { ScoreProfileId, StatBlock } from "./types";

export const SCORE_PROFILE_GROUPS: readonly {
  label: string;
  ids: readonly ScoreProfileId[];
}[] = [
  {
    label: "汎用",
    ids: ["balanced", "speed"],
  },
  {
    label: "攻撃",
    ids: [
      "physical",
      "magic",
      "physicalSpeed",
      "magicSpeed",
      "mixed",
      "physicalBruiser",
      "magicBruiser",
    ],
  },
  {
    label: "耐久",
    ids: ["tank", "hpTank", "defense"],
  },
  {
    label: "支援・妨害",
    ids: [
      "healer",
      "buffer",
      "statDebuffer",
      "statusController",
      "dotDebuffer",
      "purifier",
      "reviver",
      "utility",
      "backlineSupport",
    ],
  },
];

export const SCORE_PROFILE_IDS: readonly ScoreProfileId[] =
  SCORE_PROFILE_GROUPS.flatMap((group) => group.ids);

const MIXED_BALANCE_BONUS_WEIGHT = 0.75;

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

  healer: { hp: 0.9, strength: 0, spirit: 1.8, defense: 0.8, speed: 1.5 },
  buffer: { hp: 1.15, strength: 0.1, spirit: 0.2, defense: 1, speed: 2 },
  statDebuffer: { hp: 1, strength: 0.1, spirit: 0.2, defense: 0.9, speed: 2.1 },
  statusController: { hp: 0.75, strength: 0.05, spirit: 0.15, defense: 0.65, speed: 2.5 },
  dotDebuffer: { hp: 1.05, strength: 0.05, spirit: 0.2, defense: 0.95, speed: 2 },
  purifier: { hp: 1.2, strength: 0, spirit: 0.5, defense: 1, speed: 1.8 },
  reviver: { hp: 1.4, strength: 0, spirit: 1.2, defense: 1.1, speed: 1.3 },
  utility: { hp: 1, strength: 0.25, spirit: 0.65, defense: 0.9, speed: 1.6 },
  backlineSupport: { hp: 1.6, strength: 0.1, spirit: 0.4, defense: 1.5, speed: 0.5 },
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

  healer: "ヒーラー",
  buffer: "良いとりつき・バッファー",
  statDebuffer: "悪いとりつき・能力ダウン",
  statusController: "悪いとりつき・行動阻害",
  dotDebuffer: "悪いとりつき・継続ダメージ",
  purifier: "おはらい・浄化役",
  reviver: "蘇生・立て直し役",
  utility: "汎用サポート",
  backlineSupport: "後衛・置物サポート",
};

export const SCORE_PROFILE_DESCRIPTIONS: Record<ScoreProfileId, string> = {
  balanced: "5ステータスを均等に評価します。用途が決まっていない個体の比較向けです。",
  physical: "ちからを最優先し、次にすばやさ、まもりを評価します。",
  magic: "ようりょくを最優先し、次にすばやさ、まもりを評価します。",
  physicalSpeed: "ちからとすばやさを強く評価する、先手物理アタッカー向けです。",
  magicSpeed: "ようりょくとすばやさを強く評価する、先手妖術アタッカー向けです。",
  mixed: "ちから・ようりょくの両方への投資を評価します。線形加重に加え、両方へ振った共通量にバランスボーナスを与える両刀型向けです。",
  physicalBruiser: "ちからを軸にHP・まもりも重視し、殴り合い性能を評価します。",
  magicBruiser: "ようりょくを軸にHP・まもりも重視し、耐久寄り妖術型を評価します。",
  tank: "まもりを最優先しつつHPも強く評価する、総合的な壁役向けです。",
  hpTank: "HPを最優先し、次にまもりを評価します。最大HPを伸ばしたい型向けです。",
  defense: "まもりへの配分を最優先する、防御特化型向けです。",
  speed: "すばやさを最優先し、攻撃系ステータスを次点で評価します。",

  healer: "ようりょく・すばやさを軸に、HPとまもりも評価します。回復量と行動回数を両立したい役向けです。",
  buffer: "すばやさと耐久を重視します。良いとりつきを早く味方へ通し、その後も場に残る役を想定します。",
  statDebuffer: "すばやさと耐久を重視します。ちから・まもり・ようりょく・すばやさダウン等の悪いとりつきを担当する役向けです。",
  statusController: "すばやさを最優先し、次に最低限の耐久を評価します。混乱・睡眠・行動不能などで先に相手を止める役向けです。",
  dotDebuffer: "すばやさと耐久を重視します。HP継続減少など、悪いとりつきを維持して削る役向けです。",
  purifier: "すばやさ・HP・まもりを重視します。悪いとりつきを解除して味方を立て直す役向けです。",
  reviver: "HP・ようりょく・まもりを厚めにしつつ、すばやさも評価します。蘇生や緊急回復で立て直す役向けです。",
  utility: "すばやさと耐久を中心に、ようりょくも少し評価します。複数の支援行動をこなす汎用役向けです。",
  backlineSupport: "HP・まもりを重視します。後衛スキルや交代前提のサポート役が、前に出た時に倒されにくい配分を評価します。",
};

export const SCORE_PROFILE_CAVEAT =
  "役割評価はIV配分だけを順位付けします。とりつきの種類・成功率、スキル、必殺技、魂・装備、種族陣形そのものの強さはスコアに含みません。";

export function scoreIv(iv: StatBlock, profile: ScoreProfileId): number {
  const weights = PROFILES[profile];
  const linearScore =
    (iv.hp / 2) * weights.hp +
    iv.strength * weights.strength +
    iv.spirit * weights.spirit +
    iv.defense * weights.defense +
    iv.speed * weights.speed;

  if (profile === "mixed") {
    return linearScore + Math.min(iv.strength, iv.spirit) * MIXED_BALANCE_BONUS_WEIGHT;
  }

  return linearScore;
}
