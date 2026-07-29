import { useMemo } from 'react';
import { orderBy } from 'es-toolkit';
import Section from '@/components/Section.tsx';
import Avatar from '@/components/Avatar.tsx';
import { useDisplayName } from '@/contexts/DisplayNameContext.tsx';
import type { PlayerWeekStats, WeeklyDuo } from '@/utils/weeklyStats.ts';

function EloDelta({ delta }: { delta: number }) {
  if (delta > 0)
    return (
      <span
        className={`
          text-xs font-semibold text-green-600
          dark:text-green-400
        `}
      >
        +{delta} elo
      </span>
    );
  if (delta < 0)
    return (
      <span
        className={`
          text-xs font-semibold text-red-500
          dark:text-red-400
        `}
      >
        {delta} elo
      </span>
    );
  return (
    <span
      className={`
        text-xs font-semibold text-gray-400
        dark:text-gray-500
      `}
    >
      ±0 elo
    </span>
  );
}

function PlayerTile({ label, stat, sub }: { label: string; stat: PlayerWeekStats; sub: string }) {
  const { displayName } = useDisplayName();
  return (
    <div
      className={`
        flex flex-col items-center gap-1.5 rounded-xl border border-gray-100 bg-gray-50 p-3 text-center
        dark:border-gray-800 dark:bg-gray-800/50
      `}
    >
      <span
        className={`
          text-xs font-medium tracking-wide text-gray-500 uppercase
          dark:text-gray-400
        `}
      >
        {label}
      </span>
      <Avatar src={stat.player.avatar} name={displayName(stat.player)} />
      <span className="text-sm font-semibold">{displayName(stat.player)}</span>
      <span
        className={`
          text-xs text-gray-500
          dark:text-gray-400
        `}
      >
        {sub}
      </span>
      <EloDelta delta={stat.eloDelta} />
    </div>
  );
}

function DuoTile({ label, duo }: { label: string; duo: WeeklyDuo }) {
  const { displayName } = useDisplayName();
  const record = `${duo.wins}W–${duo.total - duo.wins}L`;
  return (
    <div
      className={`
        flex flex-col items-center gap-1.5 rounded-xl border border-gray-100 bg-gray-50 p-3 text-center
        dark:border-gray-800 dark:bg-gray-800/50
      `}
    >
      <span
        className={`
          text-xs font-medium tracking-wide text-gray-500 uppercase
          dark:text-gray-400
        `}
      >
        {label}
      </span>
      <div className="flex items-center gap-1">
        <Avatar src={duo.playerA.avatar} name={displayName(duo.playerA)} />
        <Avatar src={duo.playerB.avatar} name={displayName(duo.playerB)} />
      </div>
      <span className="text-sm leading-tight font-semibold">
        <span className="block">{displayName(duo.playerA)}</span>
        <span
          className={`
            block text-xs font-normal text-gray-400
            dark:text-gray-500
          `}
        >
          &
        </span>
        <span className="block">{displayName(duo.playerB)}</span>
      </span>
      <span
        className={`
          text-xs text-indigo-600
          dark:text-indigo-400
        `}
      >
        {record} ({Math.round((duo.wins / duo.total) * 100)}%)
      </span>
    </div>
  );
}

export default function WeeklyCard({
  weeklyStats,
  weekMatchCount,
  chemistry,
  onViewWeekly,
}: {
  weeklyStats: PlayerWeekStats[];
  weekMatchCount: number;
  chemistry: { good: WeeklyDuo | null; bad: WeeklyDuo | null };
  onViewWeekly: () => void;
}) {
  const playerTiles = useMemo(() => {
    const byDelta = orderBy(weeklyStats, [(s) => s.eloDelta], ['desc']);
    const mostImproved = byDelta[0]?.eloDelta > 0 ? byDelta[0] : null;
    const roughWeek = byDelta[byDelta.length - 1]?.eloDelta < 0 ? byDelta[byDelta.length - 1] : null;
    const deduped = roughWeek?.player.id !== mostImproved?.player.id ? roughWeek : null;

    return [
      mostImproved
        ? { label: 'Most Improved', stat: mostImproved, sub: `${mostImproved.wins}W–${mostImproved.losses}L` }
        : null,
      deduped ? { label: 'Rough Week', stat: deduped, sub: `${deduped.wins}W–${deduped.losses}L` } : null,
    ].filter((t): t is { label: string; stat: PlayerWeekStats; sub: string } => t !== null);
  }, [weeklyStats]);

  const hasContent = playerTiles.length > 0 || chemistry.good || chemistry.bad;
  if (!hasContent) return null;

  return (
    <Section
      title="Weekly Spotlight"
      actions={
        <button
          type="button"
          onClick={onViewWeekly}
          className={`
            cursor-pointer rounded-lg bg-indigo-600 px-3 py-1 text-xs font-medium text-white transition-colors
            hover:bg-indigo-700
            dark:bg-indigo-500 dark:hover:bg-indigo-400
          `}
        >
          Full rankings →
        </button>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        {playerTiles.map((t) => (
          <PlayerTile key={t.label} label={t.label} stat={t.stat} sub={t.sub} />
        ))}
        {chemistry.good && <DuoTile label="Good Chemistry" duo={chemistry.good} />}
        {chemistry.bad && <DuoTile label="Bad Chemistry" duo={chemistry.bad} />}
      </div>
      <div
        className={`
          mt-3 border-t border-gray-100 pt-3 text-center text-xs text-gray-400
          dark:border-gray-800 dark:text-gray-500
        `}
      >
        {weekMatchCount} {weekMatchCount === 1 ? 'match' : 'matches'} · {weeklyStats.length}{' '}
        {weeklyStats.length === 1 ? 'player' : 'players'} active
      </div>
    </Section>
  );
}
