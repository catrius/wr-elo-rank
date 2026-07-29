import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Player, Match } from '@/types/common.ts';
import type { Streak } from '@/utils/streaks.ts';
import Avatar from '@/components/Avatar.tsx';
import RankBadge from '@/components/leaderboard/RankBadge.tsx';
import Last5 from '@/components/leaderboard/Last5.tsx';

// Shared row for both the Season and Weekly tables. Only the second column (`eloCell`) differs
// between tabs: Season passes an absolute Elo, Weekly passes a colored Elo delta.
export default function StatRow({
  player,
  rank,
  eloCell,
  wins,
  losses,
  total,
  linkToPlayer,
  displayName,
  streaks,
  matches = undefined,
  last5,
}: {
  player: Player;
  rank: number | null;
  eloCell: ReactNode;
  wins: number;
  losses: number;
  total: number;
  linkToPlayer: boolean;
  displayName: (p: Player) => string;
  streaks: Record<number, Streak>;
  matches?: Match[];
  last5: ('W' | 'L')[];
}) {
  return (
    <tr
      className={`
        group border-b border-gray-100 transition-colors
        hover:bg-gray-50
        dark:border-gray-800 dark:hover:bg-gray-800/40
      `}
    >
      <td
        className={`
          sticky left-0 z-10 max-w-[12rem] bg-white px-2 py-3 text-sm font-medium
          group-hover:bg-gray-50
          dark:bg-gray-900 dark:group-hover:bg-gray-800/40
        `}
      >
        <div className="flex items-center gap-2">
          <span className="flex w-6 shrink-0 justify-center text-gray-400 tabular-nums">
            <RankBadge rank={rank} />
          </span>
          {linkToPlayer ? (
            <Link
              to={`/players/${player.id}`}
              className={`
                flex min-w-0 items-center gap-2 text-indigo-600
                hover:underline
                dark:text-indigo-400
              `}
            >
              <Avatar src={player.avatar} name={displayName(player)} streak={streaks[player.id]} />
              <span className="min-w-0 break-words">{displayName(player)}</span>
            </Link>
          ) : (
            <span className="flex min-w-0 items-center gap-2">
              <Avatar src={player.avatar} name={displayName(player)} streak={streaks[player.id]} />
              <span className="min-w-0 break-words">{displayName(player)}</span>
            </span>
          )}
        </div>
      </td>
      <td className="px-2 py-3 text-right tabular-nums">{eloCell}</td>
      <td className="px-2 py-3 text-right tabular-nums">{wins}</td>
      <td className="px-2 py-3 text-right tabular-nums">{losses}</td>
      <td className="px-2 py-3 text-right tabular-nums">{total}</td>
      <td className="px-2 py-3 text-right tabular-nums">{total ? ((wins / total) * 100).toFixed(1) : 0}%</td>
      {matches !== undefined && (
        <td className="px-2 py-3">
          <Last5 results={last5} />
        </td>
      )}
    </tr>
  );
}
