import { useState, useMemo, useCallback } from 'react';
import { orderBy } from 'es-toolkit';
import { Link } from 'react-router-dom';
import type { Player } from '@/types/common.ts';
import type { Streak } from '@/utils/streaks.ts';
import Section from '@/components/Section.tsx';
import Avatar from '@/components/Avatar.tsx';
import { useDisplayName } from '@/contexts/DisplayNameContext.tsx';

type SortKey = 'name' | 'elo' | 'win' | 'losses' | 'total' | 'winrate';

function SortIndicator({ sortKey, current }: { sortKey: SortKey; current: { key: SortKey; dir: 'asc' | 'desc' } }) {
  if (current.key !== sortKey) return <>&#9654;</>;
  return current.dir === 'asc' ? <>&#9650;</> : <>&#9660;</>;
}

export default function Leaderboard({
  players,
  streaks,
  linkToPlayer = true,
}: {
  players: Player[] | null;
  streaks: Record<number, Streak>;
  linkToPlayer?: boolean;
}) {
  const { displayName } = useDisplayName();

  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({
    key: 'elo',
    dir: 'desc',
  });

  const toggleSort = useCallback((key: SortKey) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: key === 'name' ? 'asc' : 'desc' },
    );
  }, []);

  const sortedPlayers = useMemo(() => {
    if (!players) return [];
    const iteratee = (p: Player) => {
      switch (sort.key) {
        case 'losses':
          return p.total - p.win;
        case 'winrate':
          return p.total ? p.win / p.total : -Infinity; // puts 0-games at bottom for desc
        case 'name':
          return displayName(p);
        case 'elo':
          return p.elo;
        case 'win':
          return p.win;
        case 'total':
          return p.total;
        default:
          return 0;
      }
    };
    // Second key 'name' for stable/pleasant ordering on ties
    return orderBy(players, [iteratee, (p) => displayName(p)], [sort.dir, 'asc']);
  }, [players, sort, displayName]);

  const columns: { key: SortKey; label: string; align: 'left' | 'right' }[] = [
    { key: 'name', label: 'Player', align: 'left' },
    { key: 'elo', label: 'Elo', align: 'right' },
    { key: 'win', label: 'Wins', align: 'right' },
    { key: 'losses', label: 'Losses', align: 'right' },
    { key: 'total', label: 'Total', align: 'right' },
    { key: 'winrate', label: 'Win Rate', align: 'right' },
  ];

  return (
    <Section title="Elo Ratings">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead
            className={`
              bg-gray-100
              dark:bg-gray-800
            `}
          >
            <tr>
              <th className="px-3 py-2 text-left font-semibold">#</th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`
                    px-3 py-2 font-semibold
                    ${col.align === 'left' ? 'text-left' : 'text-right'}
                  `}
                >
                  <button type="button" onClick={() => toggleSort(col.key)} className="inline-flex items-center gap-1">
                    {col.label} <SortIndicator sortKey={col.key} current={sort} />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedPlayers?.map((row, i) => (
              <tr
                key={row.id}
                className={
                  i % 2
                    ? `
                      bg-white
                      dark:bg-gray-900
                    `
                    : `
                      bg-gray-50
                      dark:bg-gray-950
                    `
                }
              >
                <td className="px-3 py-2">{i + 1}</td>
                <td className="min-w-40 px-3 py-2">
                  {linkToPlayer ? (
                    <Link
                      to={`/players/${row.id}`}
                      className={`
                        inline-flex items-center gap-2 text-indigo-600
                        hover:underline
                        dark:text-indigo-400
                      `}
                    >
                      <Avatar src={row.avatar} name={displayName(row)} streak={streaks[row.id]} />
                      {displayName(row)}
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <Avatar src={row.avatar} name={displayName(row)} streak={streaks[row.id]} />
                      {displayName(row)}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">{row.elo}</td>
                <td className="px-3 py-2 text-right">{row.win}</td>
                <td className="px-3 py-2 text-right">{row.total - row.win}</td>
                <td className="px-3 py-2 text-right">{row.total}</td>
                <td className="px-3 py-2 text-right">{row.total ? ((row.win / row.total) * 100).toFixed(1) : 0}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
