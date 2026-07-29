import type { Player, Match } from '@/types/common.ts';

export const INITIAL_ELO = 1500;

// Most-recent-5 W/L results per player, drawn from the given (already date-desc) match list.
export function buildLast5(matches: Match[], players: Player[]): Map<number, ('W' | 'L')[]> {
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
