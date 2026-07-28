import { useCallback } from 'react';
import supabase from '@/lib/supabase.ts';
import type { Player, Match } from '@/types/common.ts';
import { calculateMatchResult, calculateRevertedPlayers } from '@/utils/elo.ts';

export default function useMatchActions(players: Player[] | null, refresh: () => void) {
  const endMatch = useCallback(
    async (match: Match, result: 'A' | 'B') => {
      if (!players) return;
      const { teamANewElos, teamBNewElos, updatedAPlayers, updatedBPlayers } = calculateMatchResult(
        match,
        result,
        players,
      );

      await supabase
        .from('match')
        .update({ result, team_a_new_elos: teamANewElos, team_b_new_elos: teamBNewElos })
        .eq('id', match.id);

      await supabase
        .from('player')
        .upsert([...updatedAPlayers, ...updatedBPlayers].map((p) => ({ ...p, is_decaying: false })));

      refresh();
    },
    [players, refresh],
  );

  const revertMatch = useCallback(
    async (match: Match) => {
      if (!(match.result === 'A' || match.result === 'B') || !match.team_a_new_elos || !match.team_b_new_elos) {
        return;
      }

      // eslint-disable-next-line no-alert
      if (!window.confirm('Are you sure you want to revert this match?')) {
        return;
      }

      if (!players) return;
      const { updatedAPlayers, updatedBPlayers } = calculateRevertedPlayers(match, players);

      await supabase.from('match').update({ result: 'Reverted' }).eq('id', match.id);
      await supabase.from('player').upsert([...updatedAPlayers, ...updatedBPlayers]);

      refresh();
    },
    [players, refresh],
  );

  const cancelMatch = useCallback(
    async (match: Match) => {
      await supabase.from('match').update({ result: 'Cancelled' }).eq('id', match.id);
      refresh();
    },
    [refresh],
  );

  return { endMatch, revertMatch, cancelMatch };
}
