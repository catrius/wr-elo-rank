import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Player, Match } from '@/types/common.ts';
import { computeGardenState, type GardenStage, type WeatherState } from '@/utils/garden.ts';
import {
  DESIGN_H,
  DESIGN_W,
  SHADOW_WIDTHS,
  SKY_COLORS,
  SKY_IMAGE,
  STAGE_HEIGHTS,
  STAGE_NAMES,
  STAGE_ROWS,
  SWAY_DURATION,
  WEATHER_EMOJI,
  WEATHER_ROWS,
  WEATHER_SWAY_MULT,
  WEATHER_TINT,
} from '@/constants/garden.ts';
import Blizzard from '@/components/garden/Blizzard.tsx';
import Clouds from '@/components/garden/Clouds.tsx';
import DebugSelect from '@/components/garden/DebugSelect.tsx';
import Lightning from '@/components/garden/Lightning.tsx';
import RainDrops from '@/components/garden/RainDrops.tsx';
import SunRays from '@/components/garden/SunRays.tsx';

interface Props {
  player: Player;
  matches: Match[];
  playerId: number;
  isAdmin?: boolean;
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

  // Drive the tree's sway in JS so it never exactly repeats: sum several sine waves at
  // incommensurate frequencies with random phases (re-rolled on each stage/weather change).
  const treeRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const el = treeRef.current;
    if (!el) return undefined;
    // Base wave period (seconds) — slower for young stages, faster in lively weather
    const period = SWAY_DURATION[stage] * WEATHER_SWAY_MULT[weather];
    const w = (2 * Math.PI) / period;
    const phase = Array.from({ length: 4 }, () => Math.random() * Math.PI * 2);
    let raf = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const t = (now - start) / 1000;
      // Lean: three layered waves; their peaks rarely align, so the motion wanders organically
      const rot =
        3 * Math.sin(w * t + phase[0]) +
        1.4 * Math.sin(w * 2.3 * t + phase[1]) +
        0.8 * Math.sin(w * 0.6 * t + phase[2]);
      // Canopy trails the lean slightly — bend rather than rigid rock
      const skew = -1.4 * Math.sin(w * t + phase[0] + 0.5) + 0.7 * Math.sin(w * 1.7 * t + phase[3]);
      el.style.transform = `rotate(${rot.toFixed(2)}deg) skewX(${skew.toFixed(2)}deg)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [stage, weather]);

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
            <img
              ref={treeRef}
              src={`/garden/stage${stage === 2 ? 3 : stage}.png`}
              alt={STAGE_NAMES[stage]}
              style={{
                height: STAGE_HEIGHTS[stage],
                width: 'auto',
                imageRendering: 'pixelated',
                transformOrigin: 'bottom center',
                willChange: 'transform',
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
