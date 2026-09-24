import { GENERATED_YOKAI } from "./yokaiData.generated";
import type { YokaiSpecies } from "./types";

export const YOKAI: readonly YokaiSpecies[] = [...GENERATED_YOKAI].sort((a, b) => a.number - b.number);

export function getYokaiSpecies(id: string): YokaiSpecies {
  const species = YOKAI.find((entry) => entry.id === id);
  if (!species) throw new Error("Unknown Yo-kai species: " + id);
  return species;
}
