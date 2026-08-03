import type { Match, Player } from '../types/common.ts';

/** A player decays once this many whole days have passed since their last completed match. */
export const DECAY_AFTER_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface DecayResult {
  player: Player;
  daysInactive: number;
  deduction: number;
}

/**
 * Returns players eligible for a -10 Elo deduction this run.
 * A player decays once they have not played a completed match for
 * DECAY_AFTER_DAYS (14) whole days — measured from the actual last-match
 * timestamp, so a single missed play-week is still within grace.
 *
 * @param players All active (non-hidden) players
 * @param matches All completed matches (result 'A' or 'B')
 * @param now     Injectable for testing; defaults to today
 */
export function findDecayPlayers(players: Player[], matches: Match[], now: Date = new Date()): DecayResult[] {
  const nowMs = now.getTime();

  const lastPlayedMs = new Map<number, number>();
  matches
    .filter((m) => m.result === 'A' || m.result === 'B')
    .forEach((m) => {
      const ts = new Date(m.created_at).getTime();
      [...m.team_a_players, ...m.team_b_players].forEach((pid) => {
        if (ts > (lastPlayedMs.get(pid) ?? 0)) lastPlayedMs.set(pid, ts);
      });
    });

  return players.flatMap((player) => {
    const lastTs = lastPlayedMs.get(player.id);
    if (!lastTs) return [];

    const daysInactive = Math.floor((nowMs - lastTs) / DAY_MS);
    if (daysInactive < DECAY_AFTER_DAYS) return [];

    return [{ player, daysInactive, deduction: 10 }];
  });
}
