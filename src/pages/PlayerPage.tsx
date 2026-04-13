import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { upload } from '@vercel/blob/client';
import supabase from '@/lib/supabase.ts';
import type { Player, Match } from '@/types/common.ts';
import Avatar from '@/components/Avatar.tsx';

export default function PlayerPage() {
  const { id } = useParams<{ id: string }>();
  const playerId = Number(id);
  const [player, setPlayer] = useState<Player | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPlayer = useCallback(async () => {
    const { data } = await supabase.from('player').select().eq('id', playerId).single();
    if (data) {
      setPlayer(data as Player);
      setName(data.name);
    }
  }, [playerId]);

  const fetchMatches = useCallback(async () => {
    const { data } = await supabase
      .from('match')
      .select()
      .or(`team_a_players.cs.{${playerId}},team_b_players.cs.{${playerId}}`);
    if (data) setMatches(data as Match[]);
  }, [playerId]);

  const allTimeStats = useMemo(() => {
    const completed = matches.filter((m) => m.result === 'A' || m.result === 'B');
    const wins = completed.filter((m) => {
      const onTeamA = m.team_a_players.includes(playerId);
      return (onTeamA && m.result === 'A') || (!onTeamA && m.result === 'B');
    }).length;
    const total = completed.length;
    return { wins, losses: total - wins, total, winRate: total ? ((wins / total) * 100).toFixed(1) : '0' };
  }, [matches, playerId]);

  useEffect(() => {
    fetchPlayer();
    fetchMatches();
  }, [fetchPlayer, fetchMatches]);

  const handleAvatarChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !player) return;

      setUploading(true);
      try {
        const blob = await upload(`avatars/${player.id}-${Date.now()}`, file, {
          access: 'public',
          handleUploadUrl: '/api/upload',
        });
        await supabase.from('player').update({ avatar: blob.url }).eq('id', player.id);
        await fetchPlayer();
      } catch (err) {
        // eslint-disable-next-line no-alert
        alert(`Upload failed: ${(err as Error).message}`);
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [player, fetchPlayer],
  );

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

        <div className="mb-6 flex items-stretch gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className={`
              group relative shrink-0 cursor-pointer self-center rounded-full
              disabled:cursor-wait disabled:opacity-50
            `}
          >
            <Avatar src={player.avatar} name={player.name} size="lg" />
            <span
              className={`
                absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gray-700 text-white
              `}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
                <path
                  d={
                    'M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885' +
                    'L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z'
                  }
                />
              </svg>
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={handleAvatarChange}
          />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
            }}
            className={`
              min-w-0 flex-1 rounded border border-gray-300 bg-transparent px-2 py-1 text-2xl font-bold tracking-tight
              md:text-3xl
              dark:border-gray-600
            `}
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || name.trim() === '' || name.trim() === player.name}
            className={`
              shrink-0 rounded bg-blue-600 px-6 py-1.5 text-xl font-medium text-white
              hover:bg-blue-700
              disabled:opacity-50
            `}
          >
            &#10003;
          </button>
        </div>

        <h2
          className={`
            mb-4 text-lg font-semibold
            md:text-xl
          `}
        >
          Current Season
        </h2>
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

        <h2
          className={`
            mb-4 text-lg font-semibold
            md:text-xl
          `}
        >
          All Time
        </h2>
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
              Total
            </div>
            <div className="text-2xl font-bold">{allTimeStats.total}</div>
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
            <div className="text-2xl font-bold">{allTimeStats.wins}</div>
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
            <div className="text-2xl font-bold">{allTimeStats.losses}</div>
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
            <div className="text-2xl font-bold">{allTimeStats.winRate}%</div>
          </div>
        </div>
      </div>
    </div>
  );
}
