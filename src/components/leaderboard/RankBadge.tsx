// Olympic-style crown colors for the top three ranks: gold, silver, bronze
const MEDAL_COLORS: Record<number, string> = {
  1: 'text-yellow-400',
  2: 'text-slate-400',
  3: 'text-amber-700',
};

function CrownIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M3 5 L7.5 10 L12 4 L16.5 10 L21 5 L19.5 17.5 L4.5 17.5 Z" />
      <circle cx="3" cy="5" r="1.2" />
      <circle cx="12" cy="4" r="1.2" />
      <circle cx="21" cy="5" r="1.2" />
      <rect x="4" y="18.5" width="16" height="2.6" rx="1" />
    </svg>
  );
}

export default function RankBadge({ rank }: { rank: number | null }) {
  if (rank === null) return <span className="text-gray-400">—</span>;
  const color = MEDAL_COLORS[rank];
  if (!color) return <>{rank}</>;
  return (
    <span title={`Rank ${rank}`} className="relative inline-flex h-6 w-6 items-center justify-center">
      <CrownIcon
        className={`
          h-6 w-6 drop-shadow-sm
          ${color}
        `}
      />
      <span
        className={`
          absolute inset-0 flex items-center justify-center pt-1 text-[10px] leading-none font-bold text-white
          [text-shadow:0_1px_2px_rgba(0,0,0,0.7)]
        `}
      >
        {rank}
      </span>
    </span>
  );
}
