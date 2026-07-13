import { useState, useMemo, useCallback } from 'react';
import { orderBy } from 'es-toolkit';
import { Link } from 'react-router-dom';
import type { Player, Match } from '@/types/common.ts';
import type { Streak } from '@/utils/streaks.ts';
import type { PlayerWeekStats } from '@/utils/weeklyStats.ts';
import Section from '@/components/Section.tsx';
import Avatar from '@/components/Avatar.tsx';
import { useDisplayName } from '@/contexts/DisplayNameContext.tsx';

type SortKey = 'name' | 'elo' | 'win' | 'losses' | 'total' | 'winrate';
type WeeklySortKey = 'name' | 'eloDelta' | 'wins' | 'losses' | 'total' | 'winrate';
type TabType = 'season' | 'weekly';

function SortIndicator({ sortKey, current }: { sortKey: string; current: { key: string; dir: 'asc' | 'desc' } }) {
  if (current.key !== sortKey) return <>&#9654;</>;
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
    return orderBy(players, [iteratee, (p) => displayName(p)], [sort.dir, 'asc']);
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
    return orderBy(weeklyStats, [iteratee, (s) => displayName(s.player)], [weeklySort.dir, 'asc']);
  }, [weeklyStats, weeklySort, displayName]);

  const last5ByPlayer = useMemo(() => {
    const map = new Map<number, ('W' | 'L')[]>();
    if (!matches || !players) return map;
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
  }, [matches, players]);

  const hasWeeklyTab = weeklyStats && weeklyStats.length > 0;

  const seasonColumns: { key: SortKey; label: string; align: 'left' | 'right' }[] = [
    { key: 'name', label: 'Player', align: 'left' },
    { key: 'elo', label: 'Elo', align: 'right' },
    { key: 'win', label: 'Wins', align: 'right' },
    { key: 'losses', label: 'Losses', align: 'right' },
    { key: 'total', label: 'Total', align: 'right' },
    { key: 'winrate', label: 'Win Rate', align: 'right' },
  ];

  const weeklyColumns: { key: WeeklySortKey; label: string; align: 'left' | 'right' }[] = [
    { key: 'name', label: 'Player', align: 'left' },
    { key: 'eloDelta', label: 'Elo Δ', align: 'right' },
    { key: 'wins', label: 'Wins', align: 'right' },
    { key: 'losses', label: 'Losses', align: 'right' },
    { key: 'total', label: 'Total', align: 'right' },
    { key: 'winrate', label: 'Win Rate', align: 'right' },
  ];

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
      {activeTab === 'weekly' && hasWeeklyTab ? (
        <>
          {weekLabel && (
            <p
              className={`
                mb-3 text-xs text-gray-400
                dark:text-gray-500
              `}
            >
              {weekLabel} · {weeklyStats.length} players active
            </p>
          )}
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
                  {weeklyColumns.map((col) => (
                    <th
                      key={col.key}
                      className={`
                        px-3 py-2 font-semibold
                        ${col.align === 'left' ? 'text-left' : 'text-right'}
                      `}
                    >
                      <button
                        type="button"
                        onClick={() => toggleWeeklySort(col.key)}
                        className="inline-flex items-center gap-1"
                      >
                        {col.label} <SortIndicator sortKey={col.key} current={weeklySort} />
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedWeeklyStats.map((row, i) => (
                  <tr
                    key={row.player.id}
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
                    <td className="min-w-40 px-3 py-2">
                      {linkToPlayer ? (
                        <Link
                          to={`/players/${row.player.id}`}
                          className={`
                            inline-flex items-center gap-2 text-indigo-600
                            hover:underline
                            dark:text-indigo-400
                          `}
                        >
                          <Avatar
                            src={row.player.avatar}
                            name={displayName(row.player)}
                            streak={streaks[row.player.id]}
                          />
                          {displayName(row.player)}
                        </Link>
                      ) : (
                        <span className="inline-flex items-center gap-2">
                          <Avatar
                            src={row.player.avatar}
                            name={displayName(row.player)}
                            streak={streaks[row.player.id]}
                          />
                          {displayName(row.player)}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <EloDeltaCell delta={row.eloDelta} />
                    </td>
                    <td className="px-3 py-2 text-right">{row.wins}</td>
                    <td className="px-3 py-2 text-right">{row.losses}</td>
                    <td className="px-3 py-2 text-right">{row.total}</td>
                    <td className="px-3 py-2 text-right">
                      {row.total ? ((row.wins / row.total) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
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
                {seasonColumns.map((col) => (
                  <th
                    key={col.key}
                    className={`
                      px-3 py-2 font-semibold
                      ${col.align === 'left' ? 'text-left' : 'text-right'}
                    `}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className="inline-flex items-center gap-1"
                    >
                      {col.label} <SortIndicator sortKey={col.key} current={sort} />
                    </button>
                  </th>
                ))}
                {matches !== undefined && <th className="px-3 py-2 text-right font-semibold">Last 5</th>}
              </tr>
            </thead>
            <tbody>
              {sortedPlayers?.map((row, i) => (
                <tr
                  key={row.id}
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
                  <td className="min-w-40 px-3 py-2">
                    {linkToPlayer ? (
                      <Link
                        to={`/players/${row.id}`}
                        className={`
                          inline-flex items-center gap-2 text-indigo-600
                          hover:underline
                          dark:text-indigo-400
                        `}
                      >
                        <Avatar src={row.avatar} name={displayName(row)} streak={streaks[row.id]} />
                        {displayName(row)}
                      </Link>
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        <Avatar src={row.avatar} name={displayName(row)} streak={streaks[row.id]} />
                        {displayName(row)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">{row.elo}</td>
                  <td className="px-3 py-2 text-right">{row.win}</td>
                  <td className="px-3 py-2 text-right">{row.total - row.win}</td>
                  <td className="px-3 py-2 text-right">{row.total}</td>
                  <td className="px-3 py-2 text-right">{row.total ? ((row.win / row.total) * 100).toFixed(1) : 0}%</td>
                  {matches !== undefined && (
                    <td className="px-3 py-2">
                      <Last5 results={last5ByPlayer.get(row.id) ?? []} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}
