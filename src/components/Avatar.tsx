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
    const ringColor = streak.type === 'fire' ? 'ring-red-500' : 'ring-sky-400';
    const badgeBg = streak.type === 'fire' ? 'bg-red-500' : 'bg-sky-400';
    return (
      <div className="relative shrink-0">
        <img
          src={src || DEFAULT_AVATAR}
          alt={name}
          className={`
            ${sizeClass}
            shrink-0 rounded-full object-cover ring-2
            ${ringColor}
          `}
        />
        <span
          className={`
            absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] leading-none
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
