import type { Player } from '@/types/common.ts';
import Pill from '@/components/Pill';
import Avatar from '@/components/Avatar.tsx';

interface Props {
  label: string;
  team: Player[];
  averageElo: number;
  onDragStart: (player: Player, from: 'A' | 'B') => (e: any) => void;
  onDragOver: (e: any) => void;
  onDrop: (e: any) => void;
  side: 'A' | 'B';
}

export default function TeamPanel({ label, team, averageElo, onDragStart, onDragOver, onDrop, side }: Props) {
  return (
    <div
      className={`
        rounded-xl border border-gray-200 p-3
        dark:border-gray-700
      `}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold">{label}</h3>
        {team.length > 0 && <Pill>{`Avg ${averageElo}`}</Pill>}
      </div>
      <div className="grid grid-cols-1 gap-2">
        {team.map((player) => (
          <div
            className={`
              flex cursor-grab items-center gap-2 rounded-xl border border-gray-200 bg-white p-2 text-sm
              focus:ring-2 focus:ring-indigo-500 focus:outline-none
              active:cursor-grabbing
              dark:border-gray-700 dark:bg-gray-800
            `}
            key={player.id}
            draggable
            onDragStart={onDragStart(player, side)}
          >
            <Avatar src={player.avatar} name={player.name} />
            {player.name}
          </div>
        ))}
      </div>
    </div>
  );
}
