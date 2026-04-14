import { orderBy } from 'es-toolkit';
import Pill from '@/components/Pill';
import Section from '@/components/Section.tsx';
import Avatar from '@/components/Avatar.tsx';
import { useDisplayName } from '@/contexts/DisplayNameContext.tsx';
import { useGameDataContext } from '@/contexts/GameDataContext.tsx';
import { useTeamsContext } from '@/contexts/TeamsContext.tsx';

export default function AvailablePlayers() {
  const { players, streaks } = useGameDataContext();
  const { availableIds, toggleAvailable } = useTeamsContext();
  const { displayName } = useDisplayName();

  return (
    <Section title="Available Players" actions={<Pill>{availableIds.length} players</Pill>}>
      <div
        className={`
          columns-1 gap-2
          [column-fill:_balance]
          sm:columns-2
        `}
      >
        {players &&
          orderBy(players, [(p) => displayName(p)], ['asc'])?.map((player) => (
            <label
              key={player.id}
              className={`
                mb-2 flex cursor-pointer break-inside-avoid items-center gap-2 rounded-xl border border-gray-200
                bg-white p-2 text-sm
                dark:border-gray-700 dark:bg-gray-800
              `}
            >
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={availableIds.includes(player.id)}
                onChange={() => toggleAvailable(player.id)}
              />
              <Avatar src={player.avatar} name={displayName(player)} streak={streaks[player.id]} />
              <span className="flex-1">{displayName(player)}</span>
              <span
                className={`
                  text-xs text-gray-500
                  dark:text-gray-400
                `}
              >
                {player.elo}
              </span>
            </label>
          ))}
      </div>
    </Section>
  );
}
