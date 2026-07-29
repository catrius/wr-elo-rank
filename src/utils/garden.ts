import type { Player, Match } from '@/types/common.ts';
import { computeStreaks, type Streak } from '@/utils/streaks.ts';

export type GardenStage = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type WeatherState = 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'blizzard';

export interface WeatherBreakdown {
  streakValue: number;
  streakScore: number;
  recentWins: number;
  recentTotal: number;
  recentForm: number;
  winRate: number;
  healthScore: number;
}

export interface GardenState {
  stage: GardenStage;
  weather: WeatherState;
  breakdown: WeatherBreakdown;
  dried: boolean;
}

// A tree turns "dried" (bare/withered sprites) for the high-volume grinder: someone who has played
// enough games to grow a big tree yet whose season win rate stays poor. Growth (stage) is win-count
// based, so this flag is what separates a genuinely strong player from one who just shows up a lot.
export const DRIED_MIN_GAMES = 20;
export const DRIED_WINRATE_MAX = 45; // percent
// An ice streak this long (or longer) withers the tree regardless of season totals.
export const DRIED_ICE_STREAK_MIN = 5;
export function isDried(seasonTotal: number, winRate: number, streak: Streak | null, isDecaying: boolean): boolean {
  if (seasonTotal >= DRIED_MIN_GAMES && winRate < DRIED_WINRATE_MAX) return true;
  if (streak?.type === 'ice' && streak.count >= DRIED_ICE_STREAK_MIN) return true;
  if (isDecaying) return true;
  return false;
}

// Calibrated from 2026S1 + 2026S2 win distributions (29 player-seasons combined)
const STAGE_THRESHOLDS: [number, GardenStage][] = [
  [82, 8],
  [71, 7],
  [60, 6],
  [45, 5],
  [30, 4],
  [15, 3],
  [3, 2],
  [0, 1],
];

export function getGrowthStage(seasonWins: number): GardenStage {
  return STAGE_THRESHOLDS.find(([threshold]) => seasonWins >= threshold)?.[1] ?? 1;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function getWeatherState(
  streak: Streak | null,
  recentMatches: Match[],
  playerId: number,
  seasonWins: number,
  seasonTotal: number,
): { weather: WeatherState; breakdown: WeatherBreakdown } {
  const streakValue = streak ? (streak.type === 'fire' ? streak.count : -streak.count) : 0;
  const streakScore = 50 + clamp(streakValue * 10, -50, 50);

  const recentCompleted = recentMatches.filter((m) => m.result === 'A' || m.result === 'B').slice(0, 5);
  const recentWins = recentCompleted.filter((m) => {
    const onTeamA = m.team_a_players.includes(playerId);
    return (onTeamA && m.result === 'A') || (!onTeamA && m.result === 'B');
  }).length;
  const recentForm = recentCompleted.length > 0 ? (recentWins / recentCompleted.length) * 100 : 50;

  const winRate = seasonTotal > 0 ? (seasonWins / seasonTotal) * 100 : 50;

  const healthScore = streakScore * 0.35 + recentForm * 0.4 + winRate * 0.25;

  let weather: WeatherState;
  if (healthScore >= 80) weather = 'sunny';
  else if (healthScore >= 60) weather = 'cloudy';
  else if (healthScore >= 40) weather = 'rainy';
  else if (healthScore >= 20) weather = 'stormy';
  else weather = 'blizzard';

  return {
    weather,
    breakdown: {
      streakValue,
      streakScore,
      recentWins,
      recentTotal: recentCompleted.length,
      recentForm,
      winRate,
      healthScore,
    },
  };
}

export function computeGardenState(player: Player, matches: Match[], playerId: number): GardenState {
  const completed = matches
    .filter((m) => m.result === 'A' || m.result === 'B')
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const streaks = computeStreaks([...completed].reverse());
  const streak = streaks[playerId] ?? null;

  const { weather, breakdown } = getWeatherState(streak, completed, playerId, player.win, player.total);
  const dried = isDried(player.total, breakdown.winRate, streak, player.is_decaying);
  return { stage: getGrowthStage(player.win), weather, breakdown, dried };
}
