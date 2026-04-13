import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import supabase from '@/lib/supabase.ts';
import type { Player } from '@/types/common.ts';

export default function PlayerPage() {
  const { id } = useParams<{ id: string }>();
  const [player, setPlayer] = useState<Player | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchPlayer = useCallback(async () => {
    const { data } = await supabase.from('player').select().eq('id', Number(id)).single();
    if (data) {
      setPlayer(data as Player);
      setName(data.name);
    }
  }, [id]);

  useEffect(() => {
    fetchPlayer();
  }, [fetchPlayer]);

  const handleSave = async () => {
    if (!player || name.trim() === '' || name.trim() === player.name) return;
    setSaving(true);
    await supabase.from('player').update({ name: name.trim() }).eq('id', player.id);
    await fetchPlayer();
    setSaving(false);
  };

  if (!player) {
    return (
      <div
        className={`
          min-h-screen bg-gradient-to-b from-gray-50 to-white text-gray-900
          dark:from-gray-950 dark:to-gray-900 dark:text-gray-100
        `}
      >
        <div
          className={`
            mx-auto max-w-6xl p-4
            md:p-8
          `}
        >
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`
        min-h-screen bg-gradient-to-b from-gray-50 to-white text-gray-900
        dark:from-gray-950 dark:to-gray-900 dark:text-gray-100
      `}
    >
      <div
        className={`
          mx-auto max-w-6xl p-4
          md:p-8
        `}
      >
        <Link
          to="/"
          className={`
            mb-6 inline-block text-sm text-blue-600
            hover:underline
            dark:text-blue-400
          `}
        >
          &larr; Back
        </Link>

        <div className="mb-6 flex items-center gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
            }}
            className={`
              w-auto rounded border border-gray-300 bg-transparent px-2 py-1 text-2xl font-bold tracking-tight
              md:text-3xl
              dark:border-gray-600
            `}
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || name.trim() === '' || name.trim() === player.name}
            className={`
              rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white
              hover:bg-blue-700
              disabled:opacity-50
            `}
          >
            &#10003;
          </button>
        </div>

        <div
          className={`
            mb-6 grid grid-cols-2 gap-4
            sm:grid-cols-4
          `}
        >
          <div
            className={`
              rounded-lg bg-white p-4 shadow
              dark:bg-gray-800
            `}
          >
            <div
              className={`
                text-sm text-gray-500
                dark:text-gray-400
              `}
            >
              Elo
            </div>
            <div className="text-2xl font-bold">{player.elo}</div>
          </div>
          <div
            className={`
              rounded-lg bg-white p-4 shadow
              dark:bg-gray-800
            `}
          >
            <div
              className={`
                text-sm text-gray-500
                dark:text-gray-400
              `}
            >
              Wins
            </div>
            <div className="text-2xl font-bold">{player.win}</div>
          </div>
          <div
            className={`
              rounded-lg bg-white p-4 shadow
              dark:bg-gray-800
            `}
          >
            <div
              className={`
                text-sm text-gray-500
                dark:text-gray-400
              `}
            >
              Losses
            </div>
            <div className="text-2xl font-bold">{player.total - player.win}</div>
          </div>
          <div
            className={`
              rounded-lg bg-white p-4 shadow
              dark:bg-gray-800
            `}
          >
            <div
              className={`
                text-sm text-gray-500
                dark:text-gray-400
              `}
            >
              Win Rate
            </div>
            <div className="text-2xl font-bold">
              {player.total ? ((player.win / player.total) * 100).toFixed(1) : 0}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
