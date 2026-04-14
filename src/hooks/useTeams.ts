import { useCallback, useEffect, useMemo, useState } from 'react';
import { meanBy } from 'es-toolkit';
import { some } from 'es-toolkit/compat';
import supabase from '@/lib/supabase.ts';
import useSupaQuery from '@/hooks/useSupaQuery.ts';
import type { Player, Match, Pairing } from '@/types/common.ts';
import { findTeams } from '@/utils/suggestTeams.ts';

export default function useTeams(players: Player[] | null, matches: Match[] | null, pairings: Pairing[] | null) {
  const [teamA, setTeamA] = useState<Player[]>([]);
  const [teamB, setTeamB] = useState<Player[]>([]);
  const [availableIds, setAvailableIds] = useState<number[]>([]);
  const [dragging, setDragging] = useState<{ player: Player; from: 'A' | 'B' } | null>(null);

  const handleDragStart = useCallback(
    (player: Player, from: 'A' | 'B') => (e: any) => {
      // Set some data to satisfy HTML5 DnD requirements
      try {
        e.dataTransfer?.setData('text/plain', String(player.id));
      } catch {
        /* empty */
      }
      setDragging({ player, from });
    },
    [],
  );

  const handleDragOverPanel = useCallback((e: any) => {
    // Necessary to allow dropping
    e.preventDefault();
  }, []);

  const handleDropTo = useCallback(
    (to: 'A' | 'B') => (e: any) => {
      e.preventDefault();
      if (!dragging) return;
      if (dragging.from === to) return; // no-op if dropped back to same team

      if (to === 'A') {
        setTeamB((prev) => prev.filter((p) => p.id !== dragging.player.id));
        setTeamA((prev) => (prev.some((p) => p.id === dragging.player.id) ? prev : [...prev, dragging.player]));
      } else {
        setTeamA((prev) => prev.filter((p) => p.id !== dragging.player.id));
        setTeamB((prev) => (prev.some((p) => p.id === dragging.player.id) ? prev : [...prev, dragging.player]));
      }

      setDragging(null);
    },
    [dragging],
  );

  const averageTeamAElos = useMemo(() => Math.round(meanBy(teamA, (player) => player.elo)), [teamA]);
  const averageTeamBElos = useMemo(() => Math.round(meanBy(teamB, (player) => player.elo)), [teamB]);
  const eloDiff = useMemo(() => Math.abs(averageTeamAElos - averageTeamBElos), [averageTeamAElos, averageTeamBElos]);

  const available = useMemo(() => {
    if (!players) return [];
    return players.filter((p) => availableIds.includes(p.id));
  }, [availableIds, players]);

  const disabledStart = useMemo(
    () =>
      available.length % 2 === 1 ||
      some(matches, (match) => !match.result) ||
      teamA.length === 0 ||
      teamB.length === 0 ||
      teamA.length !== teamB.length,
    [available.length, matches, teamA.length, teamB.length],
  );

  const disabledSuggest = useMemo(() => availableIds.length < 2, [availableIds.length]);

  const newMatch = useMemo(
    () =>
      ({
        team_a_elos: teamA.map((player) => player.elo),
        team_a_players: teamA.map((player) => player.id),
        team_b_elos: teamB.map((player) => player.elo),
        team_b_players: teamB.map((player) => player.id),
      }) as Match,
    [teamA, teamB],
  );

  const createMatchCallback = useCallback(async () => supabase.from('match').insert([newMatch]), [newMatch]);
  const [createMatch] = useSupaQuery(createMatchCallback);

  const toggleAvailable = useCallback((id: number) => {
    setAvailableIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const lastMatch = useCallback(
    (match?: Match) => {
      const lastMatchData = match || matches?.[0];
      const lastTeamA = players?.filter((player) => lastMatchData?.team_a_players.includes(player.id));
      const lastTeamB = players?.filter((player) => lastMatchData?.team_b_players.includes(player.id));

      setAvailableIds([...(lastMatchData?.team_a_players || []), ...(lastMatchData?.team_b_players || [])]);

      setTeamA(lastTeamA || []);
      setTeamB(lastTeamB || []);
    },
    [matches, players],
  );

  const suggestTeams = useCallback(
    (tolerance = 20) => {
      if (!players) return;
      const { teamA: a, teamB: b } = findTeams(available, pairings, tolerance);
      setTeamA(a);
      setTeamB(b);
    },
    [available, pairings, players],
  );

  useEffect(() => {
    suggestTeams(0);
  }, [suggestTeams]);

  return {
    teamA,
    teamB,
    availableIds,
    averageTeamAElos,
    averageTeamBElos,
    eloDiff,
    disabledStart,
    disabledSuggest,
    handleDragStart,
    handleDragOverPanel,
    handleDropTo,
    toggleAvailable,
    suggestTeams,
    lastMatch,
    createMatch,
  };
}
