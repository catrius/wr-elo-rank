import { PEST_CAUSE_KIND } from '@/constants/garden.ts';
import type { Player, Match } from '@/types/common.ts';
import { computeStreaks, type Streak } from '@/utils/streaks.ts';

export type GardenStage = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type WeatherState = 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'blizzard';
export type PestKind = 'locust' | 'butterfly' | 'beetle' | 'wasp';
export type PestCause = 'winrate' | 'ice' | 'decay';

// A pest on the canopy: which species, and where it sits in the tree's box (0–1 of the sprite's
// width/height, origin top-left) so placement scales with the stage sprite. `seed` is a stable 0–1
// value unique to this bug, which the renderer expands into its own wander path — without it every
// pest would share one keyframe and the swarm would move in visible lockstep.
export interface Pest {
  kind: PestKind;
  x: number;
  y: number;
  seed: number;
}

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
  causes: PestCause[];
  pests: Pest[];
}

// A tree gets infested — bugs crawling over an otherwise healthy canopy — for the high-volume grinder:
// someone who has played enough games to grow a big tree yet whose season win rate stays poor. Growth
// (stage) is win-count based, so these causes are what separate a genuinely strong player from one who
// just shows up a lot. Each cause attracts its own species (see PEST_CAUSE_KIND).
export const PEST_MIN_GAMES = 20;
export const PEST_WINRATE_MAX = 45; // percent
// An ice streak this long (or longer) draws pests regardless of season totals.
export const PEST_ICE_STREAK_MIN = 5;

export function getPestCauses(
  seasonTotal: number,
  winRate: number,
  streak: Streak | null,
  isDecaying: boolean,
): PestCause[] {
  const causes: PestCause[] = [];
  if (seasonTotal >= PEST_MIN_GAMES && winRate < PEST_WINRATE_MAX) causes.push('winrate');
  if (streak?.type === 'ice' && streak.count >= PEST_ICE_STREAK_MIN) causes.push('ice');
  if (isDecaying) causes.push('decay');
  return causes;
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

// How crowded an infestation can get, per stage — a seed has no canopy to hide a swarm in
const PEST_COUNT_BY_STAGE: Record<GardenStage, number> = { 1: 1, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 6 };
// Fraction of the stage's capacity used, by number of causes — one bad signal is a light infestation,
// all three fills the canopy. Indexed by causes.length - 1.
const PEST_SEVERITY: number[] = [0.5, 0.8, 1];
// Two or more simultaneous causes summon firewasps on top of the species each cause brings
export const PEST_WASP_MIN_CAUSES = 2;

// Deterministic 0–1 hash → the same player always gets the same swarm arrangement, so the scene
// doesn't reshuffle on every render while still differing between players. Kept to modular arithmetic
// (no bitwise ops) per the lint config. Two rounds with different multipliers are needed: a single
// Lehmer step maps consecutive inputs to near-identical outputs (1, 2, 3 → 0.0000225, 0.0000449, …),
// which made per-pest motion derived from adjacent seeds come out nearly identical.
function hashSeed(n: number): number {
  const a = ((n + 1) * 48271) % 2147483647;
  const b = ((a + 0x9e3779b9) * 16807) % 2147483647;
  return (b % 1000003) / 1000003;
}

// Golden-angle (sunflower) placement inside the canopy ellipse: evenly spreads any number of pests
// without them clumping, so no overlap test is needed.
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const CANOPY_CX = 0.5;
const CANOPY_CY = 0.34;
const CANOPY_RX = 0.34;
const CANOPY_RY = 0.26;

export function buildPests(causes: PestCause[], stage: GardenStage, playerId: number): Pest[] {
  if (causes.length === 0) return [];

  const kinds = causes.map((c) => PEST_CAUSE_KIND[c]);
  if (causes.length >= PEST_WASP_MIN_CAUSES) kinds.push('wasp');

  // More causes means a worse infestation, scaled to what the canopy can hold. At least one bug per
  // species so every active cause is visible, and always at least one bug overall.
  const capacity = PEST_COUNT_BY_STAGE[stage];
  const severity = PEST_SEVERITY[Math.min(causes.length, PEST_SEVERITY.length) - 1];
  const total = Math.max(Math.min(kinds.length, capacity), Math.round(capacity * severity), 1);
  const spin = hashSeed(playerId) * Math.PI * 2;

  return Array.from({ length: total }, (_, i) => {
    const r = Math.sqrt((i + 0.5) / total);
    const angle = i * GOLDEN_ANGLE + spin;
    return {
      // Cycle the species so a multi-cause swarm visibly mixes rather than grouping by cause
      kind: kinds[i % kinds.length],
      x: clamp(CANOPY_CX + r * Math.cos(angle) * CANOPY_RX, 0.04, 0.96),
      y: clamp(CANOPY_CY + r * Math.sin(angle) * CANOPY_RY, 0.02, 0.72),
      // Offset the index so two players' first bugs don't share a seed
      seed: hashSeed(playerId * 31 + i * 7 + 1),
    };
  });
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
  const stage = getGrowthStage(player.win);
  const causes = getPestCauses(player.total, breakdown.winRate, streak, player.is_decaying);
  return { stage, weather, breakdown, causes, pests: buildPests(causes, stage, playerId) };
}
