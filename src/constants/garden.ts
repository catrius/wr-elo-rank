import type { GardenStage, WeatherState } from '@/utils/garden.ts';

export const STAGE_NAMES: Record<GardenStage, string> = {
  1: 'Seed',
  2: 'Sprout',
  3: 'Sapling',
  4: 'Young Tree',
  5: 'Leafy',
  6: 'Flowering',
  7: 'Fruiting',
  8: 'Ancient',
};

export const WEATHER_EMOJI: Record<WeatherState, string> = {
  sunny: '☀️',
  cloudy: '⛅',
  rainy: '🌧️',
  stormy: '⛈️',
  blizzard: '❄️',
};

export const SKY_COLORS: Record<WeatherState, [string, string]> = {
  // [light, dark]
  sunny: ['#fef9c3', '#78350f'],
  cloudy: ['#e2e8f0', '#334155'],
  rainy: ['#bfdbfe', '#1e3a5f'],
  stormy: ['#94a3b8', '#0f172a'],
  blizzard: ['#9ca3af', '#1e293b'],
};

// 2-digit hex alpha for the weather tint layered over the sky image — heavier for bad weather
export const WEATHER_TINT: Record<WeatherState, string> = {
  sunny: '33',
  cloudy: '4d',
  rainy: '73',
  stormy: 'a6',
  blizzard: '80',
};

// Which painted sky each weather uses — good form gets the day sky, bad form the night sky
export const SKY_IMAGE: Record<WeatherState, 'day' | 'night'> = {
  sunny: 'day',
  cloudy: 'day',
  rainy: 'day',
  stormy: 'night',
  blizzard: 'night',
};

// Display height (px) for each stage — creates a visible growth progression in the 320px card
export const STAGE_HEIGHTS: Record<GardenStage, number> = {
  1: 26,
  2: 30,
  3: 52,
  4: 80,
  5: 120,
  6: 150,
  7: 185,
  8: 215,
};

// Base shadow width (px) per stage — bigger trees cast wider shadows on the grass
export const SHADOW_WIDTHS: Record<GardenStage, number> = {
  1: 16,
  2: 18,
  3: 26,
  4: 44,
  5: 60,
  6: 76,
  7: 92,
  8: 108,
};

// Sway duration (seconds) per stage — larger trees sway slower for a "weight" feel
export const SWAY_DURATION: Record<GardenStage, number> = {
  1: 2.0,
  2: 2.2,
  3: 2.4,
  4: 3.0,
  5: 3.5,
  6: 4.0,
  7: 4.5,
  8: 5.0,
};

// Stormy/blizzard weather speeds the sway up dramatically
export const WEATHER_SWAY_MULT: Record<WeatherState, number> = {
  sunny: 1.0,
  cloudy: 1.0,
  rainy: 0.75,
  stormy: 0.5,
  blizzard: 0.35,
};

export const STAGE_ROWS: { stage: GardenStage; wins: string }[] = [
  { stage: 1, wins: '0+' },
  { stage: 2, wins: '3+' },
  { stage: 3, wins: '15+' },
  { stage: 4, wins: '30+' },
  { stage: 5, wins: '45+' },
  { stage: 6, wins: '60+' },
  { stage: 7, wins: '71+' },
  { stage: 8, wins: '82+' },
];

export const WEATHER_ROWS: { weather: WeatherState; score: string; description: string }[] = [
  { weather: 'sunny', score: '80–100', description: 'Playing well across the board' },
  { weather: 'cloudy', score: '60–79', description: 'Decent but not outstanding' },
  { weather: 'rainy', score: '40–59', description: 'Mixed or average form' },
  { weather: 'stormy', score: '20–39', description: 'Struggling' },
  { weather: 'blizzard', score: '0–19', description: 'Frozen solid — brutal form' },
];

// Fixed design size the garden scene is laid out at (3:2). Everything inside is authored against these
// dimensions, then a single transform scales the whole stage to whatever width the card renders at.
export const DESIGN_W = 480;
export const DESIGN_H = 320;
