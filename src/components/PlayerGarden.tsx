import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Player, Match } from '@/types/common.ts';
import { computeGardenState, type GardenStage, type WeatherState } from '@/utils/garden.ts';

interface Props {
  player: Player;
  matches: Match[];
  playerId: number;
  isAdmin?: boolean;
}

const STAGE_NAMES: Record<GardenStage, string> = {
  1: 'Seed',
  2: 'Sprout',
  3: 'Sapling',
  4: 'Young Tree',
  5: 'Leafy',
  6: 'Flowering',
  7: 'Fruiting',
  8: 'Ancient',
};

const WEATHER_EMOJI: Record<WeatherState, string> = {
  sunny: '☀️',
  cloudy: '⛅',
  rainy: '🌧️',
  stormy: '⛈️',
  blizzard: '❄️',
};

const SKY_COLORS: Record<WeatherState, [string, string]> = {
  // [light, dark]
  sunny: ['#fef9c3', '#78350f'],
  cloudy: ['#e2e8f0', '#334155'],
  rainy: ['#bfdbfe', '#1e3a5f'],
  stormy: ['#94a3b8', '#0f172a'],
  blizzard: ['#9ca3af', '#1e293b'],
};

// 2-digit hex alpha for the weather tint layered over the sky image — heavier for bad weather
const WEATHER_TINT: Record<WeatherState, string> = {
  sunny: '33',
  cloudy: '4d',
  rainy: '73',
  stormy: 'a6',
  blizzard: '80',
};

// Which painted sky each weather uses — good form gets the day sky, bad form the night sky
const SKY_IMAGE: Record<WeatherState, 'day' | 'night'> = {
  sunny: 'day',
  cloudy: 'day',
  rainy: 'day',
  stormy: 'night',
  blizzard: 'night',
};

// Display height (px) for each stage — creates a visible growth progression in the 320px card
const STAGE_HEIGHTS: Record<GardenStage, number> = {
  1: 36,
  2: 44,
  3: 44,
  4: 80,
  5: 120,
  6: 150,
  7: 185,
  8: 215,
};

// Base shadow width (px) per stage — bigger trees cast wider shadows on the grass
const SHADOW_WIDTHS: Record<GardenStage, number> = {
  1: 22,
  2: 26,
  3: 26,
  4: 44,
  5: 60,
  6: 76,
  7: 92,
  8: 108,
};

// Sway duration (seconds) per stage — larger trees sway slower for a "weight" feel
const SWAY_DURATION: Record<GardenStage, number> = {
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
const WEATHER_SWAY_MULT: Record<WeatherState, number> = {
  sunny: 1.0,
  cloudy: 1.0,
  rainy: 0.75,
  stormy: 0.5,
  blizzard: 0.35,
};

// Negative delays start each drop mid-flight, so none sit frozen at the box edge and positions are randomized
const RAIN_DROPS_15 = Array.from({ length: 15 }, (_, i) => ({
  id: i,
  left: `${(i / 15) * 100 + Math.sin(i * 1.7) * 5}%`,
  dur: `${0.9 + (i % 5) * 0.12}s`,
  delay: `-${(i * 137) % 1500}ms`,
}));

const RAIN_DROPS_22 = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  left: `${(i / 22) * 100 + Math.sin(i * 1.7) * 5}%`,
  dur: `${0.6 + (i % 4) * 0.1}s`,
  delay: `-${(i * 137) % 1500}ms`,
}));

function RainDrops({ heavy = false }: { heavy?: boolean }) {
  const drops = heavy ? RAIN_DROPS_22 : RAIN_DROPS_15;
  return (
    <>
      <style>{`
        @keyframes rain-fall {
          0% { transform: translateY(-20px) rotate(10deg); opacity: 0; }
          10% { opacity: 0.95; }
          90% { opacity: 0.95; }
          100% { transform: translateY(340px) rotate(10deg); opacity: 0; }
        }
      `}</style>
      {drops.map((d) => (
        <div
          key={d.id}
          className="absolute rounded-full"
          style={{
            left: d.left,
            top: 0,
            width: heavy ? 2.5 : 2,
            height: heavy ? 12 : 10,
            background: heavy ? 'rgba(226,232,240,0.95)' : 'rgba(255,255,255,0.9)',
            boxShadow: heavy ? '0 0 2px rgba(148,163,184,0.6)' : '0 0 2px rgba(96,165,250,0.5)',
            animation: `rain-fall ${d.dur} linear infinite`,
            animationDelay: d.delay,
          }}
        />
      ))}
    </>
  );
}

function SunRays() {
  return (
    <>
      <style>{`
        @keyframes sun-pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.08); }
        }
        @keyframes ray-drift {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.7; }
        }
      `}</style>
      <div
        className="absolute rounded-full"
        style={{
          top: 26,
          right: 30,
          width: 28,
          height: 28,
          background: 'radial-gradient(circle, #fbbf24, #f59e0b)',
          animation: 'sun-pulse 3s ease-in-out infinite',
          boxShadow: '0 0 12px 4px rgba(251,191,36,0.4)',
        }}
      />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <div
          key={deg}
          className="absolute"
          style={{
            top: 39,
            right: 26,
            width: 18,
            height: 2,
            background: '#fbbf24',
            borderRadius: 1,
            transformOrigin: 'left center',
            transform: `rotate(${deg}deg) translateX(16px)`,
            animation: `ray-drift ${2 + (deg % 90 === 0 ? 0 : deg % 45 === 0 ? 0.4 : 0.8)}s ease-in-out infinite`,
            animationDelay: `${(deg / 45) * 100}ms`,
            opacity: 0.5,
          }}
        />
      ))}
    </>
  );
}

interface Cloud {
  top: number;
  left?: string;
  right?: string;
  w: number;
  h: number;
  anim: string;
  puffs: string[];
}

function Clouds({ dark = false }: { dark?: boolean }) {
  // Soft, slightly cool off-white on day skies; muted slate on stormy night skies
  const color = dark ? 'rgba(100,116,139,0.8)' : 'rgba(236,242,248,0.8)';
  // A fuller cloud field. Each cloud is an ellipse plus several box-shadow "puffs" for a lumpy silhouette.
  // The first cloud (top-left, cloud-drift-1) is the one Lightning syncs to — keep it first.
  const clouds: Cloud[] = [
    {
      top: 16,
      left: '10%',
      w: 96,
      h: 30,
      anim: 'cloud-drift-1 6s',
      puffs: ['24px -16px 0 4px', '-22px -8px 0 0', '50px -4px 0 -2px', '2px -22px 0 -2px'],
    },
    {
      top: 28,
      right: '8%',
      w: 76,
      h: 25,
      anim: 'cloud-drift-2 7s',
      puffs: ['18px -13px 0 3px', '-18px -6px 0 0', '36px -3px 0 -3px'],
    },
    {
      top: 60,
      left: '32%',
      w: 88,
      h: 27,
      anim: 'cloud-drift-2 9s',
      puffs: ['22px -15px 0 4px', '-22px -7px 0 0', '44px -4px 0 -2px', '-4px -20px 0 -3px'],
    },
    {
      top: 8,
      left: '48%',
      w: 62,
      h: 21,
      anim: 'cloud-drift-1 8s',
      puffs: ['14px -11px 0 2px', '-14px -4px 0 0', '28px -2px 0 -3px'],
    },
    {
      top: 72,
      right: '24%',
      w: 72,
      h: 23,
      anim: 'cloud-drift-1 7.5s',
      puffs: ['16px -12px 0 3px', '-16px -5px 0 0', '32px -3px 0 -3px'],
    },
    {
      top: 42,
      right: '42%',
      w: 54,
      h: 19,
      anim: 'cloud-drift-2 8.5s',
      puffs: ['13px -9px 0 2px', '-12px -4px 0 0', '24px -2px 0 -3px'],
    },
  ];
  return (
    <>
      <style>{`
        @keyframes cloud-drift-1 { 0% { transform: translateX(-10px); } 100% { transform: translateX(10px); } }
        @keyframes cloud-drift-2 { 0% { transform: translateX(8px); } 100% { transform: translateX(-8px); } }
      `}</style>
      {clouds.map((c) => (
        <div
          key={`${c.top}-${c.left ?? c.right}`}
          className="absolute rounded-full"
          style={{
            top: c.top,
            left: c.left,
            right: c.right,
            width: c.w,
            height: c.h,
            background: color,
            animation: `${c.anim} ease-in-out infinite alternate`,
            boxShadow: c.puffs.map((p) => `${p} ${color}`).join(', '),
          }}
        />
      ))}
    </>
  );
}

const SNOW_FLAKES = Array.from({ length: 26 }, (_, i) => ({
  id: i,
  top: `${(i * 53) % 100}%`,
  size: 2 + (i % 3),
  dur: `${1.1 + (i % 5) * 0.18}s`,
  delay: `-${(i * 91) % 2200}ms`,
  drift: 10 + (i % 4) * 6,
}));

function Blizzard() {
  return (
    <>
      <style>{`
        @keyframes snow-blow {
          0% { transform: translateX(-30px) translateY(-10px); opacity: 0; }
          10% { opacity: 0.9; }
          90% { opacity: 0.9; }
          100% { transform: translateX(500px) translateY(40px); opacity: 0; }
        }
        @keyframes gust {
          0%, 100% { opacity: 0.15; transform: translateX(0); }
          50% { opacity: 0.4; transform: translateX(20px); }
        }
      `}</style>
      {/* Wind gust streaks */}
      {[
        { top: '25%', dur: '2.4s', delay: '-200ms' },
        { top: '50%', dur: '3.0s', delay: '-1400ms' },
        { top: '70%', dur: '2.7s', delay: '-2600ms' },
      ].map((g) => (
        <div
          key={g.top}
          className="absolute inset-x-0"
          style={{
            top: g.top,
            height: 2,
            background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.6), transparent)',
            animation: `gust ${g.dur} ease-in-out infinite`,
            animationDelay: g.delay,
          }}
        />
      ))}
      {/* Driven snowflakes */}
      {SNOW_FLAKES.map((f) => (
        <div
          key={f.id}
          className="absolute rounded-full"
          style={{
            top: f.top,
            left: 0,
            width: f.size,
            height: f.size,
            background: 'rgba(255,255,255,0.95)',
            boxShadow: '0 0 2px rgba(255,255,255,0.8)',
            animation: `snow-blow ${f.dur} linear infinite`,
            animationDelay: f.delay,
          }}
        />
      ))}
    </>
  );
}

// Multiple bolts, each drifting under a cloud and flashing on its own staggered rhythm. The first is synced to
// the top-left cloud (cloud-drift-1) as before; negative delays desynchronize the rest so strikes come often.
const LIGHTNING_BOLTS: {
  left: string;
  top: number;
  scale: number;
  drift: string;
  dur: string;
  delay: string;
  points: string;
}[] = [
  {
    left: '18%',
    top: 32,
    scale: 1,
    drift: 'cloud-drift-1 6s',
    dur: '3.5s',
    delay: '0s',
    points: '14,0 6,18 12,18 4,40',
  },
  {
    left: '60%',
    top: 40,
    scale: 0.8,
    drift: 'cloud-drift-2 7s',
    dur: '4.2s',
    delay: '-1.6s',
    points: '12,0 5,16 11,16 3,36',
  },
  {
    left: '82%',
    top: 28,
    scale: 0.65,
    drift: 'cloud-drift-1 8s',
    dur: '5s',
    delay: '-3.1s',
    points: '13,0 6,15 12,15 5,34',
  },
  {
    left: '38%',
    top: 70,
    scale: 0.7,
    drift: 'cloud-drift-2 8.5s',
    dur: '4.7s',
    delay: '-2.3s',
    points: '12,0 5,17 11,17 4,38',
  },
];

function Lightning() {
  return (
    <>
      <style>{`
        @keyframes bolt-drift { 0% { transform: translateX(-10px); } 100% { transform: translateX(10px); } }
        @keyframes lightning-flash {
          0%, 42%, 100% { opacity: 0; }
          44% { opacity: 1; }
          47% { opacity: 0.15; }
          50% { opacity: 1; }
          55% { opacity: 0; }
        }
        @keyframes sky-flash {
          0%, 40%, 100% { opacity: 0; }
          44% { opacity: 0.28; }
          48% { opacity: 0.06; }
          52% { opacity: 0.22; }
          58% { opacity: 0; }
        }
      `}</style>
      {/* Ambient full-frame flash lighting up the sky, timed with the lead bolt */}
      <div
        className="absolute inset-0"
        style={{
          background: 'rgba(255,255,255,1)',
          animation: 'sky-flash 3.5s ease-out infinite',
          pointerEvents: 'none',
        }}
      />
      {LIGHTNING_BOLTS.map((b) => (
        <div
          key={b.left}
          className="absolute"
          style={{
            top: b.top,
            left: b.left,
            animation: `${b.drift} ease-in-out infinite alternate, lightning-flash ${b.dur} ease-out infinite`,
            animationDelay: `0s, ${b.delay}`,
          }}
        >
          <svg
            width={20 * b.scale}
            height={40 * b.scale}
            viewBox="0 0 20 40"
            style={{ filter: 'drop-shadow(0 0 5px rgba(253,224,71,0.9))' }}
          >
            <polyline points={b.points} fill="none" stroke="#fde047" strokeWidth="2.5" strokeLinejoin="round" />
          </svg>
        </div>
      ))}
    </>
  );
}

const STAGE_ROWS: { stage: GardenStage; wins: string }[] = [
  { stage: 1, wins: '0+' },
  { stage: 2, wins: '3+' },
  { stage: 3, wins: '15+' },
  { stage: 4, wins: '30+' },
  { stage: 5, wins: '45+' },
  { stage: 6, wins: '60+' },
  { stage: 7, wins: '71+' },
  { stage: 8, wins: '82+' },
];

const WEATHER_ROWS: { weather: WeatherState; score: string; description: string }[] = [
  { weather: 'sunny', score: '80–100', description: 'Playing well across the board' },
  { weather: 'cloudy', score: '60–79', description: 'Decent but not outstanding' },
  { weather: 'rainy', score: '40–59', description: 'Mixed or average form' },
  { weather: 'stormy', score: '20–39', description: 'Struggling' },
  { weather: 'blizzard', score: '0–19', description: 'Frozen solid — brutal form' },
];

// Fixed design size the garden scene is laid out at (3:2). Everything inside is authored against these
// dimensions, then a single transform scales the whole stage to whatever width the card renders at.
const DESIGN_W = 480;
const DESIGN_H = 320;

// Tailwind-styled dropdown replacing the native <select> in the debug panel — native popups misposition
// inside transformed ancestors and can't be themed; this is a plain menu with click-outside to close.
interface DebugOption {
  value: string;
  label: string;
}

function DebugSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: DebugOption[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
  }, []);

  useEffect(() => {
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, handleClickOutside]);

  const selected = options.find((o) => o.value === value);

  return (
    <label
      className={`
        flex flex-1 items-center gap-2 text-gray-600
        dark:text-gray-300
      `}
    >
      <span className="w-16 shrink-0">{label}</span>
      <div ref={ref} className="relative flex-1">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`
            flex w-full cursor-pointer items-center justify-between gap-2 rounded border border-gray-300 bg-white px-1.5
            py-1 text-left
            dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100
          `}
        >
          <span className="truncate">{selected?.label}</span>
          <svg
            className={`
              h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform
              ${open ? 'rotate-180' : ''}
            `}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d={
                'M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.06l3.71-3.83a.75.75 0 1 1 1.08 1.04' +
                'l-4.25 4.38a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06z'
              }
              clipRule="evenodd"
            />
          </svg>
        </button>
        {open && (
          <div
            className={`
              absolute left-0 z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1
              shadow-lg
              dark:border-gray-700 dark:bg-gray-800
            `}
          >
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`
                  block w-full cursor-pointer px-3 py-1.5 text-left
                  hover:bg-gray-100
                  dark:hover:bg-gray-700
                  ${
                    o.value === value
                      ? `
                        font-semibold text-gray-900
                        dark:text-gray-100
                      `
                      : `
                        text-gray-700
                        dark:text-gray-300
                      `
                  }
                `}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </label>
  );
}

export default function PlayerGarden({ player, matches, playerId, isAdmin = false }: Props) {
  const computed = useMemo(() => computeGardenState(player, matches, playerId), [player, matches, playerId]);
  const [showInfo, setShowInfo] = useState(false);
  const [debugStage, setDebugStage] = useState<GardenStage | null>(null);
  const [debugWeather, setDebugWeather] = useState<WeatherState | null>(null);

  // Measure the rendered card width and derive a uniform scale factor for the whole scene
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / DESIGN_W));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const stage = debugStage ?? computed.stage;
  const weather = debugWeather ?? computed.weather;

  const [skyLight, skyDark] = SKY_COLORS[weather];
  const isNight = SKY_IMAGE[weather] === 'night';
  const tintColor = isNight ? skyDark : skyLight;
  const tint = WEATHER_TINT[weather];
  const swayDur = `${(SWAY_DURATION[stage] * WEATHER_SWAY_MULT[weather]).toFixed(1)}s`;

  return (
    <div className="flex flex-col items-center">
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-2xl"
        style={{ width: '100%', maxWidth: DESIGN_W, aspectRatio: '3 / 2' }}
      >
        {/* Fixed-size stage scaled as one unit so every layer grows/shrinks together with the card */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: DESIGN_W,
            height: DESIGN_H,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          {/* Sky — day/night painted background chosen by weather, with a translucent weather tint on top */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(${tintColor}${tint}, ${tintColor}${tint}), url(/garden/sky_${
                isNight ? 'night' : 'day'
              }.webp)`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />

          {/* Weather overlays */}
          {weather === 'sunny' && <SunRays />}
          {(weather === 'cloudy' || weather === 'stormy') && <Clouds dark={weather === 'stormy'} />}
          {weather === 'rainy' && <RainDrops />}
          {weather === 'stormy' && (
            <>
              <RainDrops heavy />
              <Lightning />
            </>
          )}
          {weather === 'blizzard' && <Blizzard />}

          {/* Ground — grass/dirt tile used directly, tiled horizontally at 2× pixel scale */}
          <div
            className="absolute inset-x-0 bottom-0"
            style={{
              height: 48,
              backgroundImage: 'url(/garden/ground.png)',
              backgroundRepeat: 'repeat-x',
              backgroundPosition: 'top left',
              backgroundSize: '48px 48px',
              imageRendering: 'pixelated',
              borderRadius: '0 0 16px 16px',
            }}
          />

          {/* Shadow cast on the grass at the base of the trunk */}
          <div
            className="absolute"
            style={{
              bottom: 36,
              left: '50%',
              transform: 'translateX(-50%)',
              width: SHADOW_WIDTHS[stage],
              height: 11,
              background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.38), rgba(0,0,0,0) 70%)',
              borderRadius: '50%',
              pointerEvents: 'none',
            }}
          />

          {/* Tree — baseline sunk into the grass so it reads as planted */}
          <div
            className="absolute inset-x-0"
            style={{ bottom: 40, top: 8, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          >
            <style>{`
              @keyframes tree-sway {
                0% { transform: rotate(-2deg); }
                100% { transform: rotate(2deg); }
              }
            `}</style>
            <img
              src={`/garden/stage${stage === 2 ? 3 : stage}.png`}
              alt={STAGE_NAMES[stage]}
              style={{
                height: STAGE_HEIGHTS[stage],
                width: 'auto',
                imageRendering: 'pixelated',
                animation: `tree-sway ${swayDur} ease-in-out infinite alternate`,
                transformOrigin: 'bottom center',
              }}
            />
          </div>
        </div>

        {/* Stage · weather badge — overlay, top-left (kept at fixed size, outside the scaled stage) */}
        <div
          className={`
            absolute top-2 left-2 z-10 flex items-center gap-1 rounded-full bg-black/35 px-2.5 py-1 text-xs font-medium
            text-white backdrop-blur-sm
          `}
        >
          {STAGE_NAMES[stage]} · {WEATHER_EMOJI[weather]}
        </div>

        {/* Info toggle — overlay, top-right (kept at fixed size, outside the scaled stage) */}
        <button
          onClick={() => setShowInfo((v) => !v)}
          className={`
            absolute top-2 right-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-black/35 text-xs
            text-white backdrop-blur-sm transition-colors
            hover:bg-black/55
          `}
          type="button"
          aria-label="How the garden works"
        >
          ?
        </button>
      </div>

      {/* Debug panel */}
      {isAdmin && (
        <div
          className={`
            mt-2 w-full max-w-[480px] rounded-lg border border-dashed border-orange-300 bg-orange-50 px-3 py-2 text-xs
            dark:border-orange-700 dark:bg-orange-950/30
          `}
        >
          <div
            className={`
              mb-1.5 font-medium text-orange-600
              dark:text-orange-400
            `}
          >
            debug
          </div>
          {/* Weather formula breakdown */}
          <div
            className={`
              mb-2 grid grid-cols-2 gap-x-4 gap-y-0.5 rounded bg-orange-100/60 px-2 py-1.5 font-mono text-[11px]
              dark:bg-orange-900/20
            `}
          >
            <span
              className={`
                text-gray-500
                dark:text-gray-400
              `}
            >
              streak
            </span>
            <span
              className={`
                text-gray-700
                dark:text-gray-200
              `}
            >
              {computed.breakdown.streakValue > 0 ? '+' : ''}
              {computed.breakdown.streakValue} → score {computed.breakdown.streakScore.toFixed(1)} ×35%
            </span>
            <span
              className={`
                text-gray-500
                dark:text-gray-400
              `}
            >
              last 5
            </span>
            <span
              className={`
                text-gray-700
                dark:text-gray-200
              `}
            >
              {computed.breakdown.recentWins}/{computed.breakdown.recentTotal} →{' '}
              {computed.breakdown.recentForm.toFixed(1)} ×40%
            </span>
            <span
              className={`
                text-gray-500
                dark:text-gray-400
              `}
            >
              win rate
            </span>
            <span
              className={`
                text-gray-700
                dark:text-gray-200
              `}
            >
              {computed.breakdown.winRate.toFixed(1)} ×25%
            </span>
            <span
              className={`
                text-gray-500
                dark:text-gray-400
              `}
            >
              health
            </span>
            <span
              className={`
                font-semibold text-orange-700
                dark:text-orange-300
              `}
            >
              {computed.breakdown.healthScore.toFixed(1)} → {WEATHER_EMOJI[computed.weather]} {computed.weather}
            </span>
          </div>

          <div
            className={`
              flex flex-col gap-2
              sm:flex-row sm:gap-4
            `}
          >
            <DebugSelect
              label="Stage"
              value={debugStage != null ? String(debugStage) : ''}
              onChange={(v) => setDebugStage(v ? (Number(v) as GardenStage) : null)}
              options={[
                { value: '', label: `auto (${computed.stage})` },
                ...([1, 2, 3, 4, 5, 6, 7, 8] as GardenStage[]).map((s) => ({
                  value: String(s),
                  label: `${s} — ${STAGE_NAMES[s]}`,
                })),
              ]}
            />
            <DebugSelect
              label="Weather"
              value={debugWeather ?? ''}
              onChange={(v) => setDebugWeather((v as WeatherState) || null)}
              options={[
                { value: '', label: `auto (${computed.weather})` },
                ...(['sunny', 'cloudy', 'rainy', 'stormy', 'blizzard'] as WeatherState[]).map((w) => ({
                  value: w,
                  label: `${WEATHER_EMOJI[w]} ${w}`,
                })),
              ]}
            />
          </div>
        </div>
      )}

      {showInfo && (
        <div
          className={`
            mt-3 max-w-sm rounded-xl border border-gray-100 bg-white p-4 text-xs
            dark:border-gray-700 dark:bg-gray-800
          `}
        >
          <p
            className={`
              mb-3 font-semibold text-gray-700
              dark:text-gray-200
            `}
          >
            How the garden works
          </p>

          <p
            className={`
              mb-1 font-medium text-gray-600
              dark:text-gray-300
            `}
          >
            Growth — season wins (only goes up)
          </p>
          <table className="mb-4 w-full">
            <thead>
              <tr
                className={`
                  text-left text-gray-400
                  dark:text-gray-500
                `}
              >
                <th className="pb-1 font-normal">Stage</th>
                <th className="pb-1 font-normal">Name</th>
                <th className="pb-1 font-normal">Wins</th>
              </tr>
            </thead>
            <tbody>
              {STAGE_ROWS.map(({ stage: s, wins }) => (
                <tr
                  key={s}
                  className={
                    s === stage
                      ? `
                        font-semibold text-gray-800
                        dark:text-gray-100
                      `
                      : `
                        text-gray-500
                        dark:text-gray-400
                      `
                  }
                >
                  <td className="py-0.5">{s}</td>
                  <td className="py-0.5">{STAGE_NAMES[s]}</td>
                  <td className="py-0.5">{wins}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p
            className={`
              mb-1 font-medium text-gray-600
              dark:text-gray-300
            `}
          >
            Weather — streak (35%) + last 5 matches (40%) + season win rate (25%)
          </p>
          <table className="w-full">
            <thead>
              <tr
                className={`
                  text-left text-gray-400
                  dark:text-gray-500
                `}
              >
                <th className="pb-1 font-normal">Weather</th>
                <th className="pb-1 font-normal">Score</th>
                <th className="pb-1 font-normal">Meaning</th>
              </tr>
            </thead>
            <tbody>
              {WEATHER_ROWS.map(({ weather: w, score, description }) => (
                <tr
                  key={w}
                  className={
                    w === weather
                      ? `
                        font-semibold text-gray-800
                        dark:text-gray-100
                      `
                      : `
                        text-gray-500
                        dark:text-gray-400
                      `
                  }
                >
                  <td className="py-0.5">{WEATHER_EMOJI[w]}</td>
                  <td className="py-0.5">{score}</td>
                  <td className="py-0.5">{description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
