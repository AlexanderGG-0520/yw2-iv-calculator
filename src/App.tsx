import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { Copy, Search } from "lucide-react";
import { calculateStats, evWeightedTotal, isValidIvSpread, ivWeightedTotal } from "./engine/calculationEngine";
import { fitnessFromSessions, totalSessions } from "./engine/fitness";
import { SCORE_PROFILE_DESCRIPTIONS, SCORE_PROFILE_IDS, SCORE_PROFILE_LABELS } from "./engine/scoring";
import {
  STAT_KEYS,
  type ReverseResult,
  type ScoreProfileId,
  type SearchResponse,
  type SportsSessions,
  type StatBlock,
  type StatKey,
} from "./engine/types";
import { getYokaiSpecies, YOKAI } from "./engine/yokaiData";

const statLabel: Record<StatKey, string> = {
  hp: "HP",
  strength: "ちから",
  spirit: "ようりょく",
  defense: "まもり",
  speed: "すばやさ",
};

const zeroBlock = (): StatBlock => ({ hp: 0, strength: 0, spirit: 0, defense: 0, speed: 0 });
const balancedIv = (): StatBlock => ({ hp: 16, strength: 8, spirit: 8, defense: 8, speed: 8 });
const zeroSessions = (): SportsSessions => ({ strength: 0, spirit: 0, defense: 0, speed: 0 });

type WorkerResponse =
  | { ok: true; response: SearchResponse }
  | { ok: false; error: string };

function App() {
  const defaultSpeciesId = YOKAI.find((entry) => entry.name === "ジバニャン")?.id ?? YOKAI[0]?.id ?? "";
  const [speciesId, setSpeciesId] = useState(defaultSpeciesId);
  const [level, setLevel] = useState(99);
  const [observed, setObserved] = useState<StatBlock>(zeroBlock);
  const [ev, setEv] = useState<StatBlock>(zeroBlock);
  const [sessions, setSessions] = useState<SportsSessions>(zeroSessions);
  const [equipment, setEquipment] = useState<StatBlock>(zeroBlock);
  const [scoreProfile, setScoreProfile] = useState<ScoreProfileId>("balanced");
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");

  const [forwardSpeciesId, setForwardSpeciesId] = useState(defaultSpeciesId);
  const [forwardLevel, setForwardLevel] = useState(99);
  const [forwardIv, setForwardIv] = useState<StatBlock>(balancedIv);
  const [forwardEv, setForwardEv] = useState<StatBlock>(zeroBlock);
  const [forwardSessions, setForwardSessions] = useState<SportsSessions>(zeroSessions);
  const [forwardEquipment, setForwardEquipment] = useState<StatBlock>(zeroBlock);

  const filteredYokai = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return YOKAI;
    return YOKAI.filter((entry) =>
      entry.name.toLowerCase().includes(q) ||
      entry.id.toLowerCase().includes(q) ||
      String(entry.number).includes(q),
    );
  }, [filter]);

  const forwardStats = useMemo(() => {
    if (!forwardSpeciesId) return zeroBlock();
    return calculateStats(
      getYokaiSpecies(forwardSpeciesId),
      forwardLevel,
      forwardIv,
      forwardEv,
      fitnessFromSessions(forwardSessions),
      forwardEquipment,
    );
  }, [forwardSpeciesId, forwardLevel, forwardIv, forwardEv, forwardSessions, forwardEquipment]);

  const updateBlock = (
    setter: Dispatch<SetStateAction<StatBlock>>,
    stat: StatKey,
    value: number,
  ) => setter((current) => ({ ...current, [stat]: value }));

  const runSearch = () => {
    setError("");
    setResponse(null);

    if (!speciesId) {
      setError("妖怪を選択してください。");
      return;
    }
    if (!Number.isInteger(level) || level < 1 || level > 99) {
      setError("レベルは1〜99で入力してください。");
      return;
    }
    if (STAT_KEYS.some((stat) => !Number.isInteger(observed[stat]) || observed[stat] < 1)) {
      setError("実機ステータスは5項目すべて1以上の整数で入力してください。");
      return;
    }
    if (STAT_KEYS.some((stat) => !Number.isInteger(ev[stat]) || ev[stat] < 0)) {
      setError("性格EVは0以上の整数で入力してください。");
      return;
    }
    if (evWeightedTotal(ev) > 20) {
      setError("性格EVの加重合計が20を超えています。HPは2で割って数えます。");
      return;
    }
    if (Object.values(sessions).some((value) => !Number.isInteger(value) || value < 0 || value > 5)) {
      setError("スポーツクラブ回数は各項目0〜5の整数で入力してください。");
      return;
    }
    if (totalSessions(sessions) > 5) {
      setError("スポーツクラブは4種合計で5回までです。");
      return;
    }
    if (STAT_KEYS.some((stat) => !Number.isInteger(equipment[stat]))) {
      setError("装備補正は整数で入力してください。");
      return;
    }

    setWorking(true);
    const worker = new Worker(new URL("./workers/reverseSearch.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      if (event.data.ok) {
        setResponse(event.data.response);
      } else {
        setError(event.data.error);
      }
      setWorking(false);
      worker.terminate();
    };
    worker.onerror = (event) => {
      setError(event.message || "逆算ワーカーでエラーが発生しました。");
      setWorking(false);
      worker.terminate();
    };
    worker.postMessage({
      speciesId,
      level,
      observed,
      ev,
      sessions,
      equipment,
      scoreProfile,
      maxResults: 200,
    });
  };

  const copyResult = async (result: ReverseResult) => {
    const text = [
      "妖怪ウォッチ2 個体値候補",
      ...STAT_KEYS.map((stat) => statLabel[stat] + ": " + result.iv[stat]),
      "加重合計: " + ivWeightedTotal(result.iv),
      "スコア: " + result.score.toFixed(1),
    ].join("\n");
    await navigator.clipboard.writeText(text);
  };

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Yo-kai Watch 2 IV Reverse Calculator</p>
          <h1>妖怪ウォッチ2 個体値逆算</h1>
          <p>
            実機ステータスから、YW2の加重40ポイント制約を満たす個体値候補を逆算します。
            HP個体値は2で割って1ポイントとして扱います。
          </p>
        </div>
        <div className="status-badge">Built-in data: {YOKAI.length} entries</div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <h2>逆算</h2>
          <button className="primary-action" type="button" onClick={runSearch} disabled={working}>
            <Search size={18} aria-hidden="true" />
            {working ? "探索中..." : "逆算"}
          </button>
        </div>

        <p className="warning">
          装備・魂の補正は外して測るのが最も安全です。外せない場合だけ「装備補正」に最終加算値を入力してください。
        </p>

        <section className="controls" aria-label="基本設定">
          <label>
            妖怪検索
            <input
              type="search"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="名前 / 番号"
            />
          </label>
          <label className="wide-field">
            妖怪
            <select value={speciesId} onChange={(event) => setSpeciesId(event.target.value)}>
              {filteredYokai.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.number}. {entry.name}
                </option>
              ))}
            </select>
          </label>
          <NumberInput label="レベル" value={level} min={1} max={99} onChange={setLevel} />
          <label>
            評価
            <select value={scoreProfile} onChange={(event) => setScoreProfile(event.target.value as ScoreProfileId)}>
              {SCORE_PROFILE_IDS.map((id) => (
                <option key={id} value={id}>{SCORE_PROFILE_LABELS[id]}</option>
              ))}
            </select>
          </label>
        </section>

        <p className="score-profile-info">
          <strong>{SCORE_PROFILE_LABELS[scoreProfile]}</strong>
          <span>{SCORE_PROFILE_DESCRIPTIONS[scoreProfile]}</span>
        </p>

        <StatInputs
          title="実機ステータス"
          values={observed}
          min={1}
          onChange={(stat, value) => updateBlock(setObserved, stat, value)}
        />

        <StatInputs
          title={"性格EV（加重合計 " + evWeightedTotal(ev) + " / 20）"}
          values={ev}
          min={0}
          onChange={(stat, value) => updateBlock(setEv, stat, value)}
        />
        <p className="muted">
          現在の性格そのものではなく、これまでに蓄積した性格育成値です。性格変更は過去に獲得したEVを移動しません。
        </p>

        <SportsInputs values={sessions} onChange={setSessions} />
        <StatBlockLine label="スポーツ補正" values={fitnessFromSessions(sessions)} />

        <StatInputs
          title="装備補正"
          values={equipment}
          onChange={(stat, value) => updateBlock(setEquipment, stat, value)}
        />

        {error ? <p className="error">{error}</p> : null}
      </section>

      {response ? (
        <section className="summary" aria-label="検索サマリー">
          <span>成立候補: {response.summary.validCandidateCount.toLocaleString()}</span>
          <span>確認数: {response.summary.combinationsVisited.toLocaleString()}</span>
          <span>{response.summary.truncated ? "安全上限で停止" : "検索完了"}</span>
          {STAT_KEYS.map((stat) => (
            <span key={stat}>{statLabel[stat]}候補: {response.summary.perStatCandidateCounts[stat]}</span>
          ))}
        </section>
      ) : null}

      <section className="panel">
        <div className="section-heading">
          <h2>候補</h2>
          <span className="muted">HP/2 + ちから + ようりょく + まもり + すばやさ = 40</span>
        </div>
        <ResultCards results={response?.results ?? []} onCopy={copyResult} />
      </section>

      <section className="panel" aria-label="順計算">
        <div className="section-heading">
          <h2>順計算</h2>
          <span className={isValidIvSpread(forwardIv) ? "status-good" : "warning"}>
            IV加重合計: {ivWeightedTotal(forwardIv)} / 40
          </span>
        </div>

        <section className="controls">
          <label className="wide-field">
            妖怪
            <select value={forwardSpeciesId} onChange={(event) => setForwardSpeciesId(event.target.value)}>
              {YOKAI.map((entry) => (
                <option key={entry.id} value={entry.id}>{entry.number}. {entry.name}</option>
              ))}
            </select>
          </label>
          <NumberInput label="レベル" value={forwardLevel} min={1} max={99} onChange={setForwardLevel} />
        </section>

        <StatInputs title="個体値" values={forwardIv} min={0} onChange={(stat, value) => updateBlock(setForwardIv, stat, value)} />
        <StatInputs
          title={"性格EV（加重合計 " + evWeightedTotal(forwardEv) + " / 20）"}
          values={forwardEv}
          min={0}
          onChange={(stat, value) => updateBlock(setForwardEv, stat, value)}
        />
        <SportsInputs values={forwardSessions} onChange={setForwardSessions} />
        <StatInputs title="装備補正" values={forwardEquipment} onChange={(stat, value) => updateBlock(setForwardEquipment, stat, value)} />

        <div className="forward-output">
          <h3>計算結果</h3>
          <div className="result-stats">
            {STAT_KEYS.map((stat) => (
              <div key={stat}>
                <span>{statLabel[stat]}</span>
                <strong>{forwardStats[stat]}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="footer-note">
        非公式ファンツールです。株式会社レベルファイブ、任天堂株式会社ほか権利者との提携・承認関係はありません。
      </footer>
    </main>
  );
}

function NumberInput({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label>
      {label}
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function StatInputs({
  title,
  values,
  min,
  onChange,
}: {
  title: string;
  values: StatBlock;
  min?: number;
  onChange: (stat: StatKey, value: number) => void;
}) {
  return (
    <section>
      <h3>{title}</h3>
      <div className="stat-grid">
        {STAT_KEYS.map((stat) => (
          <NumberInput
            key={stat}
            label={statLabel[stat]}
            value={values[stat]}
            min={min}
            onChange={(value) => onChange(stat, value)}
          />
        ))}
      </div>
    </section>
  );
}

function SportsInputs({
  values,
  onChange,
}: {
  values: SportsSessions;
  onChange: Dispatch<SetStateAction<SportsSessions>>;
}) {
  const entries = [
    ["strength", "ちから"],
    ["spirit", "ようりょく"],
    ["defense", "まもり"],
    ["speed", "すばやさ"],
  ] as const;

  return (
    <section>
      <h3>スポーツクラブ（合計 {totalSessions(values)} / 5回）</h3>
      <div className="stat-grid sports-grid">
        {entries.map(([key, label]) => (
          <NumberInput
            key={key}
            label={label}
            value={values[key]}
            min={0}
            max={5}
            onChange={(value) => onChange((current) => ({ ...current, [key]: value }))}
          />
        ))}
      </div>
    </section>
  );
}

function StatBlockLine({ label, values }: { label: string; values: StatBlock }) {
  return (
    <div className="block-line">
      <strong>{label}</strong>
      <span>{STAT_KEYS.map((stat) => statLabel[stat] + " " + values[stat]).join(" / ")}</span>
    </div>
  );
}

function ResultCards({
  results,
  onCopy,
}: {
  results: ReverseResult[];
  onCopy: (result: ReverseResult) => void;
}) {
  if (results.length === 0) return <p className="empty-state">候補はまだありません。</p>;

  return (
    <div className="result-cards">
      {results.map((result) => (
        <article className="result-card" key={result.id}>
          <div className="card-head">
            <div>
              <span className="muted">評価スコア</span>
              <strong>{result.score.toFixed(1)}</strong>
            </div>
            <button type="button" onClick={() => onCopy(result)}>
              <Copy size={16} aria-hidden="true" />
              コピー
            </button>
          </div>
          <StatBlockLine label="個体値" values={result.iv} />
          <StatBlockLine label="計算結果" values={result.calculated} />
          <div className="block-line">
            <strong>加重合計</strong>
            <span>{ivWeightedTotal(result.iv)} / 40</span>
          </div>
        </article>
      ))}
    </div>
  );
}

export default App;
