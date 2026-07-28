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
  return { stage: getGrowthStage(player.win), weather, breakdown };
}
