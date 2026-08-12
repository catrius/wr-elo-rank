import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Player, Match } from '@/types/common.ts';
import {
  buildFlora,
  buildPests,
  computeGardenState,
  PEST_WASP_MIN_CAUSES,
  type GardenStage,
  type PestCause,
  type PestKind,
  type WeatherState,
} from '@/utils/garden.ts';
import {
  depthToY,
  DESIGN_H,
  DESIGN_W,
  GROUND_LIGHT,
  PEST_CAUSE_KIND,
  PEST_NAMES,
  PEST_ROWS,
  SHADOW_WIDTHS,
  SKY_COLORS,
  SKY_IMAGE,
  STAGE_ASPECT,
  STAGE_HEIGHTS,
  STAGE_NAMES,
  STAGE_ROWS,
  SWAY_DURATION,
  TREE_DEPTH,
  WEATHER_EMOJI,
  WEATHER_ROWS,
  WEATHER_SWAY_MULT,
  WEATHER_TINT,
} from '@/constants/garden.ts';
import Birds from '@/components/garden/Birds.tsx';
import Blizzard from '@/components/garden/Blizzard.tsx';
import Clouds from '@/components/garden/Clouds.tsx';
import DebugCauses from '@/components/garden/DebugCauses.tsx';
import DebugSelect from '@/components/garden/DebugSelect.tsx';
import Flora from '@/components/garden/Flora.tsx';
import Lawn from '@/components/garden/Lawn.tsx';
import Lightning from '@/components/garden/Lightning.tsx';
import Pests from '@/components/garden/Pests.tsx';
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
  const [debugPests, setDebugPests] = useState<PestCause[] | null>(null);

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
  const causes = debugPests ?? computed.causes;
  // Recompute the swarm when a debug override or the stage changes; otherwise reuse the computed one
  const pests = useMemo(
    () => (debugPests || debugStage != null ? buildPests(causes, stage, playerId) : computed.pests),
    [debugPests, debugStage, causes, stage, playerId, computed.pests],
  );
  const infested = pests.length > 0;
  // Flora responds to stage, weather, and infestation, so any of the three debug overrides rebuilds it
  const plants = useMemo(
    () =>
      debugPests || debugStage != null || debugWeather != null
        ? buildFlora(stage, weather, infested, playerId)
        : computed.plants,
    [debugPests, debugStage, debugWeather, stage, weather, infested, playerId, computed.plants],
  );

  // Debug readout: what the swarm actually contains, and which species the stage's cap squeezed out
  const swarmSummary = useMemo(() => {
    const counts = new Map<PestKind, number>();
    pests.forEach((p) => counts.set(p.kind, (counts.get(p.kind) ?? 0) + 1));
    return [...counts].map(([kind, n]) => `${n}× ${kind}`).join(', ');
  }, [pests]);
  const droppedKinds = useMemo(() => {
    const expected = new Set<PestKind>(causes.map((c) => PEST_CAUSE_KIND[c]));
    if (causes.length >= PEST_WASP_MIN_CAUSES) expected.add('wasp');
    const rendered = new Set(pests.map((p) => p.kind));
    return [...expected].filter((k) => !rendered.has(k));
  }, [causes, pests]);

  // The tree sprite is the same whether or not it's infested — the bugs are what change
  const treeSrc = `/garden/stage${stage}.png`;
  // Pest positions are fractions of the tree's rendered box, derived from the sprite's aspect ratio
  const treeH = STAGE_HEIGHTS[stage];
  const treeW = treeH * STAGE_ASPECT[stage];
  // The trunk's base sits at the tree's own depth on the lawn — the same mapping the flora uses, so
  // plants at a nearer depth reliably read as being in front of it
  const treeBaseY = depthToY(TREE_DEPTH);

  const groundLight = GROUND_LIGHT[weather];
  const [skyLight, skyDark] = SKY_COLORS[weather];
  const isNight = SKY_IMAGE[weather] === 'night';
  const tintColor = isNight ? skyDark : skyLight;
  const tint = WEATHER_TINT[weather];

  // Drive the tree's sway in JS so it never exactly repeats: sum several sine waves at
  // incommensurate frequencies with random phases (re-rolled on each stage/weather change).
  const treeRef = useRef<HTMLDivElement>(null);
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
          {weather === 'sunny' && (
            <>
              <SunRays />
              <Birds />
            </>
          )}
          {(weather === 'cloudy' || weather === 'stormy') && <Clouds dark={weather === 'stormy'} />}
          {weather === 'rainy' && <RainDrops />}
          {weather === 'stormy' && (
            <>
              <RainDrops heavy />
              <Lightning />
            </>
          )}
          {weather === 'blizzard' && <Blizzard />}

          {/* Everything standing on the ground shares one lighting filter, so the bed can't end up lit
              like noon under a night sky. The tree lives inside it too — it's part of the scene, not a
              separate object floating over it. */}
          <div
            className="absolute inset-0"
            style={{ filter: `brightness(${groundLight.brightness}) saturate(${groundLight.sat})` }}
          >
            {/* Lawn + backdrop dressing (hedge, trellises) */}
            <Lawn />

            {/* Flower beds behind the tree — drawn before it, so the tree overlaps them */}
            <Flora plants={plants} layer="back" />

            {/* Bed of tilled soil the tree is planted in, with its shadow cast across it */}
            <div
              className="absolute"
              style={{
                left: '50%',
                top: treeBaseY - 11,
                transform: 'translateX(-50%)',
                width: SHADOW_WIDTHS[stage] * 1.5 + 40,
                height: 20,
                background: 'radial-gradient(ellipse at center, #92553c 60%, #74403933 78%, transparent 82%)',
                borderRadius: '50%',
              }}
            />
            <div
              className="absolute"
              style={{
                top: treeBaseY - 9,
                left: '50%',
                transform: 'translateX(-50%)',
                width: SHADOW_WIDTHS[stage],
                height: 11,
                background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.38), rgba(0,0,0,0) 70%)',
                borderRadius: '50%',
                pointerEvents: 'none',
              }}
            />

            {/* Tree — planted at TREE_DEPTH along the lawn rather than on the card's bottom edge, so the
                beds can sit both behind and in front of it. The pest overlay lives inside the swaying
                wrapper so bugs ride the canopy instead of hanging in the air beside it. */}
            <div
              ref={treeRef}
              className="absolute"
              style={{
                left: DESIGN_W / 2 - treeW / 2,
                top: treeBaseY - treeH,
                width: treeW,
                height: treeH,
                transformOrigin: 'bottom center',
                willChange: 'transform',
              }}
            >
              <img
                src={treeSrc}
                alt={infested ? `${STAGE_NAMES[stage]} (infested)` : STAGE_NAMES[stage]}
                style={{ width: '100%', height: '100%', imageRendering: 'pixelated' }}
              />
              <Pests pests={pests} width={treeW} height={treeH} />
            </div>

            {/* Flower beds nearer than the tree — drawn last, over it */}
            <Flora plants={plants} layer="front" />
          </div>
        </div>

        {/* Stage · weather badge — overlay, top-left (kept at fixed size, outside the scaled stage).
            Uses a warm light background in every state so the dark 🐛 glyph stays readable. */}
        <div
          className={`
            absolute top-2 left-2 z-10 flex items-center gap-1 rounded-full bg-amber-100/85 px-2.5 py-1 text-xs
            font-medium text-amber-950 backdrop-blur-sm
          `}
        >
          {STAGE_NAMES[stage]} · {infested ? '🐛' : '🌳'} · {WEATHER_EMOJI[weather]}
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
          {/* Weather formula breakdown. The label column is sized to its content rather than half the
              panel, so the value column has room — and `leading-4` + `min-h-8` on the two
              variable-length rows below reserves two lines each, keeping the panel (and everything
              under it) from shifting as the text grows or shrinks with stage/cause changes. */}
          <div
            className={`
              mb-2 grid grid-cols-[4.5rem_1fr] gap-x-3 gap-y-0.5 rounded bg-orange-100/60 px-2 py-1.5 font-mono
              text-[11px] leading-4
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
            <span
              className={`
                text-gray-500
                dark:text-gray-400
              `}
            >
              pests
            </span>
            <span
              className={`
                min-h-8 font-semibold text-orange-700
                dark:text-orange-300
              `}
            >
              {player.total} games · {computed.breakdown.winRate.toFixed(1)}% wr →{' '}
              {computed.causes.length > 0
                ? `🐛 ${computed.causes.join(' + ')} (${computed.pests.length})`
                : '🌳 healthy'}
            </span>
            <span
              className={`
                text-gray-500
                dark:text-gray-400
              `}
            >
              swarm
            </span>
            {/* Reflects debug overrides and names the species actually rendered — small stages cap the
                bug count, so a species can be dropped even though its cause is active. */}
            <span
              className={`
                min-h-8 font-semibold text-orange-700
                dark:text-orange-300
              `}
            >
              {pests.length > 0
                ? `${pests.length} bug${pests.length === 1 ? '' : 's'} · ${swarmSummary}${
                    droppedKinds.length > 0 ? ` · capped, no ${droppedKinds.join('/')}` : ''
                  }`
                : '—'}
            </span>
          </div>

          {/* One control per row. Side-by-side, each dropdown only got ~90px once the label and
              steppers were subtracted, which truncated values like "4 — Young Tree" to "4 — Yo…". */}
          <div className="grid grid-cols-1 gap-2">
            <DebugSelect
              label="Stage"
              value={debugStage != null ? String(debugStage) : ''}
              onChange={(v) => setDebugStage(v ? (Number(v) as GardenStage) : null)}
              onStep={(dir) =>
                setDebugStage((prev) => Math.min(8, Math.max(1, (prev ?? computed.stage) + dir)) as GardenStage)
              }
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
              onStep={(dir) =>
                setDebugWeather((prev) => {
                  const order: WeatherState[] = ['sunny', 'cloudy', 'rainy', 'stormy', 'blizzard'];
                  const i = order.indexOf(prev ?? computed.weather);
                  return order[Math.min(order.length - 1, Math.max(0, i + dir))];
                })
              }
              options={[
                { value: '', label: `auto (${computed.weather})` },
                ...(['sunny', 'cloudy', 'rainy', 'stormy', 'blizzard'] as WeatherState[]).map((w) => ({
                  value: w,
                  label: `${WEATHER_EMOJI[w]} ${w}`,
                })),
              ]}
            />
            {/* Causes are toggled independently so every combination — and the firewasp escalation
                at two or more — is reachable. */}
            <DebugCauses label="Pests" value={debugPests} computed={computed.causes} onChange={setDebugPests} />
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

          <p
            className={`
              mt-4 mb-1 font-medium text-gray-600
              dark:text-gray-300
            `}
          >
            Pests — each condition draws its own bug 🐛
          </p>
          <table className="w-full">
            <thead>
              <tr
                className={`
                  text-left text-gray-400
                  dark:text-gray-500
                `}
              >
                <th className="pb-1 font-normal">Bug</th>
                <th className="pb-1 font-normal">Condition</th>
                <th className="pb-1 font-normal">Trigger</th>
              </tr>
            </thead>
            <tbody>
              {PEST_ROWS.map(({ cause, condition, trigger }) => (
                <tr
                  key={cause}
                  className={
                    computed.causes.includes(cause)
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
                  <td className="py-0.5">{PEST_NAMES[PEST_CAUSE_KIND[cause]]}</td>
                  <td className="py-0.5">{condition}</td>
                  <td className="py-0.5">{trigger}</td>
                </tr>
              ))}
              <tr
                className={
                  computed.causes.length >= PEST_WASP_MIN_CAUSES
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
                <td className="py-0.5">{PEST_NAMES.wasp}</td>
                <td className="py-0.5">Swarm</td>
                <td className="py-0.5">{PEST_WASP_MIN_CAUSES}+ conditions at once</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
