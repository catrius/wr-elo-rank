import type { Match } from '@/types/common.ts';

const STREAK_THRESHOLD = 3;

export interface Streak {
  type: 'fire' | 'ice';
  count: number;
}

export function computeStreaks(matches: Match[]): Record<number, Streak> {
  const finished = matches.filter((m) => m.result === 'A' || m.result === 'B');

  const winStreaks: Record<number, number> = {};
  const lossStreaks: Record<number, number> = {};

  finished.forEach((m) => {
    const winners = m.result === 'A' ? m.team_a_players : m.team_b_players;
    const losers = m.result === 'A' ? m.team_b_players : m.team_a_players;

    winners.forEach((id) => {
      winStreaks[id] = (winStreaks[id] ?? 0) + 1;
      lossStreaks[id] = 0;
    });
    losers.forEach((id) => {
      lossStreaks[id] = (lossStreaks[id] ?? 0) + 1;
      winStreaks[id] = 0;
    });
  });

  const result: Record<number, Streak> = {};
  Object.entries(winStreaks).forEach(([id, count]) => {
    if (count >= STREAK_THRESHOLD) result[Number(id)] = { type: 'fire', count };
  });
  Object.entries(lossStreaks).forEach(([id, count]) => {
    if (count >= STREAK_THRESHOLD) result[Number(id)] = { type: 'ice', count };
  });
  return result;
}
