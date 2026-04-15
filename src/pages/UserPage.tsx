import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import supabase from '@/lib/supabase.ts';
import { useAuth } from '@/contexts/AuthContext.tsx';
import type { Player } from '@/types/common.ts';

const DEFAULT_AVATAR = 'https://cob0e2g1ourlhlk0.public.blob.vercel-storage.com/default.jpg';

export default function UserPage() {
  const { user, loading } = useAuth();

  const [player, setPlayer] = useState<Player | null>(null);
  const [playerLoading, setPlayerLoading] = useState(true);
  const [name, setName] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchPlayer = useCallback(async () => {
    if (!user?.email) return;
    setPlayerLoading(true);
    const { data } = await supabase
      .from('player')
      .select('*')
      .or(`email.eq.${user.email},personal_email.eq.${user.email}`)
      .limit(1)
      .single();
    if (data) {
      setPlayer(data);
      setName(data.name);
      setPersonalEmail(data.personal_email || '');
    }
    setPlayerLoading(false);
  }, [user?.email]);

  useEffect(() => {
    fetchPlayer();
  }, [fetchPlayer]);

  const hasChanges =
    player &&
    name.trim() !== '' &&
    (name.trim() !== player.name || personalEmail.trim() !== (player.personal_email || ''));

  const handleSave = useCallback(async () => {
    if (!user || !player || !hasChanges) return;
    setSaving(true);
    try {
      const updates: Record<string, string | null> = {};
      if (name.trim() !== player.name) updates.name = name.trim();
      if (personalEmail.trim() !== (player.personal_email || '')) updates.personal_email = personalEmail.trim() || null;

      if (Object.keys(updates).length > 0) {
        await supabase.from('player').update(updates).eq('id', player.id);
        await fetchPlayer();
      }
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert(`Save failed: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  }, [user, player, hasChanges, name, personalEmail, fetchPlayer]);

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
          flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-50 to-white text-gray-900
          dark:from-gray-950 dark:to-gray-900 dark:text-gray-100
        `}
      >
        <div className="flex flex-col items-center gap-4 px-4 text-center">
          <div
            className={`
              flex h-16 w-16 items-center justify-center rounded-full bg-red-100
              dark:bg-red-900/30
            `}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`
                h-8 w-8 text-red-500
                dark:text-red-400
              `}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold">Hold on!</h1>
          <p
            className={`
              text-gray-500
              dark:text-gray-400
            `}
          >
            You logged in using an unauthorized email.
          </p>
          <Link
            to="/"
            className={`
              mt-2 text-sm text-blue-600
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
            <img
              src={player?.avatar || DEFAULT_AVATAR}
              alt={player?.name || ''}
              className="h-16 w-16 shrink-0 rounded-full object-cover"
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

          <div className="flex items-baseline gap-8">
            <div
              className={`
                w-32 shrink-0 text-base text-gray-500
                dark:text-gray-400
              `}
            >
              Personal Email
            </div>
            {user.email === player?.personal_email ? (
              <div className="text-lg">{player.personal_email}</div>
            ) : (
              <input
                type="email"
                value={personalEmail}
                onChange={(e) => setPersonalEmail(e.target.value)}
                className={`
                  min-w-0 flex-1 rounded border border-gray-300 bg-transparent px-2 py-1 text-lg
                  dark:border-gray-600
                `}
              />
            )}
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
        </div>
      </div>
    </div>
  );
}
