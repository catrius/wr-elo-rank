import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDisplayName } from '@/contexts/DisplayNameContext.tsx';
import { useAuth } from '@/contexts/AuthContext.tsx';
import useDarkMode from '@/hooks/useDarkMode.ts';
import supabase from '@/lib/supabase.ts';
import type { Player } from '@/types/common.ts';

export default function ToolMenu() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, signIn } = useAuth();
  const { displayName, useIngame, toggleIngame } = useDisplayName();
  const { dark, toggleDark } = useDarkMode();
  const [player, setPlayer] = useState<Player | null>(null);

  useEffect(() => {
    if (!user?.email) return;
    supabase
      .from('player')
      .select('*')
      .or(`email.eq.${user.email},personal_email.eq.${user.email}`)
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) setPlayer(data);
      });
  }, [user?.email]);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, handleClickOutside]);

  return (
    <div ref={menuRef} className="fixed right-4 bottom-4 z-50">
      {open && (
        <div
          className={`
            absolute right-0 bottom-16 flex min-w-48 flex-col gap-1 rounded-xl border border-gray-200 bg-white p-2
            shadow-xl
            dark:border-gray-700 dark:bg-gray-800
          `}
        >
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              if (user) navigate('/user');
              else signIn();
            }}
            className={`
              flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700
              transition-colors
              hover:bg-gray-100
              dark:text-gray-300 dark:hover:bg-gray-700
            `}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            {user ? (player ? displayName(player) : 'Profile') : 'Login'}
          </button>

          <div
            className={`
              border-b border-gray-200
              dark:border-gray-700
            `}
          />

          <label
            className={`
              flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700
              transition-colors
              hover:bg-gray-100
              dark:text-gray-300 dark:hover:bg-gray-700
            `}
          >
            <input type="checkbox" checked={useIngame} onChange={toggleIngame} className="h-4 w-4 cursor-pointer" />
            Ingame names
          </label>

          <label
            className={`
              flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700
              transition-colors
              hover:bg-gray-100
              dark:text-gray-300 dark:hover:bg-gray-700
            `}
          >
            <input type="checkbox" checked={dark} onChange={toggleDark} className="h-4 w-4 cursor-pointer" />
            Dark mode
          </label>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`
          flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border border-gray-200 bg-white
          shadow-lg transition-colors
          hover:bg-gray-100
          dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700
        `}
        aria-label="Tool menu"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`
            h-7 w-7 text-gray-600 transition-transform duration-300
            dark:text-gray-300
            ${open ? 'rotate-90' : ''}
          `}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path
            d={
              'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33' +
              ' 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33' +
              'l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0' +
              ' 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83' +
              'l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1' +
              ' 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9' +
              'a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z'
            }
          />
        </svg>
      </button>
    </div>
  );
}
