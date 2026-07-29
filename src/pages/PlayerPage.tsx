import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import supabase from '@/lib/supabase.ts';
import type { Player, Match } from '@/types/common.ts';
import Avatar from '@/components/Avatar.tsx';
import BackButton from '@/components/BackButton.tsx';
import EloChart from '@/components/EloChart.tsx';
import PlayerGarden from '@/components/PlayerGarden.tsx';
import { useDisplayName } from '@/contexts/DisplayNameContext.tsx';
import { useAuth } from '@/contexts/AuthContext.tsx';
import { getWeekWindow, computeWeeklyStats } from '@/utils/weeklyStats.ts';

export default function PlayerPage() {
  const { displayName } = useDisplayName();
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const playerId = Number(id);
  const [player, setPlayer] = useState<Player | null>(null);
  const [playerLoading, setPlayerLoading] = useState(true);
  const [matches, setMatches] = useState<Match[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchPlayer = useCallback(async () => {
    const { data } = await supabase.from('player').select().eq('id', playerId).single();
    setPlayer(data ? (data as Player) : null);
    setPlayerLoading(false);
  }, [playerId]);

  const fetchMatches = useCallback(async () => {
    const { data } = await supabase
      .from('match')
      .select()
      .or(`team_a_players.cs.{${playerId}},team_b_players.cs.{${playerId}}`);
    if (data) setMatches(data as Match[]);
  }, [playerId]);

  const weeklyStats = useMemo(() => {
    if (!player || matches.length === 0) return null;
    const sorted = [...matches]
      .filter((m) => m.result === 'A' || m.result === 'B')
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    const week = getWeekWindow(sorted);
    if (!week) return null;
    const stats = computeWeeklyStats(sorted, [player], week);
    return { stat: stats[0] ?? null, label: week.label };
  }, [player, matches]);

  const allTimeStats = useMemo(() => {
    const completed = matches.filter((m) => m.result === 'A' || m.result === 'B');
    const wins = completed.filter((m) => {
      const onTeamA = m.team_a_players.includes(playerId);
      return (onTeamA && m.result === 'A') || (!onTeamA && m.result === 'B');
    }).length;
    const total = completed.length;
    return { wins, losses: total - wins, total, winRate: total ? ((wins / total) * 100).toFixed(1) : '0' };
  }, [matches, playerId]);

  useEffect(() => {
    fetchPlayer();
    fetchMatches();
  }, [fetchPlayer, fetchMatches]);

  useEffect(() => {
    if (!user?.email) return;
    supabase
      .from('player')
      .select('isAdmin')
      .eq('email', user.email)
      .single()
      .then(({ data }) => setIsAdmin(data?.isAdmin ?? false));
  }, [user?.email]);

  if (playerLoading || !player) {
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
          <div className="mb-6">
            <BackButton to="/" />
          </div>
          <div className="flex flex-col items-center justify-center py-24 text-center">
            {playerLoading ? (
              <>
                <div
                  className={`
                    mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-500
                    dark:border-gray-700 dark:border-t-indigo-400
                  `}
                />
                <p
                  className={`
                    text-sm text-gray-500
                    dark:text-gray-400
                  `}
                >
                  Loading player…
                </p>
              </>
            ) : (
              <>
                <div
                  className={`
                    mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100
                    dark:bg-gray-800
                  `}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`
                      h-8 w-8 text-gray-400
                      dark:text-gray-500
                    `}
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                    <line x1="18" y1="2" x2="23" y2="7" />
                    <line x1="23" y1="2" x2="18" y2="7" />
                  </svg>
                </div>
                <h2 className="mb-1 text-lg font-semibold">Player not found</h2>
                <p
                  className={`
                    text-sm text-gray-500
                    dark:text-gray-400
                  `}
                >
                  This player doesn&apos;t exist or may have been removed.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    );
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
        <div className="mb-6 flex items-center justify-between gap-4">
          <BackButton to="/" />
          <Link
            to={`/wrapped/${playerId}`}
            className={`
              inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold
              text-white shadow-sm transition-all
              hover:bg-indigo-500
              active:scale-95 active:bg-indigo-700
              dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:active:bg-indigo-600
            `}
          >
            Season Wrapped
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="h-4 w-4 shrink-0"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d={
                  'M2 8a.75.75 0 0 1 .75-.75h8.69L8.22 4.03a.75.75 0 0 1 1.06-1.06l4.5 4.5a.75.75 0 0 1 0 1.06' +
                  'l-4.5 4.5a.75.75 0 0 1-1.06-1.06l3.22-3.22H2.75A.75.75 0 0 1 2 8Z'
                }
                clipRule="evenodd"
              />
            </svg>
          </Link>
        </div>

        <div className="mb-6 flex items-center gap-4">
          <Avatar src={player.avatar} name={displayName(player)} size="lg" />
          <h1
            className={`
              text-2xl font-bold tracking-tight
              md:text-3xl
            `}
          >
            {displayName(player)}
          </h1>
        </div>

        <div className="mb-6">
          <PlayerGarden player={player} matches={matches} playerId={playerId} isAdmin={isAdmin} />
        </div>

        <h2
          className={`
            mb-4 text-lg font-semibold
            md:text-xl
          `}
        >
          Current Season
        </h2>
        <div
          className={`
            mb-6 grid grid-cols-2 gap-4
            sm:grid-cols-4
          `}
        >
          <div
            className={`
              rounded-lg bg-white p-4 shadow
              dark:bg-gray-800
            `}
          >
            <div
              className={`
                text-sm text-gray-500
                dark:text-gray-400
              `}
            >
              Elo
            </div>
            <div className="text-2xl font-bold">{player.elo}</div>
          </div>
          <div
            className={`
              rounded-lg bg-white p-4 shadow
              dark:bg-gray-800
            `}
          >
            <div
              className={`
                text-sm text-gray-500
                dark:text-gray-400
              `}
            >
              Wins
            </div>
            <div className="text-2xl font-bold">{player.win}</div>
          </div>
          <div
            className={`
              rounded-lg bg-white p-4 shadow
              dark:bg-gray-800
            `}
          >
            <div
              className={`
                text-sm text-gray-500
                dark:text-gray-400
              `}
            >
              Losses
            </div>
            <div className="text-2xl font-bold">{player.total - player.win}</div>
          </div>
          <div
            className={`
              rounded-lg bg-white p-4 shadow
              dark:bg-gray-800
            `}
          >
            <div
              className={`
                text-sm text-gray-500
                dark:text-gray-400
              `}
            >
              Win Rate
            </div>
            <div className="text-2xl font-bold">
              {player.total ? ((player.win / player.total) * 100).toFixed(1) : 0}%
            </div>
          </div>
        </div>

        {weeklyStats?.stat && (
          <>
            <h2
              className={`
                mb-4 text-lg font-semibold
                md:text-xl
              `}
            >
              Weekly
              <span
                className={`
                  ml-2 text-sm font-normal text-gray-400
                  dark:text-gray-500
                `}
              >
                {weeklyStats.label}
              </span>
            </h2>
            <div
              className={`
                mb-6 grid grid-cols-2 gap-4
                sm:grid-cols-4
              `}
            >
              {[
                {
                  label: 'Elo Δ',
                  value: weeklyStats.stat.eloDelta,
                  colored: true,
                },
                { label: 'Wins', value: weeklyStats.stat.wins },
                { label: 'Losses', value: weeklyStats.stat.losses },
                {
                  label: 'Win Rate',
                  value: weeklyStats.stat.total
                    ? `${((weeklyStats.stat.wins / weeklyStats.stat.total) * 100).toFixed(1)}%`
                    : '0%',
                },
              ].map(({ label, value, colored }) => (
                <div
                  key={label}
                  className={`
                    rounded-lg bg-white p-4 shadow
                    dark:bg-gray-800
                  `}
                >
                  <div
                    className={`
                      text-sm text-gray-500
                      dark:text-gray-400
                    `}
                  >
                    {label}
                  </div>
                  <div
                    className={`
                      text-2xl font-bold
                      ${
                        colored && typeof value === 'number'
                          ? value > 0
                            ? `
                              text-green-600
                              dark:text-green-400
                            `
                            : value < 0
                              ? `
                                text-red-500
                                dark:text-red-400
                              `
                              : ''
                          : ''
                      }
                    `}
                  >
                    {colored && typeof value === 'number' && value > 0 ? `+${value}` : value}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <h2
          className={`
            mb-4 text-lg font-semibold
            md:text-xl
          `}
        >
          All Time
        </h2>
        <div
          className={`
            mb-6 grid grid-cols-2 gap-4
            sm:grid-cols-4
          `}
        >
          <div
            className={`
              rounded-lg bg-white p-4 shadow
              dark:bg-gray-800
            `}
          >
            <div
              className={`
                text-sm text-gray-500
                dark:text-gray-400
              `}
            >
              Total
            </div>
            <div className="text-2xl font-bold">{allTimeStats.total}</div>
          </div>
          <div
            className={`
              rounded-lg bg-white p-4 shadow
              dark:bg-gray-800
            `}
          >
            <div
              className={`
                text-sm text-gray-500
                dark:text-gray-400
              `}
            >
              Wins
            </div>
            <div className="text-2xl font-bold">{allTimeStats.wins}</div>
          </div>
          <div
            className={`
              rounded-lg bg-white p-4 shadow
              dark:bg-gray-800
            `}
          >
            <div
              className={`
                text-sm text-gray-500
                dark:text-gray-400
              `}
            >
              Losses
            </div>
            <div className="text-2xl font-bold">{allTimeStats.losses}</div>
          </div>
          <div
            className={`
              rounded-lg bg-white p-4 shadow
              dark:bg-gray-800
            `}
          >
            <div
              className={`
                text-sm text-gray-500
                dark:text-gray-400
              `}
            >
              Win Rate
            </div>
            <div className="text-2xl font-bold">{allTimeStats.winRate}%</div>
          </div>
        </div>

        <EloChart playerId={playerId} matches={matches} />
      </div>
    </div>
  );
}
