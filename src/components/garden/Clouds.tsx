interface Cloud {
  top: number;
  left?: string;
  right?: string;
  w: number;
  h: number;
  anim: string;
  puffs: string[];
}

export default function Clouds({ dark = false }: { dark?: boolean }) {
  // Soft, slightly cool off-white on day skies; muted slate on stormy night skies
  const color = dark ? 'rgba(100,116,139,0.8)' : 'rgba(236,242,248,0.8)';
  // A fuller cloud field. Each cloud is an ellipse plus several box-shadow "puffs" for a lumpy silhouette.
  // The first cloud (top-left, cloud-drift-1) is the one Lightning syncs to — keep it first.
  const clouds: Cloud[] = [
    {
      top: 16,
      left: '10%',
      w: 96,
      h: 30,
      anim: 'cloud-drift-1 6s',
      puffs: ['24px -16px 0 4px', '-22px -8px 0 0', '50px -4px 0 -2px', '2px -22px 0 -2px'],
    },
    {
      top: 28,
      right: '8%',
      w: 76,
      h: 25,
      anim: 'cloud-drift-2 7s',
      puffs: ['18px -13px 0 3px', '-18px -6px 0 0', '36px -3px 0 -3px'],
    },
    {
      top: 60,
      left: '32%',
      w: 88,
      h: 27,
      anim: 'cloud-drift-2 9s',
      puffs: ['22px -15px 0 4px', '-22px -7px 0 0', '44px -4px 0 -2px', '-4px -20px 0 -3px'],
    },
    {
      top: 8,
      left: '48%',
      w: 62,
      h: 21,
      anim: 'cloud-drift-1 8s',
      puffs: ['14px -11px 0 2px', '-14px -4px 0 0', '28px -2px 0 -3px'],
    },
    {
      top: 72,
      right: '24%',
      w: 72,
      h: 23,
      anim: 'cloud-drift-1 7.5s',
      puffs: ['16px -12px 0 3px', '-16px -5px 0 0', '32px -3px 0 -3px'],
    },
    {
      top: 42,
      right: '42%',
      w: 54,
      h: 19,
      anim: 'cloud-drift-2 8.5s',
      puffs: ['13px -9px 0 2px', '-12px -4px 0 0', '24px -2px 0 -3px'],
    },
  ];
  return (
    <>
      <style>{`
        @keyframes cloud-drift-1 { 0% { transform: translateX(-10px); } 100% { transform: translateX(10px); } }
        @keyframes cloud-drift-2 { 0% { transform: translateX(8px); } 100% { transform: translateX(-8px); } }
      `}</style>
      {clouds.map((c) => (
        <div
          key={`${c.top}-${c.left ?? c.right}`}
          className="absolute rounded-full"
          style={{
            top: c.top,
            left: c.left,
            right: c.right,
            width: c.w,
            height: c.h,
            background: color,
            animation: `${c.anim} ease-in-out infinite alternate`,
            boxShadow: c.puffs.map((p) => `${p} ${color}`).join(', '),
          }}
        />
      ))}
    </>
  );
}
