import { STAT_KEYS, type StatBlock, type StatKey, type YokaiSpecies } from "./types";

const INV_98_F32 = 0.0102040814235806465;
const INV_198_F32 = 0.005050505045801401;

const f32 = Math.fround;

export function calculateStat(input: {
  species: YokaiSpecies;
  stat: StatKey;
  level: number;
  iv: number;
  ev: number;
  fitness: number;
  equipment: number;
}): number {
  const { species, stat, level, iv, ev, fitness, equipment } = input;
  const baseA = species.baseA[stat];
  const baseB = species.baseB[stat];

  const delta = f32(iv + baseB - baseA);
  const scaledDelta = f32(delta * INV_98_F32);
  const growthProduct = f32(scaledDelta * f32(level - 1));
  const growth = f32(f32(baseA) + growthProduct);

  const trainingScaleProduct = f32(f32(level) * INV_198_F32);
  const trainingScale = f32(f32(1) + trainingScaleProduct);
  const trainingProduct = f32(f32(ev) * trainingScale);
  const withTraining = f32(growth + trainingProduct);
  const withFitness = f32(withTraining + f32(fitness));

  const raw = Math.max(1, Math.min(999, Math.trunc(withFitness)));
  return Math.max(1, raw + equipment);
}

export function calculateStats(
  species: YokaiSpecies,
  level: number,
  iv: StatBlock,
  ev: StatBlock,
  fitness: StatBlock,
  equipment: StatBlock,
): StatBlock {
  return Object.fromEntries(
    STAT_KEYS.map((stat) => [
      stat,
      calculateStat({
        species,
        stat,
        level,
        iv: iv[stat],
        ev: ev[stat],
        fitness: fitness[stat],
        equipment: equipment[stat],
      }),
    ]),
  ) as StatBlock;
}

export function ivWeightedTotal(iv: StatBlock): number {
  return iv.hp / 2 + iv.strength + iv.spirit + iv.defense + iv.speed;
}

export function evWeightedTotal(ev: StatBlock): number {
  return ev.hp / 2 + ev.strength + ev.spirit + ev.defense + ev.speed;
}

export function isValidIvValue(stat: StatKey, value: number): boolean {
  if (!Number.isInteger(value) || value < 0) return false;
  if (stat === "hp") return value <= 80 && value % 2 === 0;
  return value <= 40;
}

export function isValidIvSpread(iv: StatBlock): boolean {
  return STAT_KEYS.every((stat) => isValidIvValue(stat, iv[stat])) && ivWeightedTotal(iv) === 40;
}
