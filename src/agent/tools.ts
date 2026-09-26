import { calculateStats, evWeightedTotal, isValidIvSpread } from "../engine/calculationEngine";
import { fitnessFromSessions, totalSessions } from "../engine/fitness";
import {
  SCORE_PROFILE_DESCRIPTIONS,
  SCORE_PROFILE_GROUPS,
  SCORE_PROFILE_IDS,
  SCORE_PROFILE_LABELS,
} from "../engine/scoring";
import { reverseSearch } from "../engine/reverseSearch";
import {
  STAT_KEYS,
  type ScoreProfileId,
  type SearchInput,
  type SearchResponse,
  type SportsSessions,
  type StatBlock,
  type StatKey,
  type YokaiSpecies,
} from "../engine/types";
import { YOKAI } from "../engine/yokaiData";

export const WEBMCP_REVERSE_RESULT_EVENT = "yw2:webmcp:reverse-result";
export const WEBMCP_FORWARD_RESULT_EVENT = "yw2:webmcp:forward-result";

const ZERO_BLOCK: StatBlock = { hp: 0, strength: 0, spirit: 0, defense: 0, speed: 0 };
const ZERO_SESSIONS: SportsSessions = { strength: 0, spirit: 0, defense: 0, speed: 0 };

type JsonSchema = Record<string, unknown>;

export interface AgentToolDefinition {
  name: string;
  description: string;
  inputSchema: JsonSchema;
}

export interface ForwardToolResult {
  species: Pick<YokaiSpecies, "id" | "number" | "name">;
  input: {
    speciesId: string;
    level: number;
    iv: StatBlock;
    ev: StatBlock;
    sessions: SportsSessions;
    equipment: StatBlock;
  };
  stats: StatBlock;
}

export interface ReverseToolResult {
  species: Pick<YokaiSpecies, "id" | "number" | "name">;
  input: SearchInput;
  response: SearchResponse;
}

const statBlockSchema = (description: string, minimum?: number): JsonSchema => ({
  type: "object",
  description,
  properties: Object.fromEntries(
    STAT_KEYS.map((stat) => [
      stat,
      {
        type: "integer",
        ...(minimum === undefined ? {} : { minimum }),
      },
    ]),
  ),
  required: [...STAT_KEYS],
  additionalProperties: false,
});

const optionalStatBlockSchema = (description: string, minimum?: number): JsonSchema => ({
  ...statBlockSchema(description, minimum),
  default: { ...ZERO_BLOCK },
});

const sportsSchema: JsonSchema = {
  type: "object",
  description: "スポーツクラブの各トレーニング回数。4種合計5回まで。",
  properties: {
    strength: { type: "integer", minimum: 0, maximum: 5 },
    spirit: { type: "integer", minimum: 0, maximum: 5 },
    defense: { type: "integer", minimum: 0, maximum: 5 },
    speed: { type: "integer", minimum: 0, maximum: 5 },
  },
  required: ["strength", "spirit", "defense", "speed"],
  additionalProperties: false,
  default: { ...ZERO_SESSIONS },
};

export const AGENT_TOOL_DEFINITIONS: readonly AgentToolDefinition[] = [
  {
    name: "yw2_search_yokai",
    description:
      "妖怪ウォッチ2の内蔵データから妖怪を名前・番号・species IDで検索します。計算前にspeciesを特定したい時に使います。",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "妖怪名、図鑑番号、またはspecies ID。空文字なら先頭から返します。",
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 50,
          default: 20,
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "yw2_list_score_profiles",
    description:
      "個体値候補の順位付けに使える評価プロファイル一覧を返します。攻撃・耐久・回復・良いとりつき・悪いとりつき等の役割を含みます。",
    inputSchema: {
      type: "object",
      additionalProperties: false,
    },
  },
  {
    name: "yw2_calculate_stats",
    description:
      "妖怪ウォッチ2の妖怪・レベル・IV・性格EV・スポーツクラブ・装備補正から実機表示ステータスを順計算します。WebMCP経由では画面の順計算欄にも反映します。",
    inputSchema: {
      type: "object",
      properties: {
        species: {
          type: "string",
          description: "species ID、正確な妖怪名、または図鑑番号。",
        },
        level: { type: "integer", minimum: 1, maximum: 99 },
        iv: statBlockSchema(
          "個体値。HPは0〜80の偶数、その他は0〜40。HP/2 + ちから + ようりょく + まもり + すばやさ = 40。",
          0,
        ),
        ev: optionalStatBlockSchema(
          "性格EV。HP/2を含む加重合計20以下。省略時は全て0。",
          0,
        ),
        sessions: sportsSchema,
        equipment: optionalStatBlockSchema(
          "装備・魂などの最終加算補正。省略時は全て0。",
        ),
      },
      required: ["species", "level", "iv"],
      additionalProperties: false,
    },
  },
  {
    name: "yw2_reverse_search",
    description:
      "妖怪ウォッチ2の実機表示ステータスから成立するIV候補を逆算し、指定した役割評価で順位付けします。WebMCP経由では入力と候補を画面にも反映します。",
    inputSchema: {
      type: "object",
      properties: {
        species: {
          type: "string",
          description: "species ID、正確な妖怪名、または図鑑番号。",
        },
        level: { type: "integer", minimum: 1, maximum: 99 },
        observed: statBlockSchema("実機で確認した5ステータス。全て1以上の整数。", 1),
        ev: optionalStatBlockSchema(
          "蓄積済み性格EV。HP/2を含む加重合計20以下。省略時は全て0。",
          0,
        ),
        sessions: sportsSchema,
        equipment: optionalStatBlockSchema(
          "装備・魂などの最終加算補正。省略時は全て0。",
        ),
        scoreProfile: {
          type: "string",
          enum: [...SCORE_PROFILE_IDS],
          default: "balanced",
          description: "候補の順位付けに使う評価プロファイル。",
        },
        maxResults: {
          type: "integer",
          minimum: 1,
          maximum: 100,
          default: 20,
        },
      },
      required: ["species", "level", "observed"],
      additionalProperties: false,
    },
  },
] as const;

function assertRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(label + " はオブジェクトで指定してください。");
  }
  return value as Record<string, unknown>;
}

function integer(
  value: unknown,
  label: string,
  minimum?: number,
  maximum?: number,
): number {
  if (!Number.isInteger(value)) {
    throw new Error(label + " は整数で指定してください。");
  }
  const number = value as number;
  if (minimum !== undefined && number < minimum) {
    throw new Error(label + " は " + minimum + " 以上で指定してください。");
  }
  if (maximum !== undefined && number > maximum) {
    throw new Error(label + " は " + maximum + " 以下で指定してください。");
  }
  return number;
}

function parseStatBlock(
  value: unknown,
  label: string,
  options: { minimum?: number; optional?: boolean } = {},
): StatBlock {
  if (value === undefined && options.optional) return { ...ZERO_BLOCK };

  const record = assertRecord(value, label);
  return Object.fromEntries(
    STAT_KEYS.map((stat) => [
      stat,
      integer(record[stat], label + "." + stat, options.minimum),
    ]),
  ) as StatBlock;
}

function parseSessions(value: unknown): SportsSessions {
  if (value === undefined) return { ...ZERO_SESSIONS };

  const record = assertRecord(value, "sessions");
  const sessions: SportsSessions = {
    strength: integer(record.strength, "sessions.strength", 0, 5),
    spirit: integer(record.spirit, "sessions.spirit", 0, 5),
    defense: integer(record.defense, "sessions.defense", 0, 5),
    speed: integer(record.speed, "sessions.speed", 0, 5),
  };

  if (totalSessions(sessions) > 5) {
    throw new Error("スポーツクラブは4種合計で5回までです。");
  }
  return sessions;
}

function parseEquipment(value: unknown): StatBlock {
  return parseStatBlock(value, "equipment", { optional: true });
}

function parseEv(value: unknown): StatBlock {
  const ev = parseStatBlock(value, "ev", { minimum: 0, optional: true });
  if (evWeightedTotal(ev) > 20) {
    throw new Error("性格EVの加重合計が20を超えています。HPは2で割って数えます。");
  }
  return ev;
}

function resolveSpecies(value: unknown): YokaiSpecies {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("species は妖怪名・図鑑番号・species IDのいずれかで指定してください。");
  }

  const query = value.trim();
  const lower = query.toLowerCase();

  const exact = YOKAI.find(
    (entry) =>
      entry.id.toLowerCase() === lower ||
      entry.name.toLowerCase() === lower ||
      String(entry.number) === query,
  );
  if (exact) return exact;

  const matches = YOKAI.filter(
    (entry) =>
      entry.id.toLowerCase().includes(lower) ||
      entry.name.toLowerCase().includes(lower) ||
      String(entry.number).includes(query),
  );

  if (matches.length === 1) return matches[0];
  if (matches.length === 0) {
    throw new Error("該当する妖怪が見つかりません: " + query);
  }

  throw new Error(
    "species が複数の妖怪に一致します。yw2_search_yokaiで絞り込んでください: " +
      matches
        .slice(0, 8)
        .map((entry) => entry.number + ". " + entry.name + " (" + entry.id + ")")
        .join(", "),
  );
}

function speciesSummary(species: YokaiSpecies): Pick<YokaiSpecies, "id" | "number" | "name"> {
  return { id: species.id, number: species.number, name: species.name };
}

function parseScoreProfile(value: unknown): ScoreProfileId {
  if (value === undefined) return "balanced";
  if (typeof value !== "string" || !SCORE_PROFILE_IDS.includes(value as ScoreProfileId)) {
    throw new Error(
      "scoreProfile は次のいずれかを指定してください: " + SCORE_PROFILE_IDS.join(", "),
    );
  }
  return value as ScoreProfileId;
}

export function searchYokai(args: unknown): {
  query: string;
  count: number;
  results: Array<Pick<YokaiSpecies, "id" | "number" | "name" | "baseA" | "baseB">>;
} {
  const record = assertRecord(args, "arguments");
  const query = typeof record.query === "string" ? record.query.trim() : "";
  const limit = record.limit === undefined ? 20 : integer(record.limit, "limit", 1, 50);
  const lower = query.toLowerCase();

  const matches = YOKAI.filter(
    (entry) =>
      !query ||
      entry.id.toLowerCase().includes(lower) ||
      entry.name.toLowerCase().includes(lower) ||
      String(entry.number).includes(query),
  ).slice(0, limit);

  return {
    query,
    count: matches.length,
    results: matches.map((entry) => ({
      id: entry.id,
      number: entry.number,
      name: entry.name,
      baseA: entry.baseA,
      baseB: entry.baseB,
    })),
  };
}

export function listScoreProfiles(): {
  caveat: string;
  groups: Array<{
    label: string;
    profiles: Array<{ id: ScoreProfileId; label: string; description: string }>;
  }>;
} {
  return {
    caveat:
      "評価はIV配分だけを順位付けします。とりつきの種類・成功率、スキル、必殺技、魂・装備、種族陣形そのものの強さは別要素です。",
    groups: SCORE_PROFILE_GROUPS.map((group) => ({
      label: group.label,
      profiles: group.ids.map((id) => ({
        id,
        label: SCORE_PROFILE_LABELS[id],
        description: SCORE_PROFILE_DESCRIPTIONS[id],
      })),
    })),
  };
}

export function calculateStatsForAgent(args: unknown): ForwardToolResult {
  const record = assertRecord(args, "arguments");
  const species = resolveSpecies(record.species);
  const level = integer(record.level, "level", 1, 99);
  const iv = parseStatBlock(record.iv, "iv", { minimum: 0 });
  const ev = parseEv(record.ev);
  const sessions = parseSessions(record.sessions);
  const equipment = parseEquipment(record.equipment);

  if (!isValidIvSpread(iv)) {
    throw new Error(
      "IVはHPが0〜80の偶数、その他が0〜40で、HP/2 + ちから + ようりょく + まもり + すばやさ = 40を満たす必要があります。",
    );
  }

  const stats = calculateStats(
    species,
    level,
    iv,
    ev,
    fitnessFromSessions(sessions),
    equipment,
  );

  return {
    species: speciesSummary(species),
    input: {
      speciesId: species.id,
      level,
      iv,
      ev,
      sessions,
      equipment,
    },
    stats,
  };
}

export function reverseSearchForAgent(args: unknown): ReverseToolResult {
  const record = assertRecord(args, "arguments");
  const species = resolveSpecies(record.species);
  const level = integer(record.level, "level", 1, 99);
  const observed = parseStatBlock(record.observed, "observed", { minimum: 1 });
  const ev = parseEv(record.ev);
  const sessions = parseSessions(record.sessions);
  const equipment = parseEquipment(record.equipment);
  const scoreProfile = parseScoreProfile(record.scoreProfile);
  const maxResults =
    record.maxResults === undefined ? 20 : integer(record.maxResults, "maxResults", 1, 100);

  const input: SearchInput = {
    speciesId: species.id,
    level,
    observed,
    ev,
    sessions,
    equipment,
    scoreProfile,
    maxResults,
  };

  return {
    species: speciesSummary(species),
    input,
    response: reverseSearch(input),
  };
}

export function executeAgentTool(name: string, args: unknown): unknown {
  switch (name) {
    case "yw2_search_yokai":
      return searchYokai(args);
    case "yw2_list_score_profiles":
      return listScoreProfiles();
    case "yw2_calculate_stats":
      return calculateStatsForAgent(args);
    case "yw2_reverse_search":
      return reverseSearchForAgent(args);
    default:
      throw new Error("Unknown tool: " + name);
  }
}

export function isKnownAgentTool(name: string): boolean {
  return AGENT_TOOL_DEFINITIONS.some((tool) => tool.name === name);
}
