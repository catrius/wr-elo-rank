import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '@/components/BackButton.tsx';
import { upload } from '@vercel/blob/client';
import supabase from '@/lib/supabase.ts';
import { useAuth } from '@/contexts/AuthContext.tsx';
import type { Player } from '@/types/common.ts';

const DEFAULT_AVATAR = 'https://cob0e2g1ourlhlk0.public.blob.vercel-storage.com/default.jpg';

function LoginForm({
  signIn,
  signInWithPassword,
  signUp,
}: {
  signIn: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setSubmitting(true);
      const email = `${username.trim().toLowerCase()}@ggtk.org`;
      const result = isSignUp ? await signUp(email, password) : await signInWithPassword(email, password);
      if (result.error) setError(result.error);
      setSubmitting(false);
    },
    [username, password, isSignUp, signInWithPassword, signUp],
  );

  return (
    <div
      className={`
        min-h-screen bg-gradient-to-b from-gray-50 to-white text-gray-900
        dark:from-gray-950 dark:to-gray-900 dark:text-gray-100
      `}
    >
      <div
        className={`
          mx-auto max-w-md p-4
          md:p-8
        `}
      >
        <BackButton to="/" className="mb-6" />

        <h1 className="mb-6 text-xl font-semibold">{isSignUp ? 'Create account' : 'Log in'}</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Username"
            required
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={`
              w-full rounded border border-gray-300 bg-transparent px-3 py-2
              dark:border-gray-600
            `}
          />
          <input
            type="password"
            placeholder="Password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`
              w-full rounded border border-gray-300 bg-transparent px-3 py-2
              dark:border-gray-600
            `}
          />

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className={`
              w-full rounded bg-blue-600 px-4 py-2 text-lg text-white
              hover:bg-blue-700
              disabled:opacity-50
            `}
          >
            {submitting ? 'Please wait...' : isSignUp ? 'Sign up' : 'Log in'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setIsSignUp((v) => !v);
            setError(null);
          }}
          className={`
            mt-3 w-full text-center text-sm text-blue-600
            hover:underline
            dark:text-blue-400
          `}
        >
          {isSignUp ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
        </button>

        <div className="my-6 flex items-center gap-3">
          <div
            className={`
              h-px flex-1 bg-gray-300
              dark:bg-gray-600
            `}
          />
          <span
            className={`
              text-sm text-gray-500
              dark:text-gray-400
            `}
          >
            or
          </span>
          <div
            className={`
              h-px flex-1 bg-gray-300
              dark:bg-gray-600
            `}
          />
        </div>

        <button
          type="button"
          onClick={signIn}
          className={`
            flex w-full items-center justify-center gap-2 rounded border border-gray-300 bg-white px-4 py-2 text-sm
            font-medium text-gray-700
            hover:bg-gray-50
            dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700
          `}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d={
                'M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57' +
                'c2.08-1.92 3.28-4.74 3.28-8.1z'
              }
            />
            <path
              fill="#34A853"
              d={
                'M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29' +
                '-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
              }
            />
            <path
              fill="#FBBC05"
              d={
                'M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22' +
                ' 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
              }
            />
            <path
              fill="#EA4335"
              d={
                'M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99' +
                ' 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
              }
            />
          </svg>
          Continue with Google
        </button>
      </div>
    </div>
  );
}

export default function UserPage() {
  const { user, loading, signOut, signIn, signInWithPassword, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = useCallback(async () => {
    await signOut();
    navigate('/');
  }, [signOut, navigate]);

  const [player, setPlayer] = useState<Player | null>(null);
  const [playerLoading, setPlayerLoading] = useState(true);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [pendingAvatar, setPendingAvatar] = useState<File | null>(null);
  const [pendingAvatarPreview, setPendingAvatarPreview] = useState<string | null>(null);
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
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !player) return;

      setPendingAvatar(file);
      setPendingAvatarPreview(URL.createObjectURL(file));
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [player],
  );

  const hasChanges = player && name.trim() !== '' && (name.trim() !== player.name || pendingAvatar);

  const handleSave = useCallback(async () => {
    if (!user || !player || !hasChanges) return;
    setSaving(true);
    try {
      const updates: Record<string, string> = {};
      if (name.trim() !== player.name) updates.name = name.trim();

      if (pendingAvatar) {
        const blob = await upload(`avatars/${player.id}-${Date.now()}`, pendingAvatar, {
          access: 'public',
          handleUploadUrl: '/api/upload',
        });
        updates.avatar = blob.url;
      }

      if (Object.keys(updates).length > 0) {
        await supabase.from('player').update(updates).eq('id', player.id);
      }

      setPendingAvatar(null);
      setPendingAvatarPreview(null);
      await fetchPlayer();
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert(`Save failed: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  }, [user, player, hasChanges, name, pendingAvatar, fetchPlayer]);

  if (loading) {
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
    return <LoginForm signIn={signIn} signInWithPassword={signInWithPassword} signUp={signUp} />;
  }

  if (playerLoading) {
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
          <BackButton to="/" className="mb-6" />

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
        <BackButton to="/" className="mb-6" />

        <div
          className={`
            flex flex-col gap-4 rounded-lg bg-white p-4 shadow
            dark:bg-gray-800
          `}
        >
          <div className="flex items-center gap-8">
            <div
              className={`
                w-16 shrink-0 text-base text-gray-500
                md:w-32
                dark:text-gray-400
              `}
            >
              Avatar
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={saving}
              className={`
                group relative shrink-0 cursor-pointer rounded-full
                disabled:cursor-wait disabled:opacity-50
              `}
            >
              <img
                src={pendingAvatarPreview || player?.avatar || DEFAULT_AVATAR}
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
                w-16 shrink-0 text-base text-gray-500
                md:w-32
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
                w-16 shrink-0 text-base text-gray-500
                md:w-32
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
                w-16 shrink-0 text-base text-gray-500
                md:w-32
                dark:text-gray-400
              `}
            >
              Email
            </div>
            <div className="min-w-0 truncate text-lg">{player?.email}</div>
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
