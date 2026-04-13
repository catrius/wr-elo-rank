const DEFAULT_AVATAR = 'https://cob0e2g1ourlhlk0.public.blob.vercel-storage.com/default.jpg';

export default function Avatar({ src, name, size = 'sm' }: { src: string | null; name: string; size?: 'sm' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'h-16 w-16' : 'h-6 w-6';
  return (
    <img
      src={src || DEFAULT_AVATAR}
      alt={name}
      className={`
        ${sizeClass}
        rounded-full object-cover
      `}
    />
  );
}
