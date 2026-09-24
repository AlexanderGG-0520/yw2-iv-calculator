import type { SportsSessions, StatBlock } from "./types";

export function totalSessions(sessions: SportsSessions): number {
  return sessions.strength + sessions.spirit + sessions.defense + sessions.speed;
}

export function fitnessFromSessions(sessions: SportsSessions): StatBlock {
  return {
    hp: 0,
    strength: 5 * sessions.strength,
    spirit: 5 * sessions.spirit,
    defense: 5 * sessions.defense - 2 * sessions.strength - 2 * sessions.speed,
    speed: 5 * sessions.speed - 2 * sessions.spirit - 2 * sessions.defense,
  };
}
