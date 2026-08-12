// Flower beds on the lawn. The tree alone read as a single object floating on a strip of grass; the
// flora turns the scene into an actual garden that fills in as a player's season progresses. Plants
// are split into the ones behind the tree and the ones in front of it (by depth) so the caller can
// sandwich the swaying tree between the two layers.

import { DESIGN_W, FLORA_SPRITES, TREE_DEPTH, depthToY } from '@/constants/garden.ts';
import type { Plant } from '@/utils/garden.ts';

interface Props {
  plants: Plant[];
  // Which side of the tree to draw — depth decides membership, the caller decides paint order
  layer: 'back' | 'front';
}

// Size multiplier at depth 0 and depth 1. Distant plants shrink well below their authored height,
// which is what creates the sense of a lawn receding rather than a flat row of stickers.
const DEPTH_SCALE_MIN = 0.55;
const DEPTH_SCALE_MAX = 1.55;
// Distant plants are also washed out toward the sky's haze; the nearest keep their full colour
const DEPTH_DIM_MIN = 0.78;

// Plants sway with the same idea as the tree — a slow tilt about their base — but each on its own
// timing so a bed ripples instead of moving as a block. Fewer/cheaper than the tree's rAF loop:
// there are up to 26 of them, so this stays pure CSS.
const SWAY_BASE_DUR = 3.6;

export default function Flora({ plants, layer }: Props) {
  const visible = plants.filter((p) => (layer === 'back' ? p.depth < TREE_DEPTH : p.depth >= TREE_DEPTH));
  if (visible.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0">
      {visible.map((plant) => {
        const sprite = FLORA_SPRITES[plant.kind];
        const h = sprite.h * (DEPTH_SCALE_MIN + (DEPTH_SCALE_MAX - DEPTH_SCALE_MIN) * plant.depth);
        const w = h * sprite.aspect;
        const baseY = depthToY(plant.depth);
        // Derive the sway from x/depth rather than a stored seed: the placement is already
        // deterministic per player, so this stays stable without widening the Plant type.
        const jitter = (plant.x * 7.3 + plant.depth * 3.1) % 1;
        const dur = SWAY_BASE_DUR * (0.7 + jitter * 0.8);
        const angle = 1.6 + jitter * 1.8;
        return (
          <div
            key={`${plant.kind}-${plant.x.toFixed(4)}-${plant.depth.toFixed(4)}`}
            className="absolute"
            style={{
              left: plant.x * DESIGN_W - w / 2,
              top: baseY - h,
              width: w,
              height: h,
              // Nearer plants overlap farther ones; +100 keeps the whole bed above the lawn slab
              zIndex: 100 + Math.round(plant.depth * 100),
              backgroundImage: `url(${sprite.src})`,
              backgroundSize: '100% 100%',
              imageRendering: 'pixelated',
              opacity: DEPTH_DIM_MIN + (1 - DEPTH_DIM_MIN) * plant.depth,
              transformOrigin: 'bottom center',
              transform: plant.flipped ? 'scaleX(-1)' : undefined,
              animation: `flora-sway ${dur.toFixed(2)}s ease-in-out infinite alternate`,
              // Negative delay starts each plant mid-sway, so the bed never begins in lockstep
              animationDelay: `${(-jitter * dur).toFixed(2)}s`,
              // Per-plant tilt amount, read by the shared keyframes below
              ['--flora-angle' as string]: `${angle.toFixed(2)}deg`,
            }}
          />
        );
      })}
      {/* One shared keyframe track, varied per plant via --flora-angle. It animates the standalone
          `rotate` property rather than a transform, so it composes with the mirrored plants' scaleX
          instead of overwriting it. */}
      <style>{`
        @keyframes flora-sway {
          from { rotate: calc(var(--flora-angle) * -1); }
          to { rotate: var(--flora-angle); }
        }
      `}</style>
    </div>
  );
}
