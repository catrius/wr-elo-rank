import { useState, useMemo, useCallback } from 'react';
import { orderBy } from 'es-toolkit';
import type { Player, Pairing } from '@/types/common.ts';
import supabase from '@/lib/supabase.ts';
import Avatar from '@/components/Avatar.tsx';

interface Props {
  players: Player[] | null;
  pairings: Pairing[] | null;
  onRefresh: () => void;
}

function PlayerSelect({
  players,
  value,
  onChange,
  label,
  excludeId = null,
}: {
  players: Player[];
  value: number | null;
  onChange: (id: number | null) => void;
  label: string;
  excludeId?: number | null;
}) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      aria-label={label}
      className={`
        w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm
        dark:border-gray-700 dark:bg-gray-800
      `}
    >
      <option value="">Select player</option>
      {players
        .filter((p) => (excludeId ? p.id !== excludeId : true))
        .map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
    </select>
  );
}

export default function Pairings({ players, pairings, onRefresh }: Props) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [player1, setPlayer1] = useState<number | null>(null);
  const [player2, setPlayer2] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const sortedPlayers = useMemo(() => (players ? orderBy(players, ['name'], ['asc']) : []), [players]);

  const playerMap = useMemo(() => {
    const map: Record<number, Player> = {};
    players?.forEach((p) => {
      map[p.id] = p;
    });
    return map;
  }, [players]);

  const startAdd = useCallback(() => {
    setIsAdding(true);
    setEditingId(null);
    setPlayer1(null);
    setPlayer2(null);
  }, []);

  const startEdit = useCallback((pairing: Pairing) => {
    setIsAdding(false);
    setEditingId(pairing.id);
    setPlayer1(pairing.player1);
    setPlayer2(pairing.player2);
  }, []);

  const cancel = useCallback(() => {
    setIsAdding(false);
    setEditingId(null);
    setPlayer1(null);
    setPlayer2(null);
  }, []);

  const save = useCallback(async () => {
    if (!player1 || !player2) return;

    if (editingId) {
      await supabase.from('pairing').update({ player1, player2 }).eq('id', editingId);
    } else {
      await supabase.from('pairing').insert([{ player1, player2 }]);
    }

    cancel();
    onRefresh();
  }, [player1, player2, editingId, cancel, onRefresh]);

  const deletePairing = useCallback(
    async (id: number) => {
      await supabase.from('pairing').delete().eq('id', id);
      onRefresh();
    },
    [onRefresh],
  );

  const isEditing = (id: number) => editingId === id;

  return (
    <div className="flex flex-col gap-3">
      {/* Existing pairings */}
      {pairings && pairings.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {pairings.map((pairing) => {
            const editing = isEditing(pairing.id);
            const p1 = pairing.player1 ? playerMap[pairing.player1] : null;
            const p2 = pairing.player2 ? playerMap[pairing.player2] : null;

            return (
              <li
                key={pairing.id}
                className={`
                  flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2
                  dark:border-gray-800
                `}
              >
                <div className="flex min-w-0 flex-col gap-2">
                  {editing ? (
                    <PlayerSelect
                      players={sortedPlayers}
                      value={player1}
                      onChange={setPlayer1}
                      label="Player 1"
                      excludeId={player2}
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <Avatar src={p1?.avatar ?? null} name={p1?.name ?? '?'} />
                      <span className="truncate text-sm font-medium">{p1?.name ?? '?'}</span>
                    </div>
                  )}
                  {editing ? (
                    <PlayerSelect
                      players={sortedPlayers}
                      value={player2}
                      onChange={setPlayer2}
                      label="Player 2"
                      excludeId={player1}
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <Avatar src={p2?.avatar ?? null} name={p2?.name ?? '?'} />
                      <span className="truncate text-sm font-medium">{p2?.name ?? '?'}</span>
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  {editing ? (
                    <>
                      <button
                        type="button"
                        onClick={save}
                        disabled={!player1 || !player2}
                        className={`
                          cursor-pointer rounded px-2 py-1 text-xs font-medium text-indigo-600 transition-colors
                          hover:bg-indigo-50
                          disabled:cursor-not-allowed disabled:opacity-50
                          dark:text-indigo-400 dark:hover:bg-indigo-950
                        `}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={cancel}
                        className={`
                          cursor-pointer rounded px-2 py-1 text-xs text-gray-500 transition-colors
                          hover:bg-gray-100
                          dark:text-gray-400 dark:hover:bg-gray-800
                        `}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => startEdit(pairing)}
                        className={`
                          cursor-pointer rounded px-2 py-1 text-xs text-gray-500 transition-colors
                          hover:bg-gray-100 hover:text-gray-700
                          dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200
                        `}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deletePairing(pairing.id)}
                        className={`
                          cursor-pointer rounded px-2 py-1 text-xs text-red-500 transition-colors
                          hover:bg-red-50 hover:text-red-700
                          dark:text-red-400 dark:hover:bg-red-950 dark:hover:text-red-300
                        `}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p
          className={`
            text-center text-sm text-gray-500
            dark:text-gray-400
          `}
        >
          No pairings yet
        </p>
      )}

      {/* Add new pairing (inline) */}
      {isAdding ? (
        <div
          className={`
            flex items-center justify-between rounded-lg border border-dashed border-gray-300 px-3 py-2
            dark:border-gray-700
          `}
        >
          <div className="flex min-w-0 flex-col gap-2">
            <PlayerSelect
              players={sortedPlayers}
              value={player1}
              onChange={setPlayer1}
              label="Player 1"
              excludeId={player2}
            />
            <PlayerSelect
              players={sortedPlayers}
              value={player2}
              onChange={setPlayer2}
              label="Player 2"
              excludeId={player1}
            />
          </div>
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={save}
              disabled={!player1 || !player2}
              className={`
                cursor-pointer rounded px-2 py-1 text-xs font-medium text-indigo-600 transition-colors
                hover:bg-indigo-50
                disabled:cursor-not-allowed disabled:opacity-50
                dark:text-indigo-400 dark:hover:bg-indigo-950
              `}
            >
              Save
            </button>
            <button
              type="button"
              onClick={cancel}
              className={`
                cursor-pointer rounded px-2 py-1 text-xs text-gray-500 transition-colors
                hover:bg-gray-100
                dark:text-gray-400 dark:hover:bg-gray-800
              `}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={startAdd}
          className={`
            cursor-pointer rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500
            transition-colors
            hover:border-gray-400 hover:text-gray-700
            dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-300
          `}
        >
          + Add Pair
        </button>
      )}
    </div>
  );
}
