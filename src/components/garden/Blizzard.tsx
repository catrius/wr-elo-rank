const SNOW_FLAKES = Array.from({ length: 26 }, (_, i) => ({
  id: i,
  top: `${(i * 53) % 100}%`,
  size: 2 + (i % 3),
  dur: `${1.1 + (i % 5) * 0.18}s`,
  delay: `-${(i * 91) % 2200}ms`,
  drift: 10 + (i % 4) * 6,
}));

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
