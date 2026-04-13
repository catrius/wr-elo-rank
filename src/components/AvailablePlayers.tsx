import { orderBy } from 'es-toolkit';
import type { Player } from '@/types/common.ts';
import Pill from '@/components/Pill';
import Section from '@/components/Section.tsx';
import Avatar from '@/components/Avatar.tsx';

interface Props {
  players: Player[] | null;
  availableIds: number[];
  onToggle: (id: number) => void;
}

export default function AvailablePlayers({ players, availableIds, onToggle }: Props) {
  return (
    <Section title="Available Players" actions={<Pill>Total {availableIds.length}</Pill>}>
      <div
        className={`
          columns-1 gap-2
          [column-fill:_balance]
          sm:columns-2
        `}
      >
        {players &&
          orderBy(players, ['name'], ['asc'])?.map((player) => (
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
                onChange={() => onToggle(player.id)}
              />
              <Avatar src={player.avatar} name={player.name} />
              <span className="flex-1">{player.name}</span>
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
