import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
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

// Compact markdown styling for feedback text — inline-friendly, safe links.
const markdownComponents: Components = {
  p: ({ children }) => (
    <p
      className={`
        my-0.5
        first:mt-0
        last:mb-0
      `}
    >
      {children}
    </p>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`
        text-indigo-600 underline
        dark:text-indigo-400
      `}
    >
      {children}
    </a>
  ),
  ul: ({ children }) => <ul className="my-0.5 list-disc pl-4">{children}</ul>,
  ol: ({ children }) => <ol className="my-0.5 list-decimal pl-4">{children}</ol>,
  li: ({ children }) => <li className="my-0">{children}</li>,
  code: ({ children }) => (
    <code
      className={`
        rounded bg-gray-100 px-1 py-0.5 font-mono text-[0.85em]
        dark:bg-gray-800
      `}
    >
      {children}
    </code>
  ),
};

export default function FeedbackBox() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { players } = useGameDataContext();
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');

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

  const startEdit = useCallback((item: FeedbackItem) => {
    setEditingId(item.id);
    setEditText(item.text);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditText('');
  }, []);

  const saveEdit = useCallback(
    async (item: FeedbackItem) => {
      if (!user || !editText.trim()) return;
      await supabase.from('feedback').update({ text: editText.trim() }).eq('id', item.id).eq('user_id', user.id);
      setEditingId(null);
      setEditText('');
      await load();
    },
    [user, editText, load],
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
              const isMine = !!user && item.user_id === user.id;
              const isEditing = editingId === item.id;
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
                    {isEditing ? (
                      <div className="flex flex-col gap-2">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          rows={2}
                          className={`
                            w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm
                            placeholder:text-gray-300
                            dark:border-gray-700 dark:bg-gray-800 dark:placeholder:text-gray-600
                          `}
                        />
                        <div className="flex items-center gap-2 self-end">
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className={`
                              cursor-pointer rounded px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors
                              hover:bg-gray-100
                              dark:text-gray-400 dark:hover:bg-gray-800
                            `}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => saveEdit(item)}
                            disabled={!editText.trim()}
                            className={`
                              cursor-pointer rounded px-3 py-1.5 text-xs font-medium text-indigo-600 transition-colors
                              hover:bg-indigo-50
                              disabled:cursor-not-allowed disabled:opacity-50
                              dark:text-indigo-400 dark:hover:bg-indigo-950
                            `}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`
                          text-sm break-words
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
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                          {item.text}
                        </ReactMarkdown>
                      </div>
                    )}
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

                  {isMine && !isEditing && (
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      aria-label="Edit feedback"
                      className={`
                        shrink-0 cursor-pointer rounded p-1 text-gray-300 transition-colors
                        hover:bg-gray-100 hover:text-gray-500
                        dark:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-400
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
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
                      </svg>
                    </button>
                  )}

                  {user && !isEditing && (
                    <button
                      type="button"
                      onClick={() => toggleStatus(item)}
                      aria-label={item.status === 'done' ? 'Mark as open' : 'Mark as done'}
                      className={`
                        shrink-0 cursor-pointer rounded p-1 transition-colors
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
              onClick={() => navigate('/user')}
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
