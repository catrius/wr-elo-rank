// Two depth layers of driven snow: a dense far layer of small flakes and a sparser
// near layer of larger, faster, blurred flakes for parallax depth. Each flake carries
// its own drift (--dx/--dy) so paths fan out instead of marching in lockstep.
const FAR_FLAKES = Array.from({ length: 60 }, (_, i) => ({
  id: i,
  top: `${(i * 37) % 100}%`,
  size: 2 + (i % 3),
  dur: `${1.0 + (i % 5) * 0.16}s`,
  delay: `-${(i * 91) % 2200}ms`,
  dx: 460 + (i % 4) * 40,
  dy: 30 + (i % 3) * 12,
}));

const NEAR_FLAKES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  top: `${(i * 61) % 100}%`,
  size: 5 + (i % 3) * 2,
  dur: `${0.7 + (i % 4) * 0.12}s`,
  delay: `-${(i * 143) % 1600}ms`,
  dx: 540 + (i % 3) * 60,
  dy: 48 + (i % 3) * 16,
}));

// Wind wisps — tapered streaks that blow across the scene on the same down-right diagonal as the snow.
// Varied length/speed so faster, longer ones read as stronger gusts.
const WIND_STREAKS = [
  { top: '12%', width: 130, height: 2, dur: '1.7s', delay: '-900ms', opacity: 0.45 },
  { top: '18%', width: 150, height: 2, dur: '1.8s', delay: '-200ms', opacity: 0.55 },
  { top: '30%', width: 90, height: 2, dur: '2.6s', delay: '-1200ms', opacity: 0.35 },
  { top: '38%', width: 220, height: 3, dur: '1.2s', delay: '-1500ms', opacity: 0.6 },
  { top: '46%', width: 200, height: 3, dur: '1.4s', delay: '-700ms', opacity: 0.65 },
  { top: '58%', width: 110, height: 2, dur: '2.2s', delay: '-2000ms', opacity: 0.4 },
  { top: '66%', width: 180, height: 3, dur: '1.3s', delay: '-400ms', opacity: 0.6 },
  { top: '72%', width: 170, height: 2, dur: '1.6s', delay: '-500ms', opacity: 0.5 },
  { top: '84%', width: 80, height: 2, dur: '2.9s', delay: '-1600ms', opacity: 0.3 },
  { top: '92%', width: 200, height: 3, dur: '1.5s', delay: '-1100ms', opacity: 0.5 },
];

export default function Blizzard() {
  return (
    <>
      <style>{`
        @keyframes snow-blow {
          0% { transform: translate(-30px, -10px); opacity: 0; }
          10% { opacity: 0.9; }
          90% { opacity: 0.9; }
          100% { transform: translate(var(--dx), var(--dy)); opacity: 0; }
        }
        @keyframes wind-blow {
          0% { transform: translateX(-220px) translateY(-6px) rotate(4deg); opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { transform: translateX(520px) translateY(26px) rotate(4deg); opacity: 0; }
        }
        @keyframes blizzard-haze {
          0%, 100% { opacity: 0.12; }
          50% { opacity: 0.32; }
        }
      `}</style>
      {/* Whiteout haze — a faint white veil that pulses as gusts thicken the air */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(120deg, rgba(255,255,255,0.35), rgba(255,255,255,0) 60%)',
          animation: 'blizzard-haze 3.2s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      />
      {/* Wind wisps blowing across the scene */}
      {WIND_STREAKS.map((g) => (
        <div
          key={g.top}
          className="absolute"
          style={{
            top: g.top,
            left: 0,
            width: g.width,
            height: g.height,
            borderRadius: g.height,
            background: `linear-gradient(to right, transparent, rgba(255,255,255,${g.opacity}) 55%, transparent)`,
            filter: 'blur(0.4px)',
            animation: `wind-blow ${g.dur} linear infinite`,
            animationDelay: g.delay,
          }}
        />
      ))}
      {/* Far snow layer — dense field of small flakes */}
      {FAR_FLAKES.map((f) => (
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
            ['--dx' as string]: `${f.dx}px`,
            ['--dy' as string]: `${f.dy}px`,
          }}
        />
      ))}
      {/* Near snow layer — larger, faster, blurred flakes for parallax depth */}
      {NEAR_FLAKES.map((f) => (
        <div
          key={f.id}
          className="absolute rounded-full"
          style={{
            top: f.top,
            left: 0,
            width: f.size,
            height: f.size,
            background: 'rgba(255,255,255,0.98)',
            boxShadow: '0 0 4px rgba(255,255,255,0.9)',
            filter: 'blur(0.6px)',
            animation: `snow-blow ${f.dur} linear infinite`,
            animationDelay: f.delay,
            ['--dx' as string]: `${f.dx}px`,
            ['--dy' as string]: `${f.dy}px`,
          }}
        />
      ))}
    </>
  );
}
