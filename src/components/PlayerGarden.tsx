import { useMemo, useState } from 'react';
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

function Clouds({ dark = false }: { dark?: boolean }) {
  const color = dark ? 'rgba(71,85,105,0.7)' : 'rgba(203,213,225,0.85)';
  return (
    <>
      <style>{`
        @keyframes cloud-drift-1 { 0% { transform: translateX(-10px); } 100% { transform: translateX(10px); } }
        @keyframes cloud-drift-2 { 0% { transform: translateX(8px); } 100% { transform: translateX(-8px); } }
      `}</style>
      <div
        className="absolute rounded-full"
        style={{
          top: 14,
          left: '15%',
          width: 60,
          height: 22,
          background: color,
          animation: 'cloud-drift-1 6s ease-in-out infinite alternate',
          boxShadow: `12px -8px 0 4px ${color}, -10px -4px 0 2px ${color}`,
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          top: 22,
          right: '12%',
          width: 44,
          height: 16,
          background: color,
          animation: 'cloud-drift-2 7s ease-in-out infinite alternate',
          boxShadow: `10px -6px 0 3px ${color}`,
        }}
      />
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
      `}</style>
      {/* Bolt drifts in sync with the first cloud (cloud-drift-1) and flashes intermittently */}
      <div
        className="absolute"
        style={{
          top: 32,
          left: '18%',
          animation: 'bolt-drift 6s ease-in-out infinite alternate, lightning-flash 3.5s ease-out infinite',
        }}
      >
        <svg width="20" height="40" viewBox="0 0 20 40" style={{ filter: 'drop-shadow(0 0 5px rgba(253,224,71,0.9))' }}>
          <polyline
            points="14,0 6,18 12,18 4,40"
            fill="none"
            stroke="#fde047"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        </svg>
      </div>
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

export default function PlayerGarden({ player, matches, playerId, isAdmin = false }: Props) {
  const computed = useMemo(() => computeGardenState(player, matches, playerId), [player, matches, playerId]);
  const [showInfo, setShowInfo] = useState(false);
  const [debugStage, setDebugStage] = useState<GardenStage | null>(null);
  const [debugWeather, setDebugWeather] = useState<WeatherState | null>(null);

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
        className="relative overflow-hidden rounded-2xl"
        style={{ width: '100%', maxWidth: 480, aspectRatio: '3 / 2' }}
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

        {/* Stage · weather badge — overlay, top-left */}
        <div
          className={`
            absolute top-2 left-2 z-10 flex items-center gap-1 rounded-full bg-black/35 px-2.5 py-1 text-xs font-medium
            text-white backdrop-blur-sm
          `}
        >
          {STAGE_NAMES[stage]} · {WEATHER_EMOJI[weather]}
        </div>

        {/* Info toggle — overlay, top-right */}
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
            <label
              className={`
                flex flex-1 items-center gap-2 text-gray-600
                dark:text-gray-300
              `}
            >
              <span className="w-16 shrink-0">Stage</span>
              <select
                value={debugStage ?? ''}
                onChange={(e) => setDebugStage(e.target.value ? (Number(e.target.value) as GardenStage) : null)}
                className={`
                  flex-1 rounded border border-gray-300 bg-white px-1.5 py-1
                  dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100
                `}
              >
                <option value="">auto ({computed.stage})</option>
                {([1, 2, 3, 4, 5, 6, 7, 8] as GardenStage[]).map((s) => (
                  <option key={s} value={s}>
                    {s} — {STAGE_NAMES[s]}
                  </option>
                ))}
              </select>
            </label>
            <label
              className={`
                flex flex-1 items-center gap-2 text-gray-600
                dark:text-gray-300
              `}
            >
              <span className="w-16 shrink-0">Weather</span>
              <select
                value={debugWeather ?? ''}
                onChange={(e) => setDebugWeather((e.target.value as WeatherState) || null)}
                className={`
                  flex-1 rounded border border-gray-300 bg-white px-1.5 py-1
                  dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100
                `}
              >
                <option value="">auto ({computed.weather})</option>
                {(['sunny', 'cloudy', 'rainy', 'stormy', 'blizzard'] as WeatherState[]).map((w) => (
                  <option key={w} value={w}>
                    {WEATHER_EMOJI[w]} {w}
                  </option>
                ))}
              </select>
            </label>
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
