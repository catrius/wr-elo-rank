// Sunny = best form. A photographic sun: white-hot core with soft bloom, gentle diffuse rays,
// an anamorphic flare star, and a chain of lens-flare ghosts running across the frame.

// Sun center in stage coords (anchor is top:54, right:54 on a 480-wide stage) and the frame center.
// Lens ghosts are placed along the line from the sun through the frame center (t=0 at sun, t=1 at center).
const SUN_X = 480 - 54;
const SUN_Y = 54;
const CENTER_X = 240;
const CENTER_Y = 160;

const RAYS = Array.from({ length: 12 }, (_, i) => i * 30);

// Cool-tinted anamorphic streak gradient, brightest at its center where it crosses the sun
const STREAK_H =
  'linear-gradient(90deg, rgba(191,219,254,0) 0%, rgba(191,219,254,0.6) 42%, ' +
  'rgba(255,255,255,0.95) 50%, rgba(191,219,254,0.6) 58%, rgba(191,219,254,0) 100%)';

// Lens-flare ghosts: filled discs and thin rings in subtly shifting hues, blurred and translucent
const FLARES = [
  { t: 0.32, r: 7, color: 'rgba(253,224,71,0.5)', ring: false },
  { t: 0.5, r: 17, color: 'rgba(125,211,252,0.35)', ring: true },
  { t: 0.66, r: 5, color: 'rgba(196,181,253,0.4)', ring: false },
  { t: 0.85, r: 28, color: 'rgba(251,191,36,0.16)', ring: true },
  { t: 1.05, r: 10, color: 'rgba(255,255,255,0.25)', ring: false },
  { t: 1.3, r: 22, color: 'rgba(125,211,252,0.22)', ring: true },
  { t: 1.62, r: 36, color: 'rgba(251,146,60,0.12)', ring: false },
  { t: 1.88, r: 13, color: 'rgba(196,181,253,0.28)', ring: true },
];

export default function SunRays() {
  return (
    <>
      <style>{`
        @keyframes sun-core-pulse {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
            box-shadow: 0 0 30px 10px rgba(255,247,237,0.6), 0 0 80px 28px rgba(245,158,11,0.3);
          }
          50% {
            transform: translate(-50%, -50%) scale(1.05);
            box-shadow: 0 0 42px 16px rgba(255,251,235,0.8), 0 0 110px 42px rgba(245,158,11,0.42);
          }
        }
        @keyframes sun-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes ray-breathe { 0%, 100% { opacity: 0.2; } 50% { opacity: 0.5; } }
        @keyframes bloom-pulse {
          0%, 100% { opacity: 0.7; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.12); }
        }
        @keyframes flare-shimmer { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }
        @keyframes streak-pulse {
          0%, 100% { opacity: 0.5; transform: translate(-50%, -50%) scaleX(0.92); }
          50% { opacity: 0.9; transform: translate(-50%, -50%) scaleX(1.08); }
        }
      `}</style>

      {/* Lens-flare ghosts along the sun→center axis */}
      {FLARES.map((f) => {
        const cx = SUN_X + f.t * (CENTER_X - SUN_X);
        const cy = SUN_Y + f.t * (CENTER_Y - SUN_Y);
        return (
          <div
            key={f.t}
            className="absolute"
            style={{
              left: cx - f.r,
              top: cy - f.r,
              width: f.r * 2,
              height: f.r * 2,
              borderRadius: '50%',
              background: f.ring ? 'transparent' : `radial-gradient(circle, ${f.color}, rgba(255,255,255,0) 70%)`,
              border: f.ring ? `1.5px solid ${f.color}` : undefined,
              filter: 'blur(0.6px)',
              pointerEvents: 'none',
              animation: `flare-shimmer ${4 + (f.r % 3)}s ease-in-out infinite`,
              animationDelay: `${f.t * 600}ms`,
            }}
          />
        );
      })}

      {/* Anchor at the sun's center; the sun and its rays are positioned relative to it */}
      <div className="absolute" style={{ top: SUN_Y, right: 54, width: 0, height: 0, pointerEvents: 'none' }}>
        {/* Wide soft bloom behind everything */}
        <div
          className="absolute"
          style={{
            top: 0,
            left: 0,
            width: 190,
            height: 190,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(255,247,237,0.5), rgba(253,224,71,0.22) 38%, rgba(245,158,11,0) 70%)',
            transform: 'translate(-50%, -50%)',
            filter: 'blur(4px)',
            animation: 'bloom-pulse 5s ease-in-out infinite',
          }}
        />

        {/* Diffuse rays — soft and blurred, slow single rotation (no crisp cartoon spokes) */}
        <div className="absolute" style={{ top: 0, left: 0, animation: 'sun-spin 60s linear infinite' }}>
          {RAYS.map((deg, i) => (
            <div
              key={deg}
              className="absolute"
              style={{
                top: 0,
                left: 0,
                width: 34,
                height: 6,
                background: 'linear-gradient(90deg, rgba(255,247,237,0.6), rgba(251,191,36,0))',
                transformOrigin: 'left center',
                transform: `rotate(${deg}deg) translateX(24px)`,
                filter: 'blur(2px)',
                animation: `ray-breathe ${3 + (i % 3) * 0.6}s ease-in-out infinite`,
                animationDelay: `${i * 110}ms`,
              }}
            />
          ))}
        </div>

        {/* Anamorphic flare star — long horizontal streak + shorter vertical, cool-tinted */}
        <div
          className="absolute"
          style={{
            top: 0,
            left: 0,
            width: 230,
            height: 2,
            background: STREAK_H,
            transform: 'translate(-50%, -50%)',
            filter: 'blur(0.6px)',
            animation: 'streak-pulse 4s ease-in-out infinite',
          }}
        />
        <div
          className="absolute"
          style={{
            top: 0,
            left: 0,
            width: 2,
            height: 120,
            background:
              'linear-gradient(180deg, rgba(191,219,254,0) 0%, rgba(255,255,255,0.85) 50%, rgba(191,219,254,0) 100%)',
            transform: 'translate(-50%, -50%)',
            filter: 'blur(0.6px)',
            animation: 'streak-pulse 4.6s ease-in-out infinite',
          }}
        />

        {/* Soft outer glow disc — blurred so the sun edge isn't a hard cartoon circle */}
        <div
          className="absolute"
          style={{
            top: 0,
            left: 0,
            width: 66,
            height: 66,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(255,251,235,0.95), rgba(253,224,71,0.6) 45%, rgba(245,158,11,0) 72%)',
            transform: 'translate(-50%, -50%)',
            filter: 'blur(3px)',
          }}
        />

        {/* White-hot core */}
        <div
          className="absolute"
          style={{
            top: 0,
            left: 0,
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 42% 38%, #ffffff, #fffbeb 30%, #fde68a 62%, #f59e0b 100%)',
            transform: 'translate(-50%, -50%)',
            filter: 'blur(0.5px)',
            animation: 'sun-core-pulse 4s ease-in-out infinite',
          }}
        />
      </div>
    </>
  );
}
