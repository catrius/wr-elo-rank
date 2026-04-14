import { Link } from 'react-router-dom';

interface SeasonEntry {
  id: number;
  name: string | null;
  end: string | null;
}

export default function SeasonNav({ seasons, currentId = undefined }: { seasons: SeasonEntry[]; currentId?: number }) {
  if (seasons.length === 0) return null;

  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {seasons.map((s) => {
        const isCurrent = !s.end;
        const isActive = s.id === currentId || (isCurrent && currentId === undefined);
        return (
          <Link
            key={s.id}
            to={isCurrent ? '/' : `/season/${s.id}`}
            className={`
              rounded-lg border px-3 py-1.5 text-sm font-medium shadow-sm transition-colors
              ${
                isActive
                  ? `
                    border-indigo-300 bg-indigo-50 text-indigo-700
                    dark:border-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-300
                  `
                  : `
                    border-gray-200 bg-white
                    hover:bg-gray-100
                    dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700
                  `
              }
            `}
          >
            {s.name ?? `Season ${s.id}`}
          </Link>
        );
      })}
    </div>
  );
}
