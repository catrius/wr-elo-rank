import type { Streak } from '@/utils/streaks.ts';

const DEFAULT_AVATAR = 'https://cob0e2g1ourlhlk0.public.blob.vercel-storage.com/default.jpg';

export default function Avatar({
  src,
  name,
  size = 'sm',
  streak = undefined,
}: {
  src: string | null;
  name: string;
  size?: 'sm' | 'lg';
  streak?: Streak;
}) {
  const sizeClass = size === 'lg' ? 'h-16 w-16' : 'h-8 w-8';

  if (streak) {
    const isFire = streak.type === 'fire';
    const ringGradient = isFire
      ? 'conic-gradient(from 0deg, #dc2626, #ea580c, #f59e0b, #fde047, #f97316, #ea580c, #dc2626)'
      : 'conic-gradient(from 0deg, #1e40af, #0ea5e9, #e0f2fe, #67e8f9, #0ea5e9, #1e40af)';
    const ringAnim = isFire ? 'animate-[fire-spin_1.8s_linear_infinite]' : 'animate-[ice-spin_6s_linear_infinite]';
    const glow = isFire ? 'shadow-md shadow-orange-500/70' : 'shadow-md shadow-sky-400/60';
    const badgeBg = isFire ? 'bg-orange-500' : 'bg-sky-500';

    return (
      <div className="relative shrink-0">
        {/* clip container: ring is clipped here, badge floats outside */}
        <div
          className={`
            relative overflow-hidden rounded-full p-0.5
            ${glow}
          `}
        >
          {/* spinning conic gradient ring */}
          <div
            className={`
              absolute -inset-3
              ${ringAnim}
            `}
            style={{ background: ringGradient }}
          />
          <img
            src={src || DEFAULT_AVATAR}
            alt={name}
            className={`
              ${sizeClass}
              relative z-10 block shrink-0 rounded-full object-cover
            `}
          />
        </div>
        <span
          className={`
            absolute -top-1 -right-1 z-20 flex h-4 w-4 items-center justify-center rounded-full text-[10px] leading-none
            font-bold text-white
            ${badgeBg}
          `}
        >
          {streak.count}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src || DEFAULT_AVATAR}
      alt={name}
      className={`
        ${sizeClass}
        shrink-0 rounded-full object-cover
      `}
    />
  );
}
