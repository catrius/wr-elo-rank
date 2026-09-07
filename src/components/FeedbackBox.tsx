import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Pagination from 'rc-pagination';
import dayjs from 'dayjs';
import { upload } from '@vercel/blob/client';
import supabase from '@/lib/supabase.ts';
import { useAuth } from '@/contexts/AuthContext.tsx';
import { useDisplayName } from '@/contexts/DisplayNameContext.tsx';
import { useGameDataContext } from '@/contexts/GameDataContext.tsx';
import Section from '@/components/Section.tsx';
import Avatar from '@/components/Avatar.tsx';
import FormatToolbar from '@/components/FormatToolbar.tsx';
import type { Player } from '@/types/common.ts';

const PAGE_SIZE = 10;

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
  img: ({ src, alt }) => (
    <img
      src={src}
      alt={alt}
      className={`
        my-2 max-w-full rounded-lg border border-gray-200
        dark:border-gray-700
      `}
    />
  ),
};

export default function FeedbackBox() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { players } = useGameDataContext();
  const { displayName } = useDisplayName();
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'done' | 'joke'>('all');
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const playerMap = useMemo<Record<number, Player>>(() => {
    const map: Record<number, Player> = {};
    players?.forEach((p) => {
      map[p.id] = p;
    });
    return map;
  }, [players]);

  const myPlayer = useMemo(
    () => (user && players ? (players.find((p) => p.email === user.email) ?? null) : null),
    [user, players],
  );

  const myPlayerId = myPlayer?.id ?? null;
  const isAdmin = myPlayer?.isAdmin ?? false;

  const filteredItems = useMemo(
    () => (statusFilter === 'all' ? items : items.filter((i) => i.status === statusFilter)),
    [items, statusFilter],
  );

  const pagedItems = useMemo(
    () => filteredItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredItems, page],
  );

  const handleFilterChange = useCallback((next: 'all' | 'open' | 'done' | 'joke') => {
    setStatusFilter(next);
    setPage(1);
  }, []);

  const handlePageChange = useCallback((next: number) => {
    setPage(next);
    // Scroll to the top of the whole Feedback card (title included) with a little space above,
    // deferred past the re-render so the page's new height is settled before the smooth scroll.
    requestAnimationFrame(() => {
      const section = listRef.current?.closest('section');
      if (!section) return;
      const top = section.getBoundingClientRect().top + window.scrollY - 16;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  }, []);

  // Snap back to a valid page if the filtered count shrinks below the current page's range.
  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
    if (page > maxPage) setPage(maxPage);
  }, [filteredItems.length, page]);

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
      .sort((a, b) => b.voteCount - a.voteCount || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setItems(merged);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const handleImageUpload = useCallback(
    async (file: File, textarea: HTMLTextAreaElement | null) => {
      if (!textarea) return;
      setUploading(true);
      try {
        const blob = await upload(`feedback/${Date.now()}-${file.name}`, file, {
          access: 'public',
          handleUploadUrl: '/api/upload',
        });
        const imageMarkdown = `![${file.name}](${blob.url})`;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const isEdit = textarea === editTextareaRef.current;
        const setter = isEdit ? setEditText : setText;
        const currentValue = isEdit ? editText : text;

        const newValue = currentValue.substring(0, start) + imageMarkdown + currentValue.substring(end);
        setter(newValue);

        // Move cursor after the inserted markdown.
        requestAnimationFrame(() => {
          textarea.focus();
          const cursorPos = start + imageMarkdown.length;
          textarea.setSelectionRange(cursorPos, cursorPos);
        });
      } catch (error) {
        alert(`Upload failed: ${(error as Error).message}`);
      } finally {
        setUploading(false);
      }
    },
    [text, editText],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, textarea: HTMLTextAreaElement | null) => {
      const file = e.target.files?.[0];
      if (file) {
        handleImageUpload(file, textarea);
      }
      // Reset input so the same file can be selected again.
      e.target.value = '';
    },
    [handleImageUpload],
  );

  const submit = useCallback(async () => {
    if (!text.trim() || !user) return;
    setSubmitting(true);
    await supabase.from('feedback').insert({
      text: text.trim(),
      user_id: user.id,
      player_id: myPlayerId,
    });
    setText('');
    await load();
    setSubmitting(false);
  }, [text, user, myPlayerId, load]);

  const toggleStatus = useCallback(
    async (item: FeedbackItem) => {
      if (!isAdmin) return;
      const next = item.status === 'done' ? 'open' : 'done';
      await supabase.from('feedback').update({ status: next }).eq('id', item.id);
      await load();
    },
    [isAdmin, load],
  );

  const toggleJoke = useCallback(
    async (item: FeedbackItem) => {
      if (!isAdmin) return;
      const next = item.status === 'joke' ? 'open' : 'joke';
      await supabase.from('feedback').update({ status: next }).eq('id', item.id);
      await load();
    },
    [isAdmin, load],
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

  // Markdown formatting helpers — wrap selected text or insert at cursor.
  const applyFormat = useCallback((textarea: HTMLTextAreaElement | null, format: string, value?: string) => {
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.substring(start, end);
    const isNewInput = textarea === textareaRef.current;
    const setter = isNewInput ? setText : setEditText;

    let replacement = '';
    let cursorOffset = 0;

    switch (format) {
      case 'bold':
        replacement = `**${selected || 'bold text'}**`;
        cursorOffset = selected ? replacement.length : 2;
        break;
      case 'italic':
        replacement = `*${selected || 'italic text'}*`;
        cursorOffset = selected ? replacement.length : 1;
        break;
      case 'code':
        replacement = `\`${selected || 'code'}\``;
        cursorOffset = selected ? replacement.length : 1;
        break;
      case 'bullet':
        replacement = `- ${selected || 'list item'}`;
        cursorOffset = replacement.length;
        break;
      case 'numbered':
        replacement = `1. ${selected || 'list item'}`;
        cursorOffset = replacement.length;
        break;
      case 'link':
        replacement = `[${selected || 'link text'}](${value || 'url'})`;
        cursorOffset = selected ? replacement.length : 1;
        break;
      default:
        return;
    }

    const newValue = textarea.value.substring(0, start) + replacement + textarea.value.substring(end);
    setter(newValue);

    // Restore focus and move cursor to end of inserted text.
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + cursorOffset, start + cursorOffset);
    });
  }, []);

  const handleBold = useCallback(() => applyFormat(textareaRef.current, 'bold'), [applyFormat]);
  const handleItalic = useCallback(() => applyFormat(textareaRef.current, 'italic'), [applyFormat]);
  const handleCode = useCallback(() => applyFormat(textareaRef.current, 'code'), [applyFormat]);
  const handleBullet = useCallback(() => applyFormat(textareaRef.current, 'bullet'), [applyFormat]);
  const handleNumbered = useCallback(() => applyFormat(textareaRef.current, 'numbered'), [applyFormat]);
  const handleLink = useCallback(() => applyFormat(textareaRef.current, 'link'), [applyFormat]);

  const handleEditBold = useCallback(() => applyFormat(editTextareaRef.current, 'bold'), [applyFormat]);
  const handleEditItalic = useCallback(() => applyFormat(editTextareaRef.current, 'italic'), [applyFormat]);
  const handleEditCode = useCallback(() => applyFormat(editTextareaRef.current, 'code'), [applyFormat]);
  const handleEditBullet = useCallback(() => applyFormat(editTextareaRef.current, 'bullet'), [applyFormat]);
  const handleEditNumbered = useCallback(() => applyFormat(editTextareaRef.current, 'numbered'), [applyFormat]);
  const handleEditLink = useCallback(() => applyFormat(editTextareaRef.current, 'link'), [applyFormat]);

  return (
    <Section title="Feedback">
      <div ref={listRef} className="flex flex-col gap-3">
        {user ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-col">
              <FormatToolbar
                onBold={handleBold}
                onItalic={handleItalic}
                onCode={handleCode}
                onBullet={handleBullet}
                onNumbered={handleNumbered}
                onLink={handleLink}
                onImage={() => fileInputRef.current?.click()}
                uploading={uploading}
              />
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Suggest a feature or leave feedback..."
                rows={4}
                className={`
                  w-full resize-none rounded-b-lg border-x border-b border-gray-200 bg-white px-3 py-2 text-sm
                  placeholder:text-gray-300
                  dark:border-gray-700 dark:bg-gray-800 dark:placeholder:text-gray-600
                `}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={(e) => handleFileSelect(e, textareaRef.current)}
                className="hidden"
              />
            </div>
            <button
              type="button"
              onClick={submit}
              disabled={!text.trim() || submitting}
              className={`
                cursor-pointer self-end rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white
                transition-colors
                hover:bg-indigo-700
                disabled:cursor-not-allowed disabled:opacity-50
                dark:bg-indigo-500 dark:hover:bg-indigo-400
              `}
            >
              Submit
            </button>
          </div>
        ) : (
          <div
            className={`
              flex flex-col items-center gap-2 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-4
              text-center
              dark:border-gray-700 dark:bg-gray-800/40
            `}
          >
            <p
              className={`
                text-sm text-gray-500
                dark:text-gray-400
              `}
            >
              Sign in to suggest features or vote on ideas
            </p>
            <button
              type="button"
              onClick={() => navigate('/user')}
              className={`
                cursor-pointer rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white transition-colors
                hover:bg-indigo-700
                dark:bg-indigo-500 dark:hover:bg-indigo-400
              `}
            >
              Sign in
            </button>
          </div>
        )}

        <div className="flex gap-1.5">
          {(['all', 'open', 'joke', 'done'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => handleFilterChange(f)}
              className={`
                cursor-pointer rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors
                ${
                  statusFilter === f
                    ? `
                      bg-gray-200 text-gray-700
                      dark:bg-gray-700 dark:text-gray-200
                    `
                    : `
                      text-gray-400
                      hover:bg-gray-100 hover:text-gray-600
                      dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300
                    `
                }
              `}
            >
              {f === 'all' ? 'All' : f === 'open' ? 'Ideas' : f === 'done' ? 'Done' : 'Discussion'}
            </button>
          ))}
        </div>

        {filteredItems.length === 0 ? (
          <p
            className={`
              text-center text-sm text-gray-500
              dark:text-gray-400
            `}
          >
            {items.length === 0 ? 'No suggestions yet' : 'No items match this filter'}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {pagedItems.map((item) => {
              const author = item.player_id ? playerMap[item.player_id] : null;
              const isMine = !!user && item.user_id === user.id;
              const isEditing = editingId === item.id;
              const isDone = item.status === 'done';
              return (
                <li
                  key={item.id}
                  className={`
                    relative flex flex-col gap-2 rounded-lg border px-3 py-2
                    ${
                      isDone
                        ? `
                          border-green-400 bg-green-50/40
                          dark:border-green-500/60 dark:bg-green-900/10
                        `
                        : `
                          border-gray-100
                          dark:border-gray-800
                        `
                    }
                  `}
                >
                  {isDone && (
                    <span
                      aria-label="Done"
                      className={`
                        absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-green-500
                        text-white shadow-sm
                        dark:bg-green-500
                      `}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3 w-3"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                  )}
                  {isEditing ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-col">
                        <FormatToolbar
                          onBold={handleEditBold}
                          onItalic={handleEditItalic}
                          onCode={handleEditCode}
                          onBullet={handleEditBullet}
                          onNumbered={handleEditNumbered}
                          onLink={handleEditLink}
                          onImage={() => editFileInputRef.current?.click()}
                          uploading={uploading}
                        />
                        <textarea
                          ref={editTextareaRef}
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          rows={4}
                          className={`
                            w-full resize-none rounded-b-lg border-x border-b border-gray-200 bg-white px-3 py-2 text-sm
                            placeholder:text-gray-300
                            dark:border-gray-700 dark:bg-gray-800 dark:placeholder:text-gray-600
                          `}
                        />
                        <input
                          ref={editFileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          onChange={(e) => handleFileSelect(e, editTextareaRef.current)}
                          className="hidden"
                        />
                      </div>
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
                    <div className="text-sm break-words">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                        {item.text}
                      </ReactMarkdown>
                    </div>
                  )}

                  {/* Footer: author left, vote + edit/admin actions right, so they never eat content width. */}
                  <div className="flex items-center gap-1.5">
                    {author && <Avatar src={author.avatar ?? null} name={displayName(author)} />}
                    <span
                      className={`
                        text-xs text-gray-400
                        dark:text-gray-500
                      `}
                    >
                      {author ? displayName(author) : 'Anonymous'} · {dayjs(item.created_at).format('MMM D')}
                    </span>

                    {!isEditing && (
                      <div className="ml-auto flex shrink-0 items-center gap-1">
                        {isMine && (
                          <button
                            type="button"
                            onClick={() => startEdit(item)}
                            aria-label="Edit feedback"
                            className={`
                              cursor-pointer rounded-lg border border-gray-200 p-1.5 text-gray-400 transition-colors
                              hover:border-gray-300 hover:bg-gray-100 hover:text-gray-600
                              dark:border-gray-700 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300
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
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => toggleJoke(item)}
                            aria-label={item.status === 'joke' ? 'Mark as open' : 'Mark as off-topic'}
                            className={`
                              cursor-pointer rounded-lg border p-1.5 transition-colors
                              ${
                                item.status === 'joke'
                                  ? `
                                    border-orange-300 text-orange-500
                                    hover:bg-orange-50
                                    dark:border-orange-500/50 dark:text-orange-400 dark:hover:bg-orange-900/30
                                  `
                                  : `
                                    border-gray-200 text-gray-400
                                    hover:border-gray-300 hover:bg-gray-100 hover:text-gray-600
                                    dark:border-gray-700 dark:text-gray-500 dark:hover:bg-gray-800
                                    dark:hover:text-gray-300
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
                              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                              <line x1="4" y1="22" x2="4" y2="15" />
                            </svg>
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => toggleStatus(item)}
                            aria-label={item.status === 'done' ? 'Mark as open' : 'Mark as done'}
                            className={`
                              cursor-pointer rounded-lg border p-1.5 transition-colors
                              ${
                                item.status === 'done'
                                  ? `
                                    border-green-300 text-green-600
                                    hover:bg-green-50
                                    dark:border-green-500/50 dark:text-green-400 dark:hover:bg-green-900/30
                                  `
                                  : `
                                    border-gray-200 text-gray-400
                                    hover:border-gray-300 hover:bg-gray-100 hover:text-gray-600
                                    dark:border-gray-700 dark:text-gray-500 dark:hover:bg-gray-800
                                    dark:hover:text-gray-300
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
                        <button
                          type="button"
                          onClick={() => toggleVote(item)}
                          disabled={!user}
                          title={user ? undefined : 'Sign in to vote'}
                          className={`
                            ml-1 flex min-w-11 flex-col items-center rounded-lg border px-2 py-1 leading-none
                            transition-colors
                            disabled:cursor-default
                            ${
                              item.votedByMe
                                ? `
                                  border-indigo-600 bg-indigo-600 text-white shadow-sm
                                  hover:bg-indigo-700
                                  dark:border-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400
                                `
                                : `
                                  cursor-pointer border-gray-200 text-gray-500
                                  hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600
                                  dark:border-gray-700 dark:text-gray-400 dark:hover:border-indigo-500/50
                                  dark:hover:bg-indigo-950 dark:hover:text-indigo-300
                                `
                            }
                          `}
                        >
                          <span className="text-xs">▲</span>
                          <span className="text-sm font-bold">{item.voteCount}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {filteredItems.length > PAGE_SIZE && (
          <Pagination
            className="self-center"
            current={page}
            total={filteredItems.length}
            pageSize={PAGE_SIZE}
            onChange={handlePageChange}
          />
        )}
      </div>
    </Section>
  );
}
