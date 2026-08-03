// Sunny = best form. A few phoenixes glide across the bright sky on a gentle rising path,
// each cycling a 6-frame wing-flap sprite. Varied size/speed gives depth (smaller, slower
// birds read as further away). The sprite faces right; birds flying right-to-left are
// mirrored (scaleX(-1)) so they always face their direction of travel.

// phoenix.png is a horizontal 6-frame flap strip, each cell FRAME_W×FRAME_H.
const FRAME_W = 32;
const FRAME_H = 32;
const FRAMES = 6;
const SHEET_W = FRAME_W * FRAMES;

const BIRDS = [
  { top: '16%', dur: '15s', delay: '0s', scale: 1.05, flap: '0.9s', dir: 'ltr' },
  { top: '26%', dur: '19s', delay: '-6s', scale: 0.75, flap: '1.1s', dir: 'rtl' },
  { top: '11%', dur: '17s', delay: '-11s', scale: 0.95, flap: '1s', dir: 'ltr' },
  { top: '32%', dur: '22s', delay: '-3s', scale: 0.65, flap: '1.25s', dir: 'rtl' },
  { top: '21%', dur: '13s', delay: '-15s', scale: 0.85, flap: '0.85s', dir: 'ltr' },
] as const;

export default function Birds() {
  return (
    <>
      <style>{`
        @keyframes bird-fly {
          0% { transform: translate(-48px, 0); opacity: 0; }
          8% { opacity: 1; }
          92% { opacity: 1; }
          100% { transform: translate(520px, -34px); opacity: 0; }
        }
        @keyframes bird-fly-rtl {
          0% { transform: translate(520px, 0); opacity: 0; }
          8% { opacity: 1; }
          92% { opacity: 1; }
          100% { transform: translate(-48px, -34px); opacity: 0; }
        }
        @keyframes bird-flap {
          from { background-position: 0 0; }
          to { background-position: -${SHEET_W}px 0; }
        }
      `}</style>
      {BIRDS.map((b) => (
        <div
          key={b.top}
          className="absolute"
          style={{
            top: b.top,
            left: 0,
            animation: `${b.dir === 'rtl' ? 'bird-fly-rtl' : 'bird-fly'} ${b.dur} linear infinite`,
            animationDelay: b.delay,
            pointerEvents: 'none',
          }}
        >
          {/* Sprite cell — flap cycled via stepped background-position; mirrored when flying right-to-left */}
          <div
            style={{
              width: FRAME_W,
              height: FRAME_H,
              backgroundImage: 'url(/garden/phoenix.png)',
              backgroundSize: `${SHEET_W}px ${FRAME_H}px`,
              imageRendering: 'pixelated',
              transform: `scale(${b.scale})${b.dir === 'rtl' ? ' scaleX(-1)' : ''}`,
              transformOrigin: 'center',
              animation: `bird-flap ${b.flap} steps(${FRAMES}) infinite`,
              animationDelay: b.delay,
            }}
          />
        </div>
      ))}
    </>
  );
}
