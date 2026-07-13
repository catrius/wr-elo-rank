import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import dayjs from 'dayjs';
import supabase from '@/lib/supabase.ts';
import type { Player, Match, Season } from '@/types/common.ts';
import Avatar from '@/components/Avatar.tsx';
import { useDisplayName } from '@/contexts/DisplayNameContext.tsx';

function weekRange(first: string, last: string): string {
  const d1 = dayjs(first);
  const d2 = dayjs(last);
  if (d1.format('YYYY-MM-DD') === d2.format('YYYY-MM-DD')) return d1.format('MMM D');
  if (d1.month() === d2.month()) return `${d1.format('MMM D')}–${d2.format('D')}`;
  return `${d1.format('MMM D')}–${d2.format('MMM D')}`;
}

interface PartnerStat {
  player: Player;
  wins: number;
  total: number;
  rate: number;
}

export default function WrappedPage() {
  const { displayName } = useDisplayName();
  const { id } = useParams<{ id: string }>();
  const playerId = Number(id);

  const [player, setPlayer] = useState<Player | null>(null);
  const [season, setSeason] = useState<Season | null>(null);
  const [seasonMatches, setSeasonMatches] = useState<Match[]>([]);
  const [allPlayers, setAllPlayers] = useState<Pick<Player, 'id' | 'name' | 'avatar' | 'ingame'>[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlayer = useCallback(async () => {
    const { data } = await supabase.from('player').select().eq('id', playerId).single();
    if (data) setPlayer(data as Player);
  }, [playerId]);

  const fetchLastSeason = useCallback(async () => {
    const { data } = await supabase
      .from('season')
      .select()
      .not('end', 'is', null)
      .order('end', { ascending: false })
      .limit(1)
      .single();
    if (data) setSeason(data as Season);
  }, []);

  const fetchAllPlayers = useCallback(async () => {
    const { data } = await supabase.from('player').select('id, name, avatar, ingame');
    if (data) setAllPlayers(data as Pick<Player, 'id' | 'name' | 'avatar' | 'ingame'>[]);
  }, []);

  const fetchMatches = useCallback(async () => {
    if (!season?.start || !season?.end) return;
    const { data } = await supabase
      .from('match')
      .select()
      .gte('created_at', season.start)
      .lte('created_at', season.end)
      .or(`team_a_players.cs.{${playerId}},team_b_players.cs.{${playerId}}`)
      .order('created_at', { ascending: true });
    if (data) setSeasonMatches(data as Match[]);
    setLoading(false);
  }, [season, playerId]);

  useEffect(() => {
    Promise.all([fetchPlayer(), fetchLastSeason(), fetchAllPlayers()]);
  }, [fetchPlayer, fetchLastSeason, fetchAllPlayers]);

  useEffect(() => {
    if (season) fetchMatches();
  }, [season, fetchMatches]);

  const playerMap = useMemo(() => new Map(allPlayers.map((p) => [p.id, p])), [allPlayers]);

  const completed = useMemo(() => seasonMatches.filter((m) => m.result === 'A' || m.result === 'B'), [seasonMatches]);

  const record = useMemo(() => {
    const wins = completed.filter((m) => {
      const onA = m.team_a_players.includes(playerId);
      return (onA && m.result === 'A') || (!onA && m.result === 'B');
    }).length;
    const total = completed.length;
    return { wins, losses: total - wins, total, winRate: total ? ((wins / total) * 100).toFixed(1) : '0' };
  }, [completed, playerId]);

  const eloJourney = useMemo(() => {
    if (completed.length === 0) return null;

    const journey = completed.reduce(
      (acc, m) => {
        const onA = m.team_a_players.includes(playerId);
        const idx = onA ? m.team_a_players.indexOf(playerId) : m.team_b_players.indexOf(playerId);
        const preElo = onA ? m.team_a_elos[idx] : m.team_b_elos[idx];
        const postElo = onA ? (m.team_a_new_elos?.[idx] ?? preElo) : (m.team_b_new_elos?.[idx] ?? preElo);
        const start = acc.startElo ?? preElo;
        const isPeak = postElo > acc.peakElo;
        return {
          startElo: start,
          peakElo: isPeak ? postElo : acc.peakElo,
          peakDate: isPeak ? m.created_at : acc.peakDate,
        };
      },
      { startElo: null as number | null, peakElo: 0, peakDate: '' },
    );

    const seasonPlayers = season?.players as Partial<Player>[] | null;
    const snapshot = seasonPlayers?.find((p) => p.id === playerId);
    const endElo = snapshot?.elo ?? journey.peakElo;
    const startElo = journey.startElo ?? endElo;

    return { startElo, endElo, peakElo: journey.peakElo, peakDate: journey.peakDate };
  }, [completed, playerId, season]);

  const rankInfo = useMemo(() => {
    const seasonPlayers = season?.players as Partial<Player>[] | null;
    if (!seasonPlayers) return null;
    const sorted = [...seasonPlayers].sort((a, b) => (b.elo ?? 0) - (a.elo ?? 0));
    const rank = sorted.findIndex((p) => p.id === playerId) + 1;
    return rank > 0 ? { rank, total: sorted.length } : null;
  }, [season, playerId]);

  const { bestPartner, nemesis, mostFaced } = useMemo(() => {
    const teammateWins: Record<number, number> = {};
    const teammateTotal: Record<number, number> = {};
    const opponentWins: Record<number, number> = {};
    const opponentTotal: Record<number, number> = {};

    completed.forEach((m) => {
      const onA = m.team_a_players.includes(playerId);
      const myTeam = onA ? m.team_a_players : m.team_b_players;
      const oppTeam = onA ? m.team_b_players : m.team_a_players;
      const iWon = (onA && m.result === 'A') || (!onA && m.result === 'B');

      myTeam.forEach((tid) => {
        if (tid === playerId) return;
        teammateTotal[tid] = (teammateTotal[tid] ?? 0) + 1;
        if (iWon) teammateWins[tid] = (teammateWins[tid] ?? 0) + 1;
      });

      oppTeam.forEach((oid) => {
        opponentTotal[oid] = (opponentTotal[oid] ?? 0) + 1;
        if (iWon) opponentWins[oid] = (opponentWins[oid] ?? 0) + 1;
      });
    });

    const MIN = 3;

    const makeStats = (totals: Record<number, number>, wins: Record<number, number>): PartnerStat[] =>
      Object.entries(totals)
        .filter(([, t]) => t >= MIN)
        .flatMap(([rawId, total]) => {
          const pid = Number(rawId);
          const raw = playerMap.get(pid);
          if (!raw) return [];
          const p: Player = { ...raw, elo: 0, win: 0, total: 0, email: null, created_at: '' };
          const w = wins[pid] ?? 0;
          return [{ player: p, wins: w, total, rate: w / total }];
        });

    const partners = makeStats(teammateTotal, teammateWins).sort((a, b) => b.rate - a.rate || b.total - a.total);
    const opponents = makeStats(opponentTotal, opponentWins).sort((a, b) => a.rate - b.rate || b.total - a.total);

    const topFacedEntry = Object.entries(opponentTotal).sort(([, a], [, b]) => b - a)[0];
    const topFacedPlayer = topFacedEntry
      ? (() => {
          const raw = playerMap.get(Number(topFacedEntry[0]));
          if (!raw) return null;
          return {
            player: { ...raw, elo: 0, win: 0, total: 0, email: null, created_at: '' } as Player,
            count: topFacedEntry[1],
          };
        })()
      : null;

    return { bestPartner: partners[0] ?? null, nemesis: opponents[0] ?? null, mostFaced: topFacedPlayer };
  }, [completed, playerId, playerMap]);

  const extras = useMemo(() => {
    if (completed.length === 0) return null;

    // Favorite teammate by count
    const teammateCounts: Record<number, number> = {};
    completed.forEach((m) => {
      const onA = m.team_a_players.includes(playerId);
      const myTeam = onA ? m.team_a_players : m.team_b_players;
      myTeam.forEach((tid) => {
        if (tid !== playerId) teammateCounts[tid] = (teammateCounts[tid] ?? 0) + 1;
      });
    });
    const topEntry = Object.entries(teammateCounts).sort(([, a], [, b]) => b - a)[0];
    const favoriteTeammate = topEntry
      ? (() => {
          const raw = playerMap.get(Number(topEntry[0]));
          if (!raw) return null;
          return {
            player: { ...raw, elo: 0, win: 0, total: 0, email: null, created_at: '' } as Player,
            count: topEntry[1],
          };
        })()
      : null;

    // Busiest calendar day
    const dayCounts: Record<string, number> = {};
    completed.forEach((m) => {
      const day = dayjs(m.created_at).format('YYYY-MM-DD');
      dayCounts[day] = (dayCounts[day] ?? 0) + 1;
    });
    const topDay = Object.entries(dayCounts).sort(([, a], [, b]) => b - a)[0];
    const busiestDay = topDay ? { date: topDay[0], count: topDay[1] } : null;

    // Active days
    const activeDays = Object.keys(dayCounts).length;

    // Best week by win rate (min 2 matches in week, min 2 weeks of data)
    const weekData: Record<string, { wins: number; total: number; firstDate: string; lastDate: string }> = {};
    completed.forEach((m) => {
      const wk = dayjs(m.created_at).startOf('week').format('YYYY-MM-DD');
      if (!weekData[wk]) weekData[wk] = { wins: 0, total: 0, firstDate: m.created_at, lastDate: m.created_at };
      weekData[wk].total += 1;
      weekData[wk].lastDate = m.created_at;
      const onA = m.team_a_players.includes(playerId);
      const iWon = (onA && m.result === 'A') || (!onA && m.result === 'B');
      if (iWon) weekData[wk].wins += 1;
    });
    const weekEntries = Object.values(weekData).filter((w) => w.total >= 2);
    const sortedWeeks = weekEntries.sort((a, b) => b.wins / b.total - a.wins / a.total);
    const bestWeek = sortedWeeks.length >= 2 ? sortedWeeks[0] : null;
    const worstWeek = sortedWeeks.length >= 2 ? sortedWeeks[sortedWeeks.length - 1] : null;

    return { favoriteTeammate, busiestDay, activeDays, bestWeek, worstWeek };
  }, [completed, playerId, playerMap]);

  const longestStreak = useMemo(() => {
    const result = completed.reduce(
      (acc, m) => {
        const onA = m.team_a_players.includes(playerId);
        const iWon = (onA && m.result === 'A') || (!onA && m.result === 'B');
        if (iWon) {
          const curWin = acc.curWin + 1;
          return { maxWin: Math.max(acc.maxWin, curWin), maxLoss: acc.maxLoss, curWin, curLoss: 0 };
        }
        const curLoss = acc.curLoss + 1;
        return { maxWin: acc.maxWin, maxLoss: Math.max(acc.maxLoss, curLoss), curWin: 0, curLoss };
      },
      { maxWin: 0, maxLoss: 0, curWin: 0, curLoss: 0 },
    );
    return { wins: result.maxWin, losses: result.maxLoss };
  }, [completed, playerId]);

  const shell = (children: React.ReactNode) => (
    <div
      className={`
        min-h-screen bg-gradient-to-b from-gray-50 to-white text-gray-900
        dark:from-gray-950 dark:to-gray-900 dark:text-gray-100
      `}
    >
      <div
        className={`
          mx-auto max-w-3xl p-4
          md:p-8
        `}
      >
        {children}
      </div>
    </div>
  );

  if (loading || !player) {
    return shell(
      <p
        className={`
          text-gray-500
          dark:text-gray-400
        `}
      >
        Loading…
      </p>,
    );
  }

  if (!season) {
    return shell(
      <>
        <Link
          to={`/players/${playerId}`}
          className={`
            mb-6 inline-block text-sm text-blue-600
            hover:underline
            dark:text-blue-400
          `}
        >
          &larr; Back
        </Link>
        <p
          className={`
            text-gray-500
            dark:text-gray-400
          `}
        >
          No completed seasons yet.
        </p>
      </>,
    );
  }

  if (completed.length === 0) {
    return shell(
      <>
        <Link
          to={`/players/${playerId}`}
          className={`
            mb-6 inline-block text-sm text-blue-600
            hover:underline
            dark:text-blue-400
          `}
        >
          &larr; Back
        </Link>
        <p
          className={`
            text-gray-500
            dark:text-gray-400
          `}
        >
          {displayName(player)} didn&apos;t play in {season.name}.
        </p>
      </>,
    );
  }

  const card = `
    rounded-2xl border border-gray-100 bg-white p-4 shadow-sm text-center
    dark:border-gray-800 dark:bg-gray-900
  `;

  const secondaryItems: React.ReactNode[] = [];

  if (rankInfo) {
    secondaryItems.push(
      <div key="rank" className={card}>
        <div
          className={`
            text-sm text-gray-500
            dark:text-gray-400
          `}
        >
          Season Rank
        </div>
        <div className="text-2xl font-bold">#{rankInfo.rank}</div>
        <div className="text-xs text-gray-400">of {rankInfo.total} players</div>
      </div>,
    );
  }

  if (eloJourney && eloJourney.peakElo > 0) {
    secondaryItems.push(
      <div key="peak" className={card}>
        <div
          className={`
            text-sm text-gray-500
            dark:text-gray-400
          `}
        >
          Peak Elo
        </div>
        <div className="text-2xl font-bold">{eloJourney.peakElo}</div>
        <div className="text-xs text-gray-400">{dayjs(eloJourney.peakDate).format('MMM D')}</div>
      </div>,
    );
  }

  if (longestStreak.wins >= 2) {
    secondaryItems.push(
      <div key="wstreak" className={card}>
        <div
          className={`
            text-sm text-gray-500
            dark:text-gray-400
          `}
        >
          Win Streak
        </div>
        <div
          className={`
            text-2xl font-bold text-orange-500
            dark:text-orange-400
          `}
        >
          {longestStreak.wins}
        </div>
        <div className="text-xs text-gray-400">in a row</div>
      </div>,
    );
  }

  if (longestStreak.losses >= 2) {
    secondaryItems.push(
      <div key="lstreak" className={card}>
        <div
          className={`
            text-sm text-gray-500
            dark:text-gray-400
          `}
        >
          Loss Streak
        </div>
        <div
          className={`
            text-2xl font-bold text-blue-500
            dark:text-blue-400
          `}
        >
          {longestStreak.losses}
        </div>
        <div className="text-xs text-gray-400">in a row</div>
      </div>,
    );
  }

  const secondaryCols =
    secondaryItems.length <= 2
      ? `grid-cols-${secondaryItems.length}`
      : secondaryItems.length === 3
        ? 'grid-cols-3'
        : 'grid-cols-2 sm:grid-cols-4';

  return shell(
    <>
      <Link
        to={`/players/${playerId}`}
        className={`
          mb-6 inline-block text-sm text-blue-600
          hover:underline
          dark:text-blue-400
        `}
      >
        &larr; Back
      </Link>

      {/* Hero */}
      <div className="mb-8 flex items-center gap-4">
        <Avatar src={player.avatar} name={displayName(player)} size="lg" />
        <div>
          <div
            className={`
              mb-0.5 text-xs font-semibold tracking-widest text-indigo-500 uppercase
              dark:text-indigo-400
            `}
          >
            {season.name} · Wrapped
          </div>
          <h1
            className={`
              text-2xl font-bold tracking-tight
              md:text-3xl
            `}
          >
            {displayName(player)}
          </h1>
          {season.start && season.end && (
            <div className="mt-0.5 text-xs text-gray-400">
              {dayjs(season.start).format('MMM D')} – {dayjs(season.end).format('MMM D, YYYY')}
            </div>
          )}
        </div>
      </div>

      {/* Elo this season */}
      {eloJourney && (
        <div
          className={`
            mb-6 rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm
            dark:border-gray-800 dark:bg-gray-900
          `}
        >
          <div
            className={`
              mb-1 text-sm text-gray-500
              dark:text-gray-400
            `}
          >
            Elo this season
          </div>
          <div className="text-5xl font-black tabular-nums">{eloJourney.endElo}</div>
        </div>
      )}

      {/* W / L / Total / Win Rate */}
      <div
        className={`
          mb-6 grid grid-cols-2 gap-4
          sm:grid-cols-4
        `}
      >
        {[
          { label: 'Wins', value: record.wins },
          { label: 'Losses', value: record.losses },
          { label: 'Total', value: record.total },
          { label: 'Win Rate', value: `${record.winRate}%` },
        ].map(({ label, value }) => (
          <div key={label} className={card}>
            <div
              className={`
                text-sm text-gray-500
                dark:text-gray-400
              `}
            >
              {label}
            </div>
            <div className="text-2xl font-bold">{value}</div>
          </div>
        ))}
      </div>

      {/* Rank / Peak / Streak */}
      {secondaryItems.length > 0 && (
        <div
          className={`
            mb-6 grid gap-4
            ${secondaryCols}
          `}
        >
          {secondaryItems}
        </div>
      )}

      {/* Busiest day / Active days / Best week / Worst week */}
      {extras && (
        <div
          className={`
            mb-4 grid grid-cols-2 gap-4
            sm:grid-cols-4
          `}
        >
          {extras.busiestDay && (
            <div
              className={`
                rounded-2xl border border-gray-100 bg-white p-4 shadow-sm
                dark:border-gray-800 dark:bg-gray-900
              `}
            >
              <div
                className={`
                  mb-1 text-sm text-gray-500
                  dark:text-gray-400
                `}
              >
                Busiest Day
              </div>
              <div className="text-2xl font-bold">{extras.busiestDay.count} matches</div>
              <div className="text-xs text-gray-400">{dayjs(extras.busiestDay.date).format('MMM D, YYYY')}</div>
            </div>
          )}
          <div
            className={`
              rounded-2xl border border-gray-100 bg-white p-4 shadow-sm
              dark:border-gray-800 dark:bg-gray-900
            `}
          >
            <div
              className={`
                mb-1 text-sm text-gray-500
                dark:text-gray-400
              `}
            >
              Active Days
            </div>
            <div className="text-2xl font-bold">{extras.activeDays}</div>
            <div className="text-xs text-gray-400">days played</div>
          </div>
          {extras.bestWeek && (
            <div
              className={`
                rounded-2xl border border-gray-100 bg-white p-4 shadow-sm
                dark:border-gray-800 dark:bg-gray-900
              `}
            >
              <div
                className={`
                  mb-1 text-sm text-gray-500
                  dark:text-gray-400
                `}
              >
                Best Week
              </div>
              <div className="text-2xl font-bold">
                {Math.round((extras.bestWeek.wins / extras.bestWeek.total) * 100)}%
              </div>
              <div className="text-xs text-gray-400">
                {extras.bestWeek.wins}W–{extras.bestWeek.total - extras.bestWeek.wins}L ·{' '}
                {weekRange(extras.bestWeek.firstDate, extras.bestWeek.lastDate)}
              </div>
            </div>
          )}
          {extras.worstWeek && (
            <div
              className={`
                rounded-2xl border border-gray-100 bg-white p-4 shadow-sm
                dark:border-gray-800 dark:bg-gray-900
              `}
            >
              <div
                className={`
                  mb-1 text-sm text-gray-500
                  dark:text-gray-400
                `}
              >
                Worst Week
              </div>
              <div
                className={`
                  text-2xl font-bold text-red-500
                  dark:text-red-400
                `}
              >
                {Math.round((extras.worstWeek.wins / extras.worstWeek.total) * 100)}%
              </div>
              <div className="text-xs text-gray-400">
                {extras.worstWeek.wins}W–{extras.worstWeek.total - extras.worstWeek.wins}L ·{' '}
                {weekRange(extras.worstWeek.firstDate, extras.worstWeek.lastDate)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Best partner & Nemesis */}
      {(bestPartner ?? nemesis) && (
        <div
          className={`
            mb-4 grid gap-4
            ${bestPartner && nemesis ? 'md:grid-cols-2' : 'grid-cols-1'}
          `}
        >
          {bestPartner && (
            <div
              className={`
                rounded-2xl border border-gray-100 bg-white p-4 shadow-sm
                dark:border-gray-800 dark:bg-gray-900
              `}
            >
              <div
                className={`
                  mb-3 text-sm text-gray-500
                  dark:text-gray-400
                `}
              >
                Best Partner
              </div>
              <div className="flex items-center gap-3">
                <Avatar src={bestPartner.player.avatar} name={displayName(bestPartner.player)} size="lg" />
                <div className="min-w-0">
                  <div className="truncate font-semibold">{displayName(bestPartner.player)}</div>
                  <div
                    className={`
                      text-sm text-green-600
                      dark:text-green-400
                    `}
                  >
                    {bestPartner.wins}W–{bestPartner.total - bestPartner.wins}L together (
                    {Math.round(bestPartner.rate * 100)}%)
                  </div>
                </div>
              </div>
            </div>
          )}
          {nemesis && (
            <div
              className={`
                rounded-2xl border border-gray-100 bg-white p-4 shadow-sm
                dark:border-gray-800 dark:bg-gray-900
              `}
            >
              <div
                className={`
                  mb-3 text-sm text-gray-500
                  dark:text-gray-400
                `}
              >
                Nemesis
              </div>
              <div className="flex items-center gap-3">
                <Avatar src={nemesis.player.avatar} name={displayName(nemesis.player)} size="lg" />
                <div className="min-w-0">
                  <div className="truncate font-semibold">{displayName(nemesis.player)}</div>
                  <div
                    className={`
                      text-sm text-red-500
                      dark:text-red-400
                    `}
                  >
                    {nemesis.wins}W–{nemesis.total - nemesis.wins}L vs them ({Math.round(nemesis.rate * 100)}% win rate)
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Favorite teammate / Most played against */}
      {extras && (extras.favoriteTeammate ?? mostFaced) && (
        <div
          className={`
            mb-4 grid gap-4
            ${extras.favoriteTeammate && mostFaced ? 'md:grid-cols-2' : 'grid-cols-1'}
          `}
        >
          {extras.favoriteTeammate && (
            <div
              className={`
                rounded-2xl border border-gray-100 bg-white p-4 shadow-sm
                dark:border-gray-800 dark:bg-gray-900
              `}
            >
              <div
                className={`
                  mb-3 text-sm text-gray-500
                  dark:text-gray-400
                `}
              >
                Favorite Teammate
              </div>
              <div className="flex items-center gap-3">
                <Avatar
                  src={extras.favoriteTeammate.player.avatar}
                  name={displayName(extras.favoriteTeammate.player)}
                  size="lg"
                />
                <div className="min-w-0">
                  <div className="truncate font-semibold">{displayName(extras.favoriteTeammate.player)}</div>
                  <div
                    className={`
                      text-sm text-gray-500
                      dark:text-gray-400
                    `}
                  >
                    {extras.favoriteTeammate.count} games together
                  </div>
                </div>
              </div>
            </div>
          )}
          {mostFaced && (
            <div
              className={`
                rounded-2xl border border-gray-100 bg-white p-4 shadow-sm
                dark:border-gray-800 dark:bg-gray-900
              `}
            >
              <div
                className={`
                  mb-3 text-sm text-gray-500
                  dark:text-gray-400
                `}
              >
                Most Played Against
              </div>
              <div className="flex items-center gap-3">
                <Avatar src={mostFaced.player.avatar} name={displayName(mostFaced.player)} size="lg" />
                <div className="min-w-0">
                  <div className="truncate font-semibold">{displayName(mostFaced.player)}</div>
                  <div
                    className={`
                      text-sm text-gray-500
                      dark:text-gray-400
                    `}
                  >
                    {mostFaced.count} games against
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>,
  );
}
