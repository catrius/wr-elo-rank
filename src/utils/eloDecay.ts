import dayjs from 'dayjs';
import type { Match, Player } from '../types/common.ts';

export interface DecayResult {
  player: Player;
  weeksInactive: number;
  deduction: number;
}

function weekStart(d: dayjs.Dayjs): dayjs.Dayjs {
  const dow = d.day(); // 0=Sun … 6=Sat
  const daysToMonday = dow === 0 ? 6 : dow - 1;
  return d.subtract(daysToMonday, 'day').startOf('day');
}

/**
 * Returns players eligible for a -10 Elo deduction this run.
 * Grace rule: decay starts on the second consecutive missed week.
 *   weeksInactive=1 → grace, no deduction
 *   weeksInactive=2 → -10 (first deduction)
 *   weeksInactive=3 → -10 (second deduction), etc.
 *
 * @param players All active (non-hidden) players
 * @param matches All completed matches (result 'A' or 'B')
 * @param now     Injectable for testing; defaults to today
 */
export function findDecayPlayers(players: Player[], matches: Match[], now: Date = new Date()): DecayResult[] {
  const thisWeekMonday = weekStart(dayjs(now));

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

    const weeksInactive = thisWeekMonday.diff(weekStart(dayjs(lastTs)), 'week');
    if (weeksInactive < 2) return [];

    return [{ player, weeksInactive, deduction: 10 }];
  });
}
