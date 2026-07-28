// Negative delays start each drop mid-flight, so none sit frozen at the box edge and positions are randomized
const RAIN_DROPS_15 = Array.from({ length: 15 }, (_, i) => ({
  id: i,
  left: `${(i / 15) * 100 + Math.sin(i * 1.7) * 5}%`,
  dur: `${0.9 + (i % 5) * 0.12}s`,
  delay: `-${(i * 137) % 1500}ms`,
}));

const RAIN_DROPS_22 = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  left: `${(i / 22) * 100 + Math.sin(i * 1.7) * 5}%`,
  dur: `${0.6 + (i % 4) * 0.1}s`,
  delay: `-${(i * 137) % 1500}ms`,
}));

export default function RainDrops({ heavy = false }: { heavy?: boolean }) {
  const drops = heavy ? RAIN_DROPS_22 : RAIN_DROPS_15;
  return (
    <>
      <style>{`
        @keyframes rain-fall {
          0% { transform: translateY(-20px) rotate(10deg); opacity: 0; }
          10% { opacity: 0.95; }
          90% { opacity: 0.95; }
          100% { transform: translateY(340px) rotate(10deg); opacity: 0; }
        }
      `}</style>
      {drops.map((d) => (
        <div
          key={d.id}
          className="absolute rounded-full"
          style={{
            left: d.left,
            top: 0,
            width: heavy ? 2.5 : 2,
            height: heavy ? 12 : 10,
            background: heavy ? 'rgba(226,232,240,0.95)' : 'rgba(255,255,255,0.9)',
            boxShadow: heavy ? '0 0 2px rgba(148,163,184,0.6)' : '0 0 2px rgba(96,165,250,0.5)',
            animation: `rain-fall ${d.dur} linear infinite`,
            animationDelay: d.delay,
          }}
        />
      ))}
    </>
  );
}
