// Multiple bolts, each drifting under a cloud and flashing on its own staggered rhythm. The first is synced to
// the top-left cloud (cloud-drift-1) as before; negative delays desynchronize the rest so strikes come often.
const LIGHTNING_BOLTS: {
  left: string;
  top: number;
  scale: number;
  drift: string;
  dur: string;
  delay: string;
  points: string;
}[] = [
  {
    left: '18%',
    top: 32,
    scale: 1,
    drift: 'cloud-drift-1 6s',
    dur: '3.5s',
    delay: '0s',
    points: '14,0 6,18 12,18 4,40',
  },
  {
    left: '60%',
    top: 40,
    scale: 0.8,
    drift: 'cloud-drift-2 7s',
    dur: '4.2s',
    delay: '-1.6s',
    points: '12,0 5,16 11,16 3,36',
  },
  {
    left: '82%',
    top: 28,
    scale: 0.65,
    drift: 'cloud-drift-1 8s',
    dur: '5s',
    delay: '-3.1s',
    points: '13,0 6,15 12,15 5,34',
  },
  {
    left: '38%',
    top: 70,
    scale: 0.7,
    drift: 'cloud-drift-2 8.5s',
    dur: '4.7s',
    delay: '-2.3s',
    points: '12,0 5,17 11,17 4,38',
  },
];

export default function Lightning() {
  return (
    <>
      <style>{`
        @keyframes bolt-drift { 0% { transform: translateX(-10px); } 100% { transform: translateX(10px); } }
        @keyframes lightning-flash {
          0%, 42%, 100% { opacity: 0; }
          44% { opacity: 1; }
          47% { opacity: 0.15; }
          50% { opacity: 1; }
          55% { opacity: 0; }
        }
        @keyframes sky-flash {
          0%, 40%, 100% { opacity: 0; }
          44% { opacity: 0.28; }
          48% { opacity: 0.06; }
          52% { opacity: 0.22; }
          58% { opacity: 0; }
        }
      `}</style>
      {/* Ambient full-frame flash lighting up the sky, timed with the lead bolt */}
      <div
        className="absolute inset-0"
        style={{
          background: 'rgba(255,255,255,1)',
          animation: 'sky-flash 3.5s ease-out infinite',
          pointerEvents: 'none',
        }}
      />
      {LIGHTNING_BOLTS.map((b) => (
        <div
          key={b.left}
          className="absolute"
          style={{
            top: b.top,
            left: b.left,
            animation: `${b.drift} ease-in-out infinite alternate, lightning-flash ${b.dur} ease-out infinite`,
            animationDelay: `0s, ${b.delay}`,
          }}
        >
          <svg
            width={20 * b.scale}
            height={40 * b.scale}
            viewBox="0 0 20 40"
            style={{ filter: 'drop-shadow(0 0 5px rgba(253,224,71,0.9))' }}
          >
            <polyline points={b.points} fill="none" stroke="#fde047" strokeWidth="2.5" strokeLinejoin="round" />
          </svg>
        </div>
      ))}
    </>
  );
}
