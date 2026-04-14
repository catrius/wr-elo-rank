import { useCallback, useEffect, useMemo } from 'react';
import supabase from '@/lib/supabase.ts';
import useSupaQuery from '@/hooks/useSupaQuery.ts';
import type { Player, Match, Pairing, Season } from '@/types/common.ts';
import { computeStreaks } from '@/utils/streaks.ts';

export default function useGameData() {
  const getPlayersCallback = useCallback(
    async () => supabase.from('player').select().order('elo', { ascending: false }),
    [],
  );
  const [getPlayers, { data: playerData }] = useSupaQuery(getPlayersCallback);
  const players = playerData as Player[] | null;

  const getAllMatchesCallback = useCallback(
    async () => supabase.from('match').select('*').order('created_at', { ascending: false }),
    [],
  );
  const [getAllMatches, { data: allMatchesData }] = useSupaQuery(getAllMatchesCallback);

  const getPairingsCallback = useCallback(
    async () => supabase.from('pairing').select().order('created_at', { ascending: true }),
    [],
  );
  const [getPairings, { data: pairingsData }] = useSupaQuery(getPairingsCallback);
  const pairings = pairingsData as Pairing[] | null;

  const getSeasonsCallback = useCallback(
    async () => supabase.from('season').select('id, name, end, start').order('created_at', { ascending: false }),
    [],
  );
  const [getSeasons, { data: seasonsData }] = useSupaQuery(getSeasonsCallback);
  const seasons = seasonsData as Pick<Season, 'id' | 'name' | 'end' | 'start'>[] | null;

  const currentSeason = useMemo(() => seasons?.find((s) => !s.end) ?? null, [seasons]);

  const allMatches = useMemo(() => {
    const raw = allMatchesData as Match[] | null;
    if (!raw || !currentSeason?.start) return raw;
    return raw.filter((m) => m.created_at >= currentSeason.start!);
  }, [allMatchesData, currentSeason]);

  const matches = useMemo(() => allMatches?.slice(0, 10) ?? null, [allMatches]);

  const streaks = useMemo(() => (allMatches ? computeStreaks(allMatches) : {}), [allMatches]);

  const refresh = useCallback(() => {
    getPlayers();
    getAllMatches();
    getPairings();
    getSeasons();
  }, [getAllMatches, getPairings, getPlayers, getSeasons]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { players, allMatches, matches, pairings, seasons, currentSeason, streaks, refresh };
}
