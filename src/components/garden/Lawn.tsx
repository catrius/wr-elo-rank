// The garden's ground plane and its static backdrop dressing.
//
// Replaces the old 48px tiled dirt strip. The lawn is a single baked image (see
// assets/garden/lawn/generate.py) because it needs a vertical gradient — hazy at the horizon, bright
// in the foreground — plus a speckle density that thickens toward the viewer; tiling a 16px ground
// tile over that area striped visibly. The dressing on top (a hedge along the horizon and the
// climbing-rose trellises behind it) is what makes the space read as *cultivated* rather than a field.
//
// Everything here sits at or behind the horizon, so it mounts once, beneath the flower beds. The
// foreground is left to Flora — near-corner props were tried and cut (see GARDEN_PROPS).

import {
  DESIGN_H,
  DESIGN_W,
  FLORA_SPRITES,
  GARDEN_PROPS,
  HEDGE_DIM,
  HEDGE_H,
  LAWN_H,
  LAWN_TOP,
} from '@/constants/garden.ts';

// Overlap between hedge tiles, so the seams disappear into the foliage instead of forming a repeat
const HEDGE_OVERLAP = 6;

export default function Lawn() {
  const hedgeW = HEDGE_H * FLORA_SPRITES.bush.aspect;
  const step = hedgeW - HEDGE_OVERLAP;
  // Start half a tile off-screen so the row doesn't begin on a clean edge at x=0
  const hedgeCount = Math.ceil((DESIGN_W + hedgeW) / step) + 1;

  return (
    <div className="pointer-events-none absolute inset-0">
      {/* Lawn slab — authored at exactly the design width, so it lands 1:1 with no scaling */}
      <div
        className="absolute"
        style={{
          left: 0,
          top: LAWN_TOP,
          width: DESIGN_W,
          height: LAWN_H,
          backgroundImage: 'url(/garden/lawn.png)',
          backgroundSize: '100% 100%',
          imageRendering: 'pixelated',
        }}
      />

      {/* Trellises stand at the horizon, behind the hedge that hides their feet */}
      {GARDEN_PROPS.map((prop) => (
        <div
          key={prop.src}
          className="absolute"
          style={{
            left: prop.left,
            top: DESIGN_H - prop.bottom - prop.h,
            width: prop.h * prop.aspect,
            height: prop.h,
            backgroundImage: `url(${prop.src})`,
            backgroundSize: '100% 100%',
            imageRendering: 'pixelated',
            filter: `brightness(${prop.dim})`,
          }}
        />
      ))}

      {/* Hedge along the horizon — hides the lawn's hard top edge and closes the garden off */}
      {Array.from({ length: hedgeCount }, (_, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            left: -hedgeW / 2 + i * step,
            top: LAWN_TOP - HEDGE_H + 5,
            width: hedgeW,
            height: HEDGE_H,
            backgroundImage: `url(${FLORA_SPRITES.bush.src})`,
            backgroundSize: '100% 100%',
            imageRendering: 'pixelated',
            filter: `brightness(${HEDGE_DIM})`,
            // Alternate the mirroring so the repeat isn't a marching pattern
            transform: i % 2 === 0 ? undefined : 'scaleX(-1)',
          }}
        />
      ))}
    </div>
  );
}
