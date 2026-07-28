const SNOW_FLAKES = Array.from({ length: 26 }, (_, i) => ({
  id: i,
  top: `${(i * 53) % 100}%`,
  size: 2 + (i % 3),
  dur: `${1.1 + (i % 5) * 0.18}s`,
  delay: `-${(i * 91) % 2200}ms`,
  drift: 10 + (i % 4) * 6,
}));

// Wind wisps — tapered streaks that blow across the scene on the same down-right diagonal as the snow.
// Varied length/speed so faster, longer ones read as stronger gusts.
const WIND_STREAKS = [
  { top: '18%', width: 150, height: 2, dur: '1.8s', delay: '-200ms', opacity: 0.55 },
  { top: '30%', width: 90, height: 2, dur: '2.6s', delay: '-1200ms', opacity: 0.35 },
  { top: '46%', width: 200, height: 3, dur: '1.4s', delay: '-700ms', opacity: 0.65 },
  { top: '58%', width: 110, height: 2, dur: '2.2s', delay: '-2000ms', opacity: 0.4 },
  { top: '72%', width: 170, height: 2, dur: '1.6s', delay: '-500ms', opacity: 0.5 },
  { top: '84%', width: 80, height: 2, dur: '2.9s', delay: '-1600ms', opacity: 0.3 },
];

export default function Blizzard() {
  return (
    <>
      <style>{`
        @keyframes snow-blow {
          0% { transform: translateX(-30px) translateY(-10px); opacity: 0; }
          10% { opacity: 0.9; }
          90% { opacity: 0.9; }
          100% { transform: translateX(500px) translateY(40px); opacity: 0; }
        }
        @keyframes wind-blow {
          0% { transform: translateX(-220px) translateY(-6px) rotate(4deg); opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { transform: translateX(520px) translateY(26px) rotate(4deg); opacity: 0; }
        }
      `}</style>
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
