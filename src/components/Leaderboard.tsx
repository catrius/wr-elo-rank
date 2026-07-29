import { useState, useMemo, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { orderBy } from 'es-toolkit';
import { Link } from 'react-router-dom';
import type { Player, Match } from '@/types/common.ts';
import type { Streak } from '@/utils/streaks.ts';
import { getWeekWindow, type PlayerWeekStats } from '@/utils/weeklyStats.ts';
import Section from '@/components/Section.tsx';
import Avatar from '@/components/Avatar.tsx';
import { useDisplayName } from '@/contexts/DisplayNameContext.tsx';

function DecayIndicator() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const tooltipVisible = open ? 'opacity-100' : 'opacity-0 group-hover:opacity-100';

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (open && ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <span ref={ref} className="group relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`
          cursor-default text-base font-bold text-orange-500
          dark:text-orange-400
        `}
      >
        ↓
      </button>
      <span
        className={`
          pointer-events-none absolute right-0 bottom-full z-10 mb-1.5 w-44 rounded-md bg-gray-800 px-2.5 py-1.5
          text-left text-xs text-white shadow-lg transition-opacity
          dark:bg-gray-700
          ${tooltipVisible}
        `}
      >
        Elo decaying · inactive for 2+ weeks (-10 per week)
      </span>
    </span>
  );
}

const INITIAL_ELO = 1500;

// Most-recent-5 W/L results per player, drawn from the given (already date-desc) match list.
function buildLast5(matches: Match[], players: Player[]): Map<number, ('W' | 'L')[]> {
  const map = new Map<number, ('W' | 'L')[]>();
  const completed = matches.filter((m) => m.result === 'A' || m.result === 'B');
  players.forEach((p) => {
    const last5: ('W' | 'L')[] = [];
    completed.some((m) => {
      const inA = m.team_a_players.includes(p.id);
      const inB = m.team_b_players.includes(p.id);
      if (inA || inB) {
        last5.push((m.result === 'A' && inA) || (m.result === 'B' && inB) ? 'W' : 'L');
      }
      return last5.length >= 5;
    });
    map.set(p.id, last5.reverse());
  });
  return map;
}

type SortKey = 'name' | 'elo' | 'win' | 'losses' | 'total' | 'winrate';
type WeeklySortKey = 'name' | 'eloDelta' | 'wins' | 'losses' | 'total' | 'winrate';
type TabType = 'season' | 'weekly';

function SortIndicator({ sortKey, current }: { sortKey: string; current: { key: string; dir: 'asc' | 'desc' } }) {
  // Only the actively-sorted column shows an arrow; inactive columns stay clean.
  if (current.key !== sortKey) return null;
  return current.dir === 'asc' ? <>&#9650;</> : <>&#9660;</>;
}

const LAST5_KEYS = ['k0', 'k1', 'k2', 'k3', 'k4'] as const;

function Last5({ results }: { results: ('W' | 'L')[] }) {
  return (
    <div className="flex items-center justify-end gap-0.5">
      {results.map((r, i) =>
        r === 'W' ? (
          <span
            key={LAST5_KEYS[i]}
            className={`
              flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-[10px] font-bold text-white
            `}
          >
            ✓
          </span>
        ) : (
          <span
            key={LAST5_KEYS[i]}
            className={`
              flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white
            `}
          >
            ✕
          </span>
        ),
      )}
    </div>
  );
}

function EloDeltaCell({ delta }: { delta: number }) {
  if (delta > 0)
    return (
      <span
        className={`
          font-semibold text-green-600
          dark:text-green-400
        `}
      >
        +{delta}
      </span>
    );
  if (delta < 0)
    return (
      <span
        className={`
          font-semibold text-red-500
          dark:text-red-400
        `}
      >
        {delta}
      </span>
    );
  return <span className="text-gray-400">±0</span>;
}

// Olympic-style crown colors for the top three ranks: gold, silver, bronze
const MEDAL_COLORS: Record<number, string> = {
  1: 'text-yellow-400',
  2: 'text-slate-400',
  3: 'text-amber-700',
};

function CrownIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M3 5 L7.5 10 L12 4 L16.5 10 L21 5 L19.5 17.5 L4.5 17.5 Z" />
      <circle cx="3" cy="5" r="1.2" />
      <circle cx="12" cy="4" r="1.2" />
      <circle cx="21" cy="5" r="1.2" />
      <rect x="4" y="18.5" width="16" height="2.6" rx="1" />
    </svg>
  );
}

function RankBadge({ rank }: { rank: number | null }) {
  if (rank === null) return <span className="text-gray-400">—</span>;
  const color = MEDAL_COLORS[rank];
  if (!color) return <>{rank}</>;
  return (
    <span title={`Rank ${rank}`} className="relative inline-flex h-6 w-6 items-center justify-center">
      <CrownIcon
        className={`
          h-6 w-6 drop-shadow-sm
          ${color}
        `}
      />
      <span
        className={`
          absolute inset-0 flex items-center justify-center pt-1 text-[10px] leading-none font-bold text-white
          [text-shadow:0_1px_2px_rgba(0,0,0,0.7)]
        `}
      >
        {rank}
      </span>
    </span>
  );
}

// Shared row for both the Season and Weekly tables. Only the second column (`eloCell`) differs
// between tabs: Season passes an absolute Elo, Weekly passes a colored Elo delta.
function StatRow({
  player,
  rank,
  eloCell,
  wins,
  losses,
  total,
  linkToPlayer,
  displayName,
  streaks,
  matches = undefined,
  last5,
}: {
  player: Player;
  rank: number | null;
  eloCell: ReactNode;
  wins: number;
  losses: number;
  total: number;
  linkToPlayer: boolean;
  displayName: (p: Player) => string;
  streaks: Record<number, Streak>;
  matches?: Match[];
  last5: ('W' | 'L')[];
}) {
  return (
    <tr
      className={`
        group border-b border-gray-100 transition-colors
        hover:bg-gray-50
        dark:border-gray-800 dark:hover:bg-gray-800/40
      `}
    >
      <td
        className={`
          sticky left-0 z-10 max-w-[12rem] bg-white px-2 py-3 text-sm font-medium
          group-hover:bg-gray-50
          dark:bg-gray-900 dark:group-hover:bg-gray-800/40
        `}
      >
        <div className="flex items-center gap-2">
          <span className="flex w-6 shrink-0 justify-center text-gray-400 tabular-nums">
            <RankBadge rank={rank} />
          </span>
          {linkToPlayer ? (
            <Link
              to={`/players/${player.id}`}
              className={`
                flex min-w-0 items-center gap-2 text-indigo-600
                hover:underline
                dark:text-indigo-400
              `}
            >
              <Avatar src={player.avatar} name={displayName(player)} streak={streaks[player.id]} />
              <span className="min-w-0 break-words">{displayName(player)}</span>
            </Link>
          ) : (
            <span className="flex min-w-0 items-center gap-2">
              <Avatar src={player.avatar} name={displayName(player)} streak={streaks[player.id]} />
              <span className="min-w-0 break-words">{displayName(player)}</span>
            </span>
          )}
        </div>
      </td>
      <td className="px-2 py-3 text-right tabular-nums">{eloCell}</td>
      <td className="px-2 py-3 text-right tabular-nums">{wins}</td>
      <td className="px-2 py-3 text-right tabular-nums">{losses}</td>
      <td className="px-2 py-3 text-right tabular-nums">{total}</td>
      <td className="px-2 py-3 text-right tabular-nums">{total ? ((wins / total) * 100).toFixed(1) : 0}%</td>
      {matches !== undefined && (
        <td className="px-2 py-3">
          <Last5 results={last5} />
        </td>
      )}
    </tr>
  );
}

function DividerRow({ label, colSpan }: { label: string; colSpan: number }) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className={`
          border-b border-gray-100 bg-gray-50 px-3 py-1.5 text-center text-[11px] font-semibold tracking-wide
          text-gray-400 uppercase
          dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-500
        `}
      >
        {label}
      </td>
    </tr>
  );
}

function TableHead({
  columns,
  current,
  onToggle,
  showForm,
}: {
  columns: { key: string; label: string; align: 'left' | 'right' }[];
  current: { key: string; dir: 'asc' | 'desc' };
  onToggle: (key: string) => void;
  showForm: boolean;
}) {
  return (
    <thead>
      <tr>
        {columns.map((col) => (
          <th
            key={col.key}
            className={`
              px-2 py-2.5 text-xs font-semibold tracking-wide text-gray-400 uppercase
              dark:text-gray-500
              ${col.align === 'left' ? 'text-left' : 'text-right'}
              ${
                col.key === 'name'
                  ? `
                    sticky left-0 z-10 bg-white
                    dark:bg-gray-900
                  `
                  : ''
              }
            `}
          >
            {col.key === 'name' ? (
              <span>{col.label}</span>
            ) : (
              <button
                type="button"
                onClick={() => onToggle(col.key)}
                className="flex w-full items-center justify-end gap-1 whitespace-nowrap"
              >
                <span>{col.label}</span> <SortIndicator sortKey={col.key} current={current} />
              </button>
            )}
          </th>
        ))}
        {showForm && (
          <th
            className={`
              px-2 py-2.5 text-right text-xs font-semibold tracking-wide text-gray-400 uppercase
              dark:text-gray-500
            `}
          >
            Form
          </th>
        )}
      </tr>
    </thead>
  );
}

export default function Leaderboard({
  players,
  streaks,
  matches = undefined,
  linkToPlayer = true,
  weeklyStats = undefined,
  weekLabel = undefined,
  activeTab = 'season',
  onTabChange = undefined,
}: {
  players: Player[] | null;
  streaks: Record<number, Streak>;
  matches?: Match[];
  linkToPlayer?: boolean;
  weeklyStats?: PlayerWeekStats[];
  weekLabel?: string;
  activeTab?: TabType;
  onTabChange?: (tab: TabType) => void;
}) {
  const { displayName } = useDisplayName();

  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'elo', dir: 'desc' });
  const [weeklySort, setWeeklySort] = useState<{ key: WeeklySortKey; dir: 'asc' | 'desc' }>({
    key: 'eloDelta',
    dir: 'desc',
  });

  const toggleSort = useCallback((key: SortKey) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: key === 'name' ? 'asc' : 'desc' },
    );
  }, []);

  const toggleWeeklySort = useCallback((key: WeeklySortKey) => {
    setWeeklySort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: key === 'name' ? 'asc' : 'desc' },
    );
  }, []);

  const sortedPlayers = useMemo(() => {
    if (!players) return [];
    const iteratee = (p: Player) => {
      switch (sort.key) {
        case 'losses':
          return p.total - p.win;
        case 'winrate':
          return p.total ? p.win / p.total : -Infinity; // puts 0-games at bottom for desc
        case 'name':
          return displayName(p);
        case 'elo':
          return p.elo;
        case 'win':
          return p.win;
        case 'total':
          return p.total;
        default:
          return 0;
      }
    };
    // Second key 'name' for stable/pleasant ordering on ties
    return orderBy(
      players.filter((p) => !p.hidden),
      [iteratee, (p) => displayName(p)],
      [sort.dir, 'asc'],
    );
  }, [players, sort, displayName]);

  const sortedWeeklyStats = useMemo(() => {
    if (!weeklyStats) return [];
    const iteratee = (s: PlayerWeekStats) => {
      switch (weeklySort.key) {
        case 'name':
          return displayName(s.player);
        case 'eloDelta':
          return s.eloDelta;
        case 'wins':
          return s.wins;
        case 'losses':
          return s.losses;
        case 'total':
          return s.total;
        case 'winrate':
          return s.total ? s.wins / s.total : -Infinity;
        default:
          return 0;
      }
    };
    return orderBy(
      weeklyStats.filter((s) => !s.player.hidden),
      [iteratee, (s) => displayName(s.player)],
      [weeklySort.dir, 'asc'],
    );
  }, [weeklyStats, weeklySort, displayName]);

  const last5ByPlayer = useMemo(
    () => (matches && players ? buildLast5(matches, players) : new Map<number, ('W' | 'L')[]>()),
    [matches, players],
  );

  // Weekly Form is scoped to just the current week's matches, not overall recent form.
  const weeklyLast5ByPlayer = useMemo(() => {
    if (!matches || !players) return new Map<number, ('W' | 'L')[]>();
    const week = getWeekWindow(matches);
    if (!week) return new Map<number, ('W' | 'L')[]>();
    const weekMatches = matches.filter((m) => {
      const ts = new Date(m.created_at).getTime();
      return ts >= week.startTs && ts <= week.endTs;
    });
    return buildLast5(weekMatches, players);
  }, [matches, players]);

  // Three groups: above the initial Elo, at/below it (but played), and unranked (no games yet).
  const abovePlayers = useMemo(() => sortedPlayers.filter((p) => p.total > 0 && p.elo > INITIAL_ELO), [sortedPlayers]);
  const belowPlayers = useMemo(() => sortedPlayers.filter((p) => p.total > 0 && p.elo <= INITIAL_ELO), [sortedPlayers]);
  const unrankedPlayers = useMemo(() => sortedPlayers.filter((p) => p.total === 0), [sortedPlayers]);

  const hasWeeklyTab = weeklyStats && weeklyStats.length > 0;

  // Player, Elo, Wins, Losses, Total, Win Rate (+ Form when matches are provided)
  const seasonColSpan = 6 + (matches !== undefined ? 1 : 0);

  // Short, sports-table-style headers so the numeric columns stay narrow (W/L/GP = wins/losses/games played)
  const seasonColumns: { key: SortKey; label: string; align: 'left' | 'right' }[] = [
    { key: 'name', label: 'Player', align: 'left' },
    { key: 'elo', label: 'Elo', align: 'right' },
    { key: 'win', label: 'W', align: 'right' },
    { key: 'losses', label: 'L', align: 'right' },
    { key: 'total', label: 'GP', align: 'right' },
    { key: 'winrate', label: 'Win %', align: 'right' },
  ];

  const weeklyColumns: { key: WeeklySortKey; label: string; align: 'left' | 'right' }[] = [
    { key: 'name', label: 'Player', align: 'left' },
    { key: 'eloDelta', label: 'Elo', align: 'right' },
    { key: 'wins', label: 'W', align: 'right' },
    { key: 'losses', label: 'L', align: 'right' },
    { key: 'total', label: 'GP', align: 'right' },
    { key: 'winrate', label: 'Win %', align: 'right' },
  ];

  const isWeekly = Boolean(activeTab === 'weekly' && hasWeeklyTab);
  const columns: { key: string; label: string; align: 'left' | 'right' }[] = isWeekly ? weeklyColumns : seasonColumns;
  const currentSort = isWeekly ? weeklySort : sort;
  const handleToggle = (key: string) =>
    isWeekly ? toggleWeeklySort(key as WeeklySortKey) : toggleSort(key as SortKey);

  const renderSeasonRow = (row: Player, rank: number | null) => (
    <StatRow
      key={row.id}
      player={row}
      rank={rank}
      eloCell={
        <span className="inline-flex items-center justify-end gap-1.5 font-semibold">
          {row.is_decaying && <DecayIndicator />}
          {row.elo}
        </span>
      }
      wins={row.win}
      losses={row.total - row.win}
      total={row.total}
      linkToPlayer={linkToPlayer}
      displayName={displayName}
      streaks={streaks}
      matches={matches}
      last5={last5ByPlayer.get(row.id) ?? []}
    />
  );

  // Weekly is a flat list; Season is grouped by the baseline with divider bands.
  const bodyRows = isWeekly ? (
    sortedWeeklyStats.map((s, i) => (
      <StatRow
        key={s.player.id}
        player={s.player}
        rank={i + 1}
        eloCell={<EloDeltaCell delta={s.eloDelta} />}
        wins={s.wins}
        losses={s.losses}
        total={s.total}
        linkToPlayer={linkToPlayer}
        displayName={displayName}
        streaks={streaks}
        matches={matches}
        last5={weeklyLast5ByPlayer.get(s.player.id) ?? []}
      />
    ))
  ) : (
    <>
      {sort.key === 'elo' ? (
        <>
          {abovePlayers.map((row, i) => renderSeasonRow(row, i + 1))}
          {belowPlayers.length > 0 && (
            <>
              <DividerRow label={`Baseline · ${INITIAL_ELO}`} colSpan={seasonColSpan} />
              {belowPlayers.map((row, i) => renderSeasonRow(row, abovePlayers.length + i + 1))}
            </>
          )}
        </>
      ) : (
        [...abovePlayers, ...belowPlayers].map((row, i) => renderSeasonRow(row, i + 1))
      )}
      {unrankedPlayers.length > 0 && (
        <>
          <DividerRow label="Unranked" colSpan={seasonColSpan} />
          {unrankedPlayers.map((row) => renderSeasonRow(row, null))}
        </>
      )}
    </>
  );

  return (
    <Section
      title="Elo Ratings"
      actions={
        hasWeeklyTab ? (
          <div
            className={`
              flex rounded-lg border border-gray-200 p-0.5
              dark:border-gray-700
            `}
          >
            {(['season', 'weekly'] as TabType[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => onTabChange?.(tab)}
                className={`
                  rounded-md px-3 py-1 text-xs font-medium transition-colors
                  ${
                    activeTab === tab
                      ? `
                        bg-white text-gray-900 shadow-sm
                        dark:bg-gray-700 dark:text-gray-100
                      `
                      : `
                        text-gray-500
                        hover:text-gray-700
                        dark:text-gray-400 dark:hover:text-gray-200
                      `
                  }
                `}
              >
                {tab === 'season' ? 'Season' : 'Weekly'}
              </button>
            ))}
          </div>
        ) : null
      }
    >
      {isWeekly && weekLabel && (
        <p
          className={`
            mb-3 text-xs text-gray-400
            dark:text-gray-500
          `}
        >
          {weekLabel} · {weeklyStats?.length ?? 0} players active
        </p>
      )}
      <div className="overflow-x-auto">
        <table
          className={`
            min-w-full border-separate border-spacing-0 text-xs
            sm:text-sm
            [&_tbody_td]:border-b [&_tbody_td]:border-gray-100
            dark:[&_tbody_td]:border-gray-800
            [&_thead_th]:border-b [&_thead_th]:border-gray-200
            dark:[&_thead_th]:border-gray-700
          `}
        >
          <TableHead columns={columns} current={currentSort} onToggle={handleToggle} showForm={matches !== undefined} />
          <tbody>{bodyRows}</tbody>
        </table>
      </div>
    </Section>
  );
}
