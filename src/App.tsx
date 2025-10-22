import React, { useEffect, useMemo, useState } from 'react';

// --- Types
interface Player {
  id: string;
  name: string;
  elo: number;
}
type Winner = 'A' | 'B';
interface Match {
  id: string;
  dateISO: string; // when the match was recorded
  teamA: string[]; // player ids (5)
  teamB: string[]; // player ids (5)
  winner: Winner;
}

interface LeaderRow {
  playerId: string;
  name: string;
  wins: number;
  losses: number;
  winRate: number; // 0..1
  elo: number;
}

// --- Constants
const STORAGE_KEY = 'lol-leaderboard-matches-v1';

const PLAYERS: Player[] = [
  { id: 'p1', name: 'Aatrox', elo: 1500 },
  { id: 'p2', name: 'Blitz', elo: 1500 },
  { id: 'p3', name: 'Cait', elo: 1500 },
  { id: 'p4', name: 'Diana', elo: 1500 },
  { id: 'p5', name: 'Ekko', elo: 1500 },
  { id: 'p6', name: 'Fiora', elo: 1500 },
  { id: 'p7', name: 'Garen', elo: 1500 },
  { id: 'p8', name: 'Hecarim', elo: 1500 },
  { id: 'p9', name: 'Irelia', elo: 1500 },
  { id: 'p10', name: 'Jinx', elo: 1500 },
];

// --- Utilities
const byId = new Map(PLAYERS.map((p) => [p.id, p] as const));
const nameOf = (id: string) => byId.get(id)?.name ?? id;

function computeLeaderboard(matches: Match[]): LeaderRow[] {
  const map = new Map<string, LeaderRow>();
  for (const p of PLAYERS) {
    map.set(p.id, { playerId: p.id, name: p.name, wins: 0, losses: 0, winRate: 0, elo: p.elo });
  }

  for (const m of matches) {
    const aWin = m.winner === 'A';
    for (const id of m.teamA) {
      const row = map.get(id)!;
      if (aWin) {
        row.wins++;
        row.elo += 100;
      } else row.losses++;
    }
    for (const id of m.teamB) {
      const row = map.get(id)!;
      if (!aWin) {
        row.wins++;
        row.elo -= 100;
      } else row.losses++;
    }
  }

  for (const row of map.values()) {
    const total = row.wins + row.losses;
    row.winRate = total === 0 ? 0 : row.wins / total;
  }

  return Array.from(map.values()).sort((a, b) => {
    // Sort by winRate desc, then wins desc, then losses asc, then name
    if (b.winRate !== a.winRate) return b.winRate - a.winRate;
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (a.losses !== b.losses) return a.losses - b.losses;
    return a.name.localeCompare(b.name);
  });
}

function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

// --- Sample mocked matches (only used on first load if no data yet)
const SAMPLE_MATCHES: Match[] = [
  {
    id: uid('m'),
    dateISO: new Date().toISOString(),
    teamA: ['p1', 'p2', 'p3', 'p4', 'p5'],
    teamB: ['p6', 'p7', 'p8', 'p9', 'p10'],
    winner: 'A',
  },
  {
    id: uid('m'),
    dateISO: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    teamA: ['p1', 'p6', 'p7', 'p9', 'p10'],
    teamB: ['p2', 'p3', 'p4', 'p5', 'p8'],
    winner: 'B',
  },
];

// --- Components
function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span
      className={`
        inline-flex items-center rounded-full bg-white/70 px-2 py-1 text-xs font-medium ring-1 ring-gray-200 ring-inset
        dark:bg-gray-800/50 dark:ring-gray-700
      `}
    >
      {children}
    </span>
  );
}

function Section({
  title,
  children,
  actions,
}: {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section
      className={`
        rounded-2xl border border-gray-100 bg-white p-4 shadow-sm
        md:p-6
        dark:border-gray-800 dark:bg-gray-900
      `}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2
          className={`
            text-lg font-semibold tracking-tight
            md:text-xl
          `}
        >
          {title}
        </h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

function PlayerSelect({
  label,
  value,
  onChange,
  exclude,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
  exclude: Set<string>;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span
        className={`
          text-gray-600
          dark:text-gray-300
        `}
      >
        {label}
      </span>
      <select
        className={`
          rounded-xl border border-gray-200 bg-white p-2
          focus:ring-2 focus:ring-indigo-500 focus:outline-none
          dark:border-gray-700 dark:bg-gray-800
        `}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">— Select player —</option>
        {PLAYERS.filter((p) => !exclude.has(p.id) || p.id === value).map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function App() {
  const [matches, setMatches] = useState<Match[]>([]);

  // Load / persist
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Match[];
        setMatches(parsed);
        return;
      } catch (e) {
        console.warn('Failed to parse stored matches, resetting.');
      }
    }
    // Seed with samples if none
    setMatches(SAMPLE_MATCHES);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(matches));
  }, [matches]);

  // Form state
  const [teamA, setTeamA] = useState<(string | null)[]>([null, null, null, null, null]);
  const [teamB, setTeamB] = useState<(string | null)[]>([null, null, null, null, null]);
  const [winner, setWinner] = useState<Winner | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedIds = useMemo(() => new Set([...teamA, ...teamB].filter(Boolean) as string[]), [teamA, teamB]);

  const leaderboard = useMemo(() => computeLeaderboard(matches), [matches]);

  function updateTeam(which: 'A' | 'B', index: number, value: string | null) {
    const setter = which === 'A' ? setTeamA : setTeamB;
    const arr = (which === 'A' ? teamA : teamB).slice();
    arr[index] = value;
    setter(arr);
  }

  function resetForm() {
    setTeamA([null, null, null, null, null]);
    setTeamB([null, null, null, null, null]);
    setWinner(null);
    setError(null);
  }

  function validate(): string | null {
    const a = teamA.filter(Boolean) as string[];
    const b = teamB.filter(Boolean) as string[];
    if (a.length !== 5 || b.length !== 5) return 'Each team must have 5 players.';
    const set = new Set([...a, ...b]);
    if (set.size !== 10) return 'Players must be unique across both teams.';
    if (!winner) return 'Please select a winner.';
    return null;
  }

  function submitMatch(e: React.FormEvent) {
    e.preventDefault();
    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    const newMatch: Match = {
      id: uid('m'),
      dateISO: new Date().toISOString(),
      teamA: teamA as string[],
      teamB: teamB as string[],
      winner: winner!,
    };
    setMatches((prev) => [newMatch, ...prev]);
    resetForm();
  }

  function removeMatch(id: string) {
    setMatches((prev) => prev.filter((m) => m.id !== id));
  }

  function clearAll() {
    if (confirm('This will delete ALL matches. Continue?')) {
      setMatches([]);
    }
  }

  return (
    <div
      className={`
        min-h-screen bg-gradient-to-b from-gray-50 to-white text-gray-900
        dark:from-gray-950 dark:to-gray-900 dark:text-gray-100
      `}
    >
      <div
        className={`
          mx-auto max-w-6xl p-4
          md:p-8
        `}
      >
        <header
          className={`
            mb-6 flex items-center justify-between gap-4
            md:mb-10
          `}
        >
          <div>
            <h1
              className={`
                text-2xl font-bold tracking-tight
                md:text-3xl
              `}
            >
              LoL Friend Group Leaderboard
            </h1>
            <p
              className={`
                mt-1 text-sm text-gray-600
                dark:text-gray-300
              `}
            >
              Vite + React + TypeScript + Tailwind (client-only, mocked data)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={clearAll}
              className={`
                rounded-xl border border-red-200 px-3 py-2 text-sm
                hover:bg-red-50
                dark:border-red-800 dark:hover:bg-red-900/30
              `}
              title="Clear all matches"
            >
              Reset Data
            </button>
          </div>
        </header>

        {/* Leaderboard */}
        <Section title="Leaderboard">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead
                className={`
                  bg-gray-100
                  dark:bg-gray-800
                `}
              >
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">#</th>
                  <th className="px-3 py-2 text-left font-semibold">Player</th>
                  <th className="px-3 py-2 text-right font-semibold">Elo</th>
                  <th className="px-3 py-2 text-right font-semibold">Wins</th>
                  <th className="px-3 py-2 text-right font-semibold">Losses</th>
                  <th className="px-3 py-2 text-right font-semibold">Win Rate</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((row, i) => (
                  <tr
                    key={row.playerId}
                    className={
                      i % 2
                        ? `
                          bg-white
                          dark:bg-gray-900
                        `
                        : `
                          bg-gray-50
                          dark:bg-gray-950
                        `
                    }
                  >
                    <td className="px-3 py-2">{i + 1}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{row.name}</span>
                        <Pill>{row.wins + row.losses} games</Pill>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">{row.elo}</td>
                    <td className="px-3 py-2 text-right">{row.wins}</td>
                    <td className="px-3 py-2 text-right">{row.losses}</td>
                    <td className="px-3 py-2 text-right">{(row.winRate * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Input form */}
        <div
          className={`
            mt-6 grid gap-6
            md:mt-10 md:grid-cols-2
          `}
        >
          <Section title="Add Match">
            <form onSubmit={submitMatch} className="space-y-4">
              <div
                className={`
                  grid grid-cols-1 gap-4
                  md:grid-cols-2
                `}
              >
                {/* Team A */}
                <div
                  className={`
                    rounded-xl border border-gray-200 p-3
                    dark:border-gray-700
                  `}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-semibold">Team A</h3>
                    <Pill>5 players</Pill>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {teamA.map((v, idx) => (
                      <PlayerSelect
                        key={idx}
                        label={`Player ${idx + 1}`}
                        value={v}
                        onChange={(val) => updateTeam('A', idx, val)}
                        exclude={selectedIds}
                      />
                    ))}
                  </div>
                </div>

                {/* Team B */}
                <div
                  className={`
                    rounded-xl border border-gray-200 p-3
                    dark:border-gray-700
                  `}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-semibold">Team B</h3>
                    <Pill>5 players</Pill>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {teamB.map((v, idx) => (
                      <PlayerSelect
                        key={idx}
                        label={`Player ${idx + 1}`}
                        value={v}
                        onChange={(val) => updateTeam('B', idx, val)}
                        exclude={selectedIds}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Winner */}
              <div className="flex items-center gap-6">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="winner"
                    className="accent-indigo-600"
                    checked={winner === 'A'}
                    onChange={() => setWinner('A')}
                  />
                  <span>Team A Won</span>
                </label>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="winner"
                    className="accent-indigo-600"
                    checked={winner === 'B'}
                    onChange={() => setWinner('B')}
                  />
                  <span>Team B Won</span>
                </label>
              </div>

              {error && (
                <div
                  className={`
                    text-sm text-red-600
                    dark:text-red-400
                  `}
                >
                  {error}
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  className={`
                    rounded-xl bg-indigo-600 px-4 py-2 text-white
                    hover:bg-indigo-700
                    disabled:opacity-50
                  `}
                  disabled={!!validate()}
                >
                  Save Match
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className={`
                    rounded-xl border border-gray-200 px-4 py-2
                    hover:bg-gray-50
                    dark:border-gray-700 dark:hover:bg-gray-800
                  `}
                >
                  Clear
                </button>
              </div>
            </form>
          </Section>

          {/* History */}
          <Section title="Match History" actions={<Pill>{matches.length} total</Pill>}>
            {matches.length === 0 ? (
              <div
                className={`
                  text-sm text-gray-600
                  dark:text-gray-300
                `}
              >
                No matches yet. Add your first one!
              </div>
            ) : (
              <ul className="space-y-3">
                {matches.map((m) => (
                  <li
                    key={m.id}
                    className={`
                      rounded-xl border border-gray-200 p-3
                      dark:border-gray-700
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div
                        className={`
                          text-sm text-gray-600
                          dark:text-gray-300
                        `}
                      >
                        {new Date(m.dateISO).toLocaleString()}
                      </div>
                      <div className="flex items-center gap-2">
                        <Pill>Winner: Team {m.winner}</Pill>
                        <button
                          onClick={() => removeMatch(m.id)}
                          title="Delete match"
                          className={`
                            rounded-lg border border-gray-200 px-2 py-1 text-xs
                            hover:bg-gray-50
                            dark:border-gray-700 dark:hover:bg-gray-800
                          `}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div
                      className={`
                        mt-2 grid grid-cols-1 gap-4 text-sm
                        md:grid-cols-2
                      `}
                    >
                      <div>
                        <div className="mb-1 font-medium">Team A</div>
                        <ul className="list-inside list-disc space-y-0.5">
                          {m.teamA.map((id) => (
                            <li key={id}>{nameOf(id)}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div className="mb-1 font-medium">Team B</div>
                        <ul className="list-inside list-disc space-y-0.5">
                          {m.teamB.map((id) => (
                            <li key={id}>{nameOf(id)}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        {/* Footer */}
        <footer
          className={`
            mt-10 text-xs text-gray-500
            dark:text-gray-400
          `}
        >
          <p>Tip: data is stored locally in your browser (localStorage). Use “Reset Data” to clear.</p>
        </footer>
      </div>
    </div>
  );
}
