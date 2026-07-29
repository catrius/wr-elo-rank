import { useState, useMemo, useCallback } from 'react';
import { orderBy } from 'es-toolkit';
import type { Player, Match } from '@/types/common.ts';
import type { Streak } from '@/utils/streaks.ts';
import { getWeekWindow, type PlayerWeekStats } from '@/utils/weeklyStats.ts';
import { INITIAL_ELO, buildLast5 } from '@/utils/leaderboardStats.ts';
import Section from '@/components/Section.tsx';
import { useDisplayName } from '@/contexts/DisplayNameContext.tsx';
import DecayIndicator from '@/components/leaderboard/DecayIndicator.tsx';
import EloDeltaCell from '@/components/leaderboard/EloDeltaCell.tsx';
import StatRow from '@/components/leaderboard/StatRow.tsx';
import DividerRow from '@/components/leaderboard/DividerRow.tsx';
import TableHead from '@/components/leaderboard/TableHead.tsx';

type SortKey = 'name' | 'elo' | 'win' | 'losses' | 'total' | 'winrate';
type WeeklySortKey = 'name' | 'eloDelta' | 'wins' | 'losses' | 'total' | 'winrate';
type TabType = 'season' | 'weekly';

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
    // Ties break by win % then win count (then name for full determinism).
    return orderBy(
      players.filter((p) => !p.hidden),
      [iteratee, (p) => (p.total ? p.win / p.total : -Infinity), (p) => p.win, (p) => displayName(p)],
      [sort.dir, 'desc', 'desc', 'asc'],
    );
  }, [players, sort, displayName]);

  // Competition ranking by Elo: equal Elo shares a rank (1,2,2,4,…). Tie order is win % then wins.
  // Rank is a player's Elo standing, independent of the active sort column; unranked (no games) get no rank.
  const rankByPlayerId = useMemo(() => {
    const map = new Map<number, number>();
    if (!players) return map;
    const ranked = orderBy(
      players.filter((p) => !p.hidden && p.total > 0),
      [(p) => p.elo, (p) => (p.total ? p.win / p.total : -Infinity), (p) => p.win],
      ['desc', 'desc', 'desc'],
    );
    let lastElo: number | null = null;
    let lastRank = 0;
    ranked.forEach((p, i) => {
      if (p.elo !== lastElo) {
        lastRank = i + 1;
        lastElo = p.elo;
      }
      map.set(p.id, lastRank);
    });
    return map;
  }, [players]);

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
          {abovePlayers.map((row) => renderSeasonRow(row, rankByPlayerId.get(row.id) ?? null))}
          {belowPlayers.length > 0 && (
            <>
              <DividerRow label={`Baseline · ${INITIAL_ELO}`} colSpan={seasonColSpan} />
              {belowPlayers.map((row) => renderSeasonRow(row, rankByPlayerId.get(row.id) ?? null))}
            </>
          )}
        </>
      ) : (
        [...abovePlayers, ...belowPlayers].map((row) => renderSeasonRow(row, rankByPlayerId.get(row.id) ?? null))
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
