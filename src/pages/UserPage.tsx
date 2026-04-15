import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { upload } from '@vercel/blob/client';
import supabase from '@/lib/supabase.ts';
import { useAuth } from '@/contexts/AuthContext.tsx';
import type { Player } from '@/types/common.ts';

const DEFAULT_AVATAR = 'https://cob0e2g1ourlhlk0.public.blob.vercel-storage.com/default.jpg';

export default function UserPage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = useCallback(async () => {
    await signOut();
    navigate('/');
  }, [signOut, navigate]);

  const [player, setPlayer] = useState<Player | null>(null);
  const [playerLoading, setPlayerLoading] = useState(true);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [unclaimedPlayers, setUnclaimedPlayers] = useState<Player[]>([]);
  const [claimSearch, setClaimSearch] = useState('');
  const [claiming, setClaiming] = useState(false);

  const fetchPlayer = useCallback(async () => {
    if (!user?.email) return;
    setPlayerLoading(true);
    const { data } = await supabase.from('player').select('*').eq('email', user.email).limit(1).single();
    if (data) {
      setPlayer(data);
      setName(data.name);
    }
    setPlayerLoading(false);
  }, [user?.email]);

  const fetchUnclaimedPlayers = useCallback(async () => {
    const { data } = await supabase.from('player').select('*').is('email', null).order('name');
    if (data) setUnclaimedPlayers(data);
  }, []);

  useEffect(() => {
    fetchPlayer();
  }, [fetchPlayer]);

  useEffect(() => {
    if (!playerLoading && !player && user) {
      fetchUnclaimedPlayers();
    }
  }, [playerLoading, player, user, fetchUnclaimedPlayers]);

  const filteredUnclaimedPlayers = useMemo(
    () =>
      claimSearch.trim()
        ? unclaimedPlayers.filter((p) => p.name.toLowerCase().includes(claimSearch.trim().toLowerCase()))
        : unclaimedPlayers,
    [unclaimedPlayers, claimSearch],
  );

  const handleClaim = useCallback(
    async (playerId: number) => {
      if (!user?.email) return;
      setClaiming(true);
      try {
        await supabase.from('player').update({ email: user.email }).eq('id', playerId);
        await fetchPlayer();
      } catch (err) {
        // eslint-disable-next-line no-alert
        alert(`Claim failed: ${(err as Error).message}`);
      } finally {
        setClaiming(false);
      }
    },
    [user?.email, fetchPlayer],
  );

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

  const hasChanges = player && name.trim() !== '' && name.trim() !== player.name;

  const handleSave = useCallback(async () => {
    if (!user || !player || !hasChanges) return;
    setSaving(true);
    try {
      await supabase.from('player').update({ name: name.trim() }).eq('id', player.id);
      await fetchPlayer();
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert(`Save failed: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  }, [user, player, hasChanges, name, fetchPlayer]);

  if (loading || playerLoading) {
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

  if (!user) {
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
          <p>Not logged in.</p>
          <Link
            to="/"
            className={`
              mt-4 inline-block text-sm text-blue-600
              hover:underline
              dark:text-blue-400
            `}
          >
            &larr; Back
          </Link>
        </div>
      </div>
    );
  }

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

          <h1 className="mb-2 text-xl font-semibold">Claim your player</h1>
          <p
            className={`
              mb-4 text-gray-500
              dark:text-gray-400
            `}
          >
            No player is linked to <span className="font-medium">{user.email}</span>. Pick your player below to claim
            it.
          </p>

          <input
            type="text"
            placeholder="Search players..."
            value={claimSearch}
            onChange={(e) => setClaimSearch(e.target.value)}
            className={`
              mb-4 w-full rounded border border-gray-300 bg-transparent px-3 py-2
              dark:border-gray-600
            `}
          />

          {filteredUnclaimedPlayers.length === 0 ? (
            <p
              className={`
                text-gray-500
                dark:text-gray-400
              `}
            >
              No unclaimed players found.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {filteredUnclaimedPlayers.map((p) => (
                <li
                  key={p.id}
                  className={`
                    flex items-center justify-between rounded-lg bg-white p-3 shadow
                    dark:bg-gray-800
                  `}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={p.avatar || DEFAULT_AVATAR}
                      alt={p.name}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div
                        className={`
                          text-sm text-gray-500
                          dark:text-gray-400
                        `}
                      >
                        Elo {p.elo} &middot; {p.win}W / {p.total}G
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={claiming}
                    onClick={() => handleClaim(p.id)}
                    className={`
                      rounded bg-blue-600 px-3 py-1 text-sm text-white
                      hover:bg-blue-700
                      disabled:opacity-50
                    `}
                  >
                    {claiming ? 'Claiming...' : 'Claim'}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={handleSignOut}
            className={`
              mt-4 w-full rounded bg-red-600 px-4 py-2 text-lg text-white
              hover:bg-red-700
            `}
          >
            Logout
          </button>
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

        <div
          className={`
            flex flex-col gap-4 rounded-lg bg-white p-4 shadow
            dark:bg-gray-800
          `}
        >
          <div className="flex items-center gap-8">
            <div
              className={`
                w-32 shrink-0 text-base text-gray-500
                dark:text-gray-400
              `}
            >
              Avatar
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className={`
                group relative shrink-0 cursor-pointer rounded-full
                disabled:cursor-wait disabled:opacity-50
              `}
            >
              <img
                src={player?.avatar || DEFAULT_AVATAR}
                alt={player?.name || ''}
                className="h-16 w-16 shrink-0 rounded-full object-cover"
              />
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
          </div>

          <div className="flex items-baseline gap-8">
            <div
              className={`
                w-32 shrink-0 text-base text-gray-500
                dark:text-gray-400
              `}
            >
              Name
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`
                min-w-0 flex-1 rounded border border-gray-300 bg-transparent px-2 py-1 text-lg
                dark:border-gray-600
              `}
            />
          </div>

          <div className="flex items-baseline gap-8">
            <div
              className={`
                w-32 shrink-0 text-base text-gray-500
                dark:text-gray-400
              `}
            >
              Ingame
            </div>
            <div className="text-lg">{player?.ingame || '-'}</div>
          </div>

          <div className="flex items-baseline gap-8">
            <div
              className={`
                w-32 shrink-0 text-base text-gray-500
                dark:text-gray-400
              `}
            >
              Email
            </div>
            <div className="text-lg">{player?.email}</div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className={`
              w-full rounded bg-blue-600 px-4 py-2 text-lg text-white
              hover:bg-blue-700
              disabled:opacity-50
            `}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>

          <button
            type="button"
            onClick={handleSignOut}
            className={`
              w-full rounded bg-red-600 px-4 py-2 text-lg text-white
              hover:bg-red-700
            `}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
