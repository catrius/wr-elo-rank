import type { Match, Player } from '@/types/common.ts';
import dayjs from 'dayjs';

export interface WeekWindow {
  startTs: number;
  endTs: number;
  label: string;
}

export interface PlayerWeekStats {
  player: Player;
  eloDelta: number;
  wins: number;
  losses: number;
  total: number;
}

/** Returns the Mon–Sun week window of the most recent match, or null if no matches. */
export function getWeekWindow(matches: Match[]): WeekWindow | null {
  if (!matches.length) return null;

  // matches are sorted desc, so [0] is most recent
  const d = dayjs(matches[0].created_at);
  const dow = d.day(); // 0=Sun ... 6=Sat
  const daysToMonday = dow === 0 ? 6 : dow - 1;
  const monday = d.subtract(daysToMonday, 'day').startOf('day');
  const sunday = monday.add(6, 'day').endOf('day');

  const today = dayjs();
  const todayDow = today.day();
  const todayDaysToMonday = todayDow === 0 ? 6 : todayDow - 1;
  const thisWeekMonday = today.subtract(todayDaysToMonday, 'day').startOf('day');
  const isCurrentWeek = monday.format('YYYY-MM-DD') === thisWeekMonday.format('YYYY-MM-DD');

  const rangeLabel = `${monday.format('MMM D')}–${sunday.format('MMM D')}`;
  const label = isCurrentWeek ? `This Week · ${rangeLabel}` : `Last Week · ${rangeLabel}`;

  return { startTs: monday.valueOf(), endTs: sunday.valueOf(), label };
}

/** Per-player stats for completed matches within the week window. */
export function computeWeeklyStats(matches: Match[], players: Player[], week: WeekWindow): PlayerWeekStats[] {
  const weekMatches = matches.filter((m) => {
    const ts = new Date(m.created_at).getTime();
    return ts >= week.startTs && ts <= week.endTs && (m.result === 'A' || m.result === 'B');
  });

  const statMap = new Map<number, { eloDelta: number; wins: number; total: number }>();

  weekMatches.forEach((m) => {
    const isAWin = m.result === 'A';

    m.team_a_players.forEach((pid, i) => {
      const s = statMap.get(pid) ?? { eloDelta: 0, wins: 0, total: 0 };
      s.eloDelta += ((m.team_a_new_elos ?? [])[i] ?? 0) - ((m.team_a_elos ?? [])[i] ?? 0);
      if (isAWin) s.wins += 1;
      s.total += 1;
      statMap.set(pid, s);
    });

    m.team_b_players.forEach((pid, i) => {
      const s = statMap.get(pid) ?? { eloDelta: 0, wins: 0, total: 0 };
      s.eloDelta += ((m.team_b_new_elos ?? [])[i] ?? 0) - ((m.team_b_elos ?? [])[i] ?? 0);
      if (!isAWin) s.wins += 1;
      s.total += 1;
      statMap.set(pid, s);
    });
  });

  return Array.from(statMap.entries())
    .map(([pid, s]) => {
      const player = players.find((p) => p.id === pid);
      if (!player) return null;
      return { player, eloDelta: s.eloDelta, wins: s.wins, losses: s.total - s.wins, total: s.total };
    })
    .filter((x): x is PlayerWeekStats => x !== null);
}

/** Count of completed matches within the week window. */
export function countWeekMatches(matches: Match[], week: WeekWindow): number {
  return matches.filter((m) => {
    const ts = new Date(m.created_at).getTime();
    return ts >= week.startTs && ts <= week.endTs && (m.result === 'A' || m.result === 'B');
  }).length;
}

export interface WeeklyDuo {
  playerA: Player;
  playerB: Player;
  wins: number;
  total: number;
}

function pairKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

/** Best and worst duos within the week window. MIN_MATCHES = 2 (lower than season-wide 3). */
export function computeWeeklyChemistry(
  matches: Match[],
  players: Player[],
  week: WeekWindow,
): { good: WeeklyDuo | null; bad: WeeklyDuo | null } {
  const weekMatches = matches.filter((m) => {
    const ts = new Date(m.created_at).getTime();
    return ts >= week.startTs && ts <= week.endTs && (m.result === 'A' || m.result === 'B');
  });

  const duoWins: Record<string, number> = {};
  const duoTotal: Record<string, number> = {};

  weekMatches.forEach((m) => {
    const winnerIds = m.result === 'A' ? m.team_a_players : m.team_b_players;
    const loserIds = m.result === 'A' ? m.team_b_players : m.team_a_players;

    winnerIds.forEach((idA, i) => {
      winnerIds.slice(i + 1).forEach((idB) => {
        const key = pairKey(idA, idB);
        duoWins[key] = (duoWins[key] || 0) + 1;
        duoTotal[key] = (duoTotal[key] || 0) + 1;
      });
    });

    loserIds.forEach((idA, i) => {
      loserIds.slice(i + 1).forEach((idB) => {
        const key = pairKey(idA, idB);
        duoTotal[key] = (duoTotal[key] || 0) + 1;
      });
    });
  });

  const MIN_MATCHES = 2;

  function resolveDuo(key: string, wins: number, total: number): WeeklyDuo | null {
    const [idA, idB] = key.split('-').map(Number);
    const playerA = players.find((p) => p.id === idA);
    const playerB = players.find((p) => p.id === idB);
    if (!playerA || !playerB) return null;
    return { playerA, playerB, wins, total };
  }

  const best = Object.entries(duoTotal).reduce(
    (acc, [key, total]) => {
      if (total < MIN_MATCHES) return acc;
      const wins = duoWins[key] || 0;
      const rate = wins / total;
      return rate > acc.rate || (rate === acc.rate && total > acc.total) ? { key, rate, wins, total } : acc;
    },
    { key: '', rate: -1, wins: 0, total: 0 },
  );

  const worst = Object.entries(duoTotal).reduce(
    (acc, [key, total]) => {
      if (total < MIN_MATCHES) return acc;
      const wins = duoWins[key] || 0;
      const rate = wins / total;
      return rate < acc.rate || (rate === acc.rate && total > acc.total) ? { key, rate, wins, total } : acc;
    },
    { key: '', rate: 2, wins: 0, total: 0 },
  );

  return {
    good: best.key ? resolveDuo(best.key, best.wins, best.total) : null,
    bad: worst.key && worst.key !== best.key ? resolveDuo(worst.key, worst.wins, worst.total) : null,
  };
}
