import type { FloraKind, GardenStage, PestCause, PestKind, WeatherState } from '@/utils/garden.ts';

export const STAGE_NAMES: Record<GardenStage, string> = {
  1: 'Seed',
  2: 'Sprout',
  3: 'Sapling',
  4: 'Young Tree',
  5: 'Leafy',
  6: 'Mature',
  7: 'Grand',
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
  // Blizzard's night tone is a pale slate rather than a near-black like stormy's: it's the only weather
  // whose tint is meant to *lift* the night sky into a snow haze, not darken it further. With a darker
  // tone the heavy alpha below just deepened the starfield, which read as plain night, not a whiteout.
  blizzard: ['#9ca3af', '#7c8ba1'],
};

// 2-digit hex alpha for the weather tint layered over the sky image — heavier for bad weather
export const WEATHER_TINT: Record<WeatherState, string> = {
  sunny: '33',
  cloudy: '4d',
  rainy: '73',
  stormy: '8c',
  blizzard: 'a6',
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

// Width/height ratio of each stage sprite. The tree renders at STAGE_HEIGHTS with width derived from
// this, so the pest overlay can be sized to exactly the tree's box without measuring the loaded image.
export const STAGE_ASPECT: Record<GardenStage, number> = {
  1: 168 / 152,
  2: 28 / 24,
  3: 256 / 208,
  4: 128 / 152,
  5: 96 / 128,
  6: 184 / 252,
  7: 192 / 348,
  8: 180 / 332,
};

// ── Garden bed geometry ────────────────────────────────────────────────────────────────────────
// The scene is a lawn receding to a horizon rather than a flat 48px strip, so flora can be placed in
// depth. `lawn.png` is baked at exactly DESIGN_W × LAWN_H (see assets/garden/lawn/generate.py) and
// lands 1:1 on the stage; LAWN_TOP is therefore just the design height minus the slab.
export const LAWN_H = 112;
export const LAWN_TOP = DESIGN_H - LAWN_H;
// Where along the lawn's depth the tree is planted. Everything with a smaller depth draws behind it.
export const TREE_DEPTH = 0.4;
// A few px of overhang so a plant's roots sit *in* the grass rather than balancing on the horizon line
export const LAWN_LIP = 6;

// Maps a 0–1 depth to its baseline y in design px. Plants at depth 1 hang slightly off the bottom
// edge, which crops them and sells them as being nearest the viewer.
export function depthToY(depth: number): number {
  return LAWN_TOP + LAWN_LIP + depth * (DESIGN_H - LAWN_TOP + 8);
}

// Flora sprites (Pixel Art Flower Pack). `h` is the display height in design px at full depth —
// authored per species rather than derived, since a lily should tower over a daisy cluster. Widths
// come from the sprite's own aspect ratio at render time.
export const FLORA_SPRITES: Record<FloraKind, { src: string; aspect: number; h: number }> = {
  daisy: { src: '/garden/flora/daisy-blue.png', aspect: 17 / 30, h: 18 },
  aster: { src: '/garden/flora/aster-purple.png', aspect: 17 / 32, h: 19 },
  poppy: { src: '/garden/flora/poppy-yellow.png', aspect: 15 / 29, h: 17 },
  lily: { src: '/garden/flora/lily-orange.png', aspect: 28 / 43, h: 26 },
  clusterPink: { src: '/garden/flora/cluster-pink.png', aspect: 29 / 18, h: 13 },
  clusterYellow: { src: '/garden/flora/cluster-yellow.png', aspect: 29 / 17, h: 13 },
  bush: { src: '/garden/flora/bush-green.png', aspect: 45 / 30, h: 26 },
  bushDry: { src: '/garden/flora/bush-dry.png', aspect: 45 / 30, h: 26 },
  bed: { src: '/garden/flora/bed-pink.png', aspect: 68 / 27, h: 24 },
};

// The species a healthy garden draws from. Repeats act as weights — small blooms should outnumber
// the bulky bushes and beds, or the lawn reads as overgrown rather than planted.
export const FLORA_POOL: FloraKind[] = [
  'daisy',
  'daisy',
  'aster',
  'aster',
  'poppy',
  'poppy',
  'clusterPink',
  'clusterYellow',
  'lily',
  'bush',
  'bed',
];

// How many plants a garden holds at each stage — the bed fills in as the tree grows, so progress
// shows across the whole scene instead of only in the tree's height
export const FLORA_COUNT_BY_STAGE: Record<GardenStage, number> = {
  1: 5,
  2: 8,
  3: 11,
  4: 14,
  5: 17,
  6: 20,
  7: 23,
  8: 26,
};

// Bad weather thins the beds — blooms close up and die back, so the lawn empties out as form drops
export const FLORA_WEATHER_MULT: Record<WeatherState, number> = {
  sunny: 1,
  cloudy: 0.85,
  rainy: 0.7,
  stormy: 0.5,
  blizzard: 0.3,
};

// Fraction of bushes that dry out while the tree is infested — the pests spread past the canopy
export const FLORA_DRY_SHARE = 0.6;

// Ground lighting per weather, as a CSS filter applied to the whole garden bed (lawn, dressing, and
// flora together). Without it the lawn stayed in full daylight under the night skies, and the scene
// read as two unrelated halves. Kept as one filter over the whole bed so nothing lights differently
// than what's next to it. `sat` also drains colour, since the beds should look cold, not just dark.
export const GROUND_LIGHT: Record<WeatherState, { brightness: number; sat: number }> = {
  sunny: { brightness: 1, sat: 1 },
  cloudy: { brightness: 0.92, sat: 0.94 },
  rainy: { brightness: 0.82, sat: 0.85 },
  stormy: { brightness: 0.68, sat: 0.7 },
  // Brighter than stormy despite being the worse state, to match its sky: blizzard's tint lifts the
  // night sky into a pale haze (see SKY_COLORS), so a darker ground would sit oddly under a lighter
  // sky. The heavy desaturation is what carries "frozen" here, not the brightness.
  blizzard: { brightness: 0.78, sat: 0.45 },
};

// Static set dressing: climbing-rose trellises standing at the horizon, giving the garden a cultivated
// backdrop and a bit of vertical framing. Positions are design px; `bottom` is measured up from the
// design floor. Deliberately all at the horizon — potted plants in the near corners were tried and cut,
// since the card's edge crops them and a half-pot reads as pasted onto the scene rather than in it.
export const GARDEN_PROPS: { src: string; aspect: number; h: number; left: number; bottom: number; dim: number }[] = [
  { src: '/garden/flora/trellis-warm.png', aspect: 58 / 104, h: 88, left: 20, bottom: LAWN_H - 6, dim: 0.8 },
  { src: '/garden/flora/trellis-pink.png', aspect: 58 / 104, h: 80, left: 400, bottom: LAWN_H - 6, dim: 0.8 },
];

// Hedge running along the horizon, tiled from the bush sprite at a dimmed, distant scale
export const HEDGE_H = 16;
export const HEDGE_DIM = 0.68;

// Pest sprite strips (Foozle "Spire" flying enemy pack, Idle/Side rows extracted to a single row each).
// `faces` is the direction the artwork points at rest — a bug placed on the far side of the trunk is
// mirrored so it always looks in toward the tree. `rel` scales a kind against the shared pest size.
export const PEST_SPRITES: Record<
  PestKind,
  { src: string; frames: number; cellW: number; cellH: number; faces: 'left' | 'right'; rel: number }
> = {
  locust: { src: '/garden/pests/locust.png', frames: 12, cellW: 40, cellH: 47, faces: 'right', rel: 1 },
  butterfly: { src: '/garden/pests/butterfly.png', frames: 6, cellW: 38, cellH: 56, faces: 'right', rel: 0.95 },
  beetle: { src: '/garden/pests/beetle.png', frames: 8, cellW: 48, cellH: 42, faces: 'left', rel: 1.05 },
  wasp: { src: '/garden/pests/wasp.png', frames: 12, cellW: 56, cellH: 54, faces: 'left', rel: 1.25 },
};

// Each wither condition attracts its own species, so the swarm reads as a diagnosis
export const PEST_CAUSE_KIND: Record<PestCause, PestKind> = {
  winrate: 'locust',
  ice: 'butterfly',
  decay: 'beetle',
};

export const PEST_NAMES: Record<PestKind, string> = {
  locust: 'Locusts',
  butterfly: 'Void butterflies',
  beetle: 'Clampbeetles',
  wasp: 'Firewasps',
};

export const PEST_ROWS: { cause: PestCause; condition: string; trigger: string }[] = [
  { cause: 'winrate', condition: 'Low win rate', trigger: '20+ games, <45% win rate' },
  { cause: 'ice', condition: 'Ice streak', trigger: '5+ losses in a row' },
  { cause: 'decay', condition: 'Neglect', trigger: 'Inactive for too long' },
];
