import type { Player } from '@/types/common.ts';
import { useMemo, useState, type Dispatch, type SetStateAction, useCallback } from 'react';
import { difference } from 'es-toolkit';

interface Props {
  players: Player[] | null;
  selectedPlayers: Player[] | null;
  setTeam: Dispatch<SetStateAction<string[]>>;
  team: string[];
}

function PlayerSelect({ players, selectedPlayers, setTeam, team }: Props) {
  const selectable = useMemo(() => difference(players || [], selectedPlayers || []), [players, selectedPlayers]);
  const [selected, setSelected] = useState<string>('');

  const handleChange = useCallback(
    (value: string) => {
      setTeam([...team, value]);
      setSelected(value);
    },
    [setTeam, team],
  );

  return (
    <label className="flex flex-col gap-1 text-sm">
      <select
        className={`
          rounded-xl border border-gray-200 bg-white p-2
          focus:ring-2 focus:ring-indigo-500 focus:outline-none
          dark:border-gray-700 dark:bg-gray-800
        `}
        value={selected}
        onChange={(e) => handleChange(e.target.value)}
      >
        <option key="" value="">
          Select player
        </option>
        {selectable.map((player) => (
          <option key={player.id} value={player.id}>
            {player.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export default PlayerSelect;
