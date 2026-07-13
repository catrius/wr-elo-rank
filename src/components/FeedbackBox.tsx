import { useState, useEffect, useCallback, useMemo } from 'react';
import dayjs from 'dayjs';
import supabase from '@/lib/supabase.ts';
import { useAuth } from '@/contexts/AuthContext.tsx';
import { useGameDataContext } from '@/contexts/GameDataContext.tsx';
import Section from '@/components/Section.tsx';
import Avatar from '@/components/Avatar.tsx';
import type { Player } from '@/types/common.ts';

interface FeedbackItem {
  id: number;
  text: string;
  created_at: string;
  player_id: number | null;
  user_id: string | null;
  status: string;
  voteCount: number;
  votedByMe: boolean;
}

export default function FeedbackBox() {
  const { user, signIn } = useAuth();
  const { players } = useGameDataContext();
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const playerMap = useMemo<Record<number, Player>>(() => {
    const map: Record<number, Player> = {};
    players?.forEach((p) => {
      map[p.id] = p;
    });
    return map;
  }, [players]);

  const myPlayerId = useMemo(
    () => (user && players ? (players.find((p) => p.email === user.email)?.id ?? null) : null),
    [user, players],
  );

  const load = useCallback(async () => {
    const [{ data: feedback }, { data: votes }] = await Promise.all([
      supabase.from('feedback').select('*').order('created_at', { ascending: false }),
      supabase.from('feedback_vote').select('*'),
    ]);
    if (!feedback) return;

    const voteCounts: Record<number, number> = {};
    const myVotes = new Set<number>();
    votes?.forEach((v) => {
      voteCounts[v.feedback_id] = (voteCounts[v.feedback_id] ?? 0) + 1;
      if (user && v.user_id === user.id) myVotes.add(v.feedback_id);
    });

    const merged: FeedbackItem[] = feedback
      .map((f) => ({ ...f, voteCount: voteCounts[f.id] ?? 0, votedByMe: myVotes.has(f.id) }))
      .sort((a, b) => {
        // open items first, done items sink to the bottom
        if (a.status !== b.status) return a.status === 'done' ? 1 : -1;
        return b.voteCount - a.voteCount || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

    setItems(merged);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = useCallback(async () => {
    if (!text.trim() || !user) return;
    setSubmitting(true);
    await supabase.from('feedback').insert({ text: text.trim(), user_id: user.id, player_id: myPlayerId });
    setText('');
    await load();
    setSubmitting(false);
  }, [text, user, myPlayerId, load]);

  const toggleStatus = useCallback(
    async (item: FeedbackItem) => {
      if (!user) return;
      const next = item.status === 'done' ? 'open' : 'done';
      await supabase.from('feedback').update({ status: next }).eq('id', item.id);
      await load();
    },
    [user, load],
  );

  const toggleVote = useCallback(
    async (item: FeedbackItem) => {
      if (!user) return;
      if (item.votedByMe) {
        await supabase.from('feedback_vote').delete().eq('feedback_id', item.id).eq('user_id', user.id);
      } else {
        await supabase.from('feedback_vote').insert({ feedback_id: item.id, user_id: user.id });
      }
      await load();
    },
    [user, load],
  );

  return (
    <Section title="Feedback">
      <div className="flex flex-col gap-3">
        {items.length === 0 ? (
          <p
            className={`
              text-center text-sm text-gray-500
              dark:text-gray-400
            `}
          >
            No suggestions yet
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((item) => {
              const author = item.player_id ? playerMap[item.player_id] : null;
              return (
                <li
                  key={item.id}
                  className={`
                    flex items-start gap-3 rounded-lg border border-gray-100 px-3 py-2
                    dark:border-gray-800
                  `}
                >
                  <button
                    type="button"
                    onClick={() => toggleVote(item)}
                    disabled={!user}
                    title={user ? undefined : 'Sign in to vote'}
                    className={`
                      flex shrink-0 flex-col items-center gap-0.5 rounded px-1.5 py-1 text-xs transition-colors
                      disabled:cursor-default
                      ${
                        item.votedByMe
                          ? `
                            text-indigo-600
                            dark:text-indigo-400
                          `
                          : `
                            text-gray-400
                            hover:text-gray-600
                            dark:text-gray-500 dark:hover:text-gray-300
                          `
                      }
                    `}
                  >
                    <span>▲</span>
                    <span className="font-medium">{item.voteCount}</span>
                  </button>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`
                        text-sm
                        ${
                          item.status === 'done'
                            ? `
                              text-gray-400 line-through
                              dark:text-gray-500
                            `
                            : ''
                        }
                      `}
                    >
                      {item.text}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5">
                      {author && <Avatar src={author.avatar ?? null} name={author.name} />}
                      <span
                        className={`
                          text-xs text-gray-400
                          dark:text-gray-500
                        `}
                      >
                        {author ? author.name : 'Anonymous'} · {dayjs(item.created_at).format('MMM D')}
                      </span>
                      {item.status === 'done' && (
                        <span
                          className={`
                            rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700
                            dark:bg-green-900/40 dark:text-green-400
                          `}
                        >
                          Done
                        </span>
                      )}
                    </div>
                  </div>

                  {user && (
                    <button
                      type="button"
                      onClick={() => toggleStatus(item)}
                      aria-label={item.status === 'done' ? 'Mark as open' : 'Mark as done'}
                      className={`
                        shrink-0 rounded p-1 transition-colors
                        ${
                          item.status === 'done'
                            ? `
                              text-green-600
                              hover:bg-green-50
                              dark:text-green-400 dark:hover:bg-green-900/30
                            `
                            : `
                              text-gray-300
                              hover:bg-gray-100 hover:text-gray-500
                              dark:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-400
                            `
                        }
                      `}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {user ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Suggest a feature or leave feedback..."
              rows={2}
              className={`
                w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm
                placeholder:text-gray-300
                dark:border-gray-700 dark:bg-gray-800 dark:placeholder:text-gray-600
              `}
            />
            <button
              type="button"
              onClick={submit}
              disabled={!text.trim() || submitting}
              className={`
                cursor-pointer self-end rounded px-3 py-1.5 text-xs font-medium text-indigo-600 transition-colors
                hover:bg-indigo-50
                disabled:cursor-not-allowed disabled:opacity-50
                dark:text-indigo-400 dark:hover:bg-indigo-950
              `}
            >
              Submit
            </button>
          </div>
        ) : (
          <p
            className={`
              text-center text-xs text-gray-400
              dark:text-gray-500
            `}
          >
            <button
              type="button"
              onClick={signIn}
              className={`
                cursor-pointer underline
                hover:text-gray-600
                dark:hover:text-gray-300
              `}
            >
              Sign in
            </button>{' '}
            to suggest features or vote
          </p>
        )}
      </div>
    </Section>
  );
}
