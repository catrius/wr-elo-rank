import { useEffect, useCallback, useState, useLayoutEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import supabase from '@/lib/supabase.ts';
import useSupaQuery from '@/hooks/useSupaQuery.ts';
import type { Player, Season, Match } from '@/types/common.ts';
import Leaderboard from '@/components/Leaderboard.tsx';
import SeasonSpotlight from '@/components/SeasonSpotlight.tsx';

export default function SeasonPage() {
  const { id } = useParams<{ id: string }>();
  const seasonId = Number(id);

  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');

  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  const getSeasonsCallback = useCallback(
    async () => supabase.from('season').select().order('created_at', { ascending: false }),
    [],
  );
  const [getSeasons, { data: seasonsData }] = useSupaQuery(getSeasonsCallback);
  const seasons = seasonsData as Season[] | null;

  const getPlayersCallback = useCallback(async () => supabase.from('player').select('id, name, avatar'), []);
  const [getPlayers, { data: playerData }] = useSupaQuery(getPlayersCallback);
  const allPlayers = playerData as Pick<Player, 'id' | 'name' | 'avatar'>[] | null;

  const season = useMemo(() => seasons?.find((s) => s.id === seasonId) ?? null, [seasons, seasonId]);

  const prevSeason = useMemo(() => {
    if (!seasons || !season) return null;
    const idx = seasons.findIndex((s) => s.id === seasonId);
    return idx >= 0 && idx < seasons.length - 1 ? seasons[idx + 1] : null;
  }, [seasons, season, seasonId]);

  const playerMap = useMemo(() => (allPlayers ? new Map(allPlayers.map((p) => [p.id, p])) : null), [allPlayers]);

  const enrichPlayers = useCallback(
    (raw: Partial<Player>[] | null) => {
      if (!raw || !playerMap) return null;
      return raw.map((sp) => {
        const info = playerMap.get(sp.id!);
        return { ...sp, name: info?.name ?? '', avatar: info?.avatar ?? null } as Player;
      });
    },
    [playerMap],
  );

  const players = useMemo(() => enrichPlayers(season?.players as Partial<Player>[] | null), [season, enrichPlayers]);

  const prevPlayers = useMemo(
    () => enrichPlayers(prevSeason?.players as Partial<Player>[] | null),
    [prevSeason, enrichPlayers],
  );

  const getMatchesCallback = useCallback(async () => {
    if (!season?.start || !season?.end) {
      return { data: [] as Match[], error: null, count: null };
    }
    return supabase
      .from('match')
      .select('*')
      .gte('created_at', season.start)
      .lte('created_at', season.end)
      .order('created_at', { ascending: false });
  }, [season?.start, season?.end]);
  const [getMatches, { data: matchesData }] = useSupaQuery(getMatchesCallback);
  const matches = (matchesData as Match[] | null) ?? [];

  useEffect(() => {
    getSeasons();
    getPlayers();
  }, [getSeasons, getPlayers]);

  useEffect(() => {
    if (season) getMatches();
  }, [season, getMatches]);

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
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className={`
                text-sm text-blue-600
                hover:underline
                dark:text-blue-400
              `}
            >
              &larr; Back
            </Link>
            <h1
              className={`
                text-2xl font-bold tracking-tight
                md:text-3xl
              `}
            >
              {season?.name}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setDark((d) => !d)}
            className={`
              cursor-pointer rounded-lg border border-gray-200 bg-white p-1.5 text-base shadow-sm transition-colors
              hover:bg-gray-100
              dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700
            `}
            aria-label="Toggle dark mode"
          >
            {dark ? '\u2600\uFE0F' : '\uD83C\uDF19'}
          </button>
        </header>

        <Leaderboard players={players} streaks={{}} linkToPlayer={false} />

        {players && <SeasonSpotlight players={players} matches={matches} prevPlayers={prevPlayers} />}
      </div>
    </div>
  );
}
