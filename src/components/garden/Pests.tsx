// Infestation overlay — replaces the old withered/dried tree sprites. Rather than swapping the tree
// for a bare one, a poor record draws bugs onto a healthy canopy: the tree a player grew stays intact
// and the problem reads as something crawling on it. Each pest cycles its Idle/Side sprite strip via
// stepped background-position (same technique as Birds) over its own wander path.

import { PEST_SPRITES } from '@/constants/garden.ts';
import type { Pest, PestKind } from '@/utils/garden.ts';

interface Props {
  pests: Pest[];
  // Rendered tree box, in design px — pest positions are fractions of this
  width: number;
  height: number;
}

// Base on-screen height (design px) of a pest on a full-grown tree, scaled per kind by its `rel`.
// Sized so the bugs read clearly at the card's rendered scale without spilling past the canopy.
const PEST_SIZE = 30;
// Tree height the base size is authored against, and the floor the size may shrink to. Small stages
// scale bugs down proportionally so a full-size beetle doesn't swallow a 26px seed, but the floor is
// deliberately high: below ~20px the bugs stop reading as bugs at the card's rendered scale, and a
// too-subtle infestation on a seed/sprout/sapling is worse than a slightly oversized one.
const PEST_SIZE_REF_H = 215;
const PEST_SIZE_MIN = 20;

// Per-species motion character: how far it strays (px), how long a full circuit takes (s), and how
// much it tilts. Fliers roam loosely; the beetle is a crawler that barely leaves its spot.
const PEST_MOTION: Record<PestKind, { range: number; dur: number; tilt: number }> = {
  locust: { range: 7, dur: 5.5, tilt: 8 },
  butterfly: { range: 11, dur: 7, tilt: 14 },
  beetle: { range: 3, dur: 9, tilt: 4 },
  wasp: { range: 9, dur: 4.5, tilt: 10 },
};

// Expand a pest's 0–1 seed into several uncorrelated 0–1 values. Multiplying by primes and taking the
// fraction decorrelates them enough that no two bugs trace a similar path.
function spread(seed: number, i: number): number {
  return (seed * (i + 1) * 97.13) % 1;
}

// Build one keyframe track per pest: five waypoints at uneven times, each a different direction and
// tilt, so the bug wanders instead of tracing a tidy loop. Ends where it starts so the loop is seamless.
function wanderKeyframes(name: string, pest: Pest): string {
  const { range, tilt } = PEST_MOTION[pest.kind];
  const stops = [0, 22, 41, 63, 84, 100];
  const frames = stops.map((stop, s) => {
    if (s === 0 || s === stops.length - 1) return `${stop}% { transform: translate(0px, 0px) rotate(0deg); }`;
    // Two independent seeds per waypoint give an unbiased direction rather than a circular sweep
    const angle = spread(pest.seed, s * 2) * Math.PI * 2;
    const dist = (0.35 + spread(pest.seed, s * 2 + 1) * 0.65) * range;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist * 0.7; // vertical travel damped — bugs hug the canopy surface
    const rot = (spread(pest.seed, s * 2 + 7) * 2 - 1) * tilt;
    return `${stop}% { transform: translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) rotate(${rot.toFixed(1)}deg); }`;
  });
  return `@keyframes ${name} { ${frames.join(' ')} }`;
}

export default function Pests({ pests, width, height }: Props) {
  if (pests.length === 0) return null;

  // Shrink toward MIN on small trees; the sqrt keeps mid stages from collapsing too fast
  const sizeBase = Math.max(PEST_SIZE_MIN, PEST_SIZE * Math.sqrt(Math.min(1, height / PEST_SIZE_REF_H)));

  // One flap keyframe per species present — the step distance is the strip width, which differs by kind
  const kinds = [...new Set(pests.map((p) => p.kind))];

  return (
    <div className="pointer-events-none absolute inset-0">
      <style>{`
        ${kinds
          .map((kind) => {
            const s = PEST_SPRITES[kind];
            const stripW = sizeBase * s.rel * (s.cellW / s.cellH) * s.frames;
            return `
        @keyframes pest-flap-${kind} {
          from { background-position: 0 0; }
          to { background-position: -${stripW}px 0; }
        }`;
          })
          .join('')}
        ${pests.map((pest, i) => wanderKeyframes(`pest-wander-${i}`, pest)).join('\n        ')}
      `}</style>
      {pests.map((pest, i) => {
        const sprite = PEST_SPRITES[pest.kind];
        // Position is unique per pest (golden-angle placement), so it makes a stable key
        const key = `${pest.kind}-${pest.x.toFixed(4)}-${pest.y.toFixed(4)}`;
        const h = sizeBase * sprite.rel;
        const w = h * (sprite.cellW / sprite.cellH);
        const sheetW = w * sprite.frames;
        // Pests on the left half look right and vice versa, so they always face in toward the trunk
        const faceIn = pest.x < 0.5 ? 'right' : 'left';
        const flip = faceIn === sprite.faces ? '' : ' scaleX(-1)';
        const motion = PEST_MOTION[pest.kind];
        // Vary each bug's circuit speed by ±35% of its species' baseline, and start it mid-loop, so
        // identical species never sync up
        const wanderDur = motion.dur * (0.65 + spread(pest.seed, 1) * 0.7);
        const wanderDelay = -spread(pest.seed, 2) * wanderDur;
        // Wing/leg cycle also varies per bug, independently of the wander
        const flapDur = sprite.frames * 0.1 * (0.8 + spread(pest.seed, 3) * 0.5);
        const flapDelay = -spread(pest.seed, 4) * flapDur;
        return (
          <div
            key={key}
            className="absolute"
            style={{
              left: pest.x * width - w / 2,
              top: pest.y * height - h / 2,
              animation: `pest-wander-${i} ${wanderDur.toFixed(2)}s ease-in-out infinite`,
              animationDelay: `${wanderDelay.toFixed(2)}s`,
            }}
          >
            <div
              style={{
                width: w,
                height: h,
                backgroundImage: `url(${sprite.src})`,
                backgroundSize: `${sheetW}px ${h}px`,
                imageRendering: 'pixelated',
                transform: `translateZ(0)${flip}`,
                animation: `pest-flap-${pest.kind} ${flapDur.toFixed(2)}s steps(${sprite.frames}) infinite`,
                animationDelay: `${flapDelay.toFixed(2)}s`,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
