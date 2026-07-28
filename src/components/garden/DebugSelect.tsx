import { useCallback, useEffect, useRef, useState } from 'react';

// Tailwind-styled dropdown replacing the native <select> in the debug panel — native popups misposition
// inside transformed ancestors and can't be themed; this is a plain menu with click-outside to close.
interface DebugOption {
  value: string;
  label: string;
}

export default function DebugSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: DebugOption[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
  }, []);

  useEffect(() => {
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, handleClickOutside]);

  const selected = options.find((o) => o.value === value);

  return (
    <label
      className={`
        flex flex-1 items-center gap-2 text-gray-600
        dark:text-gray-300
      `}
    >
      <span className="w-16 shrink-0">{label}</span>
      <div ref={ref} className="relative flex-1">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`
            flex w-full cursor-pointer items-center justify-between gap-2 rounded border border-gray-300 bg-white px-1.5
            py-1 text-left
            dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100
          `}
        >
          <span className="truncate">{selected?.label}</span>
          <svg
            className={`
              h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform
              ${open ? 'rotate-180' : ''}
            `}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d={
                'M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.06l3.71-3.83a.75.75 0 1 1 1.08 1.04' +
                'l-4.25 4.38a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06z'
              }
              clipRule="evenodd"
            />
          </svg>
        </button>
        {open && (
          <div
            className={`
              absolute left-0 z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1
              shadow-lg
              dark:border-gray-700 dark:bg-gray-800
            `}
          >
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`
                  block w-full cursor-pointer px-3 py-1.5 text-left
                  hover:bg-gray-100
                  dark:hover:bg-gray-700
                  ${
                    o.value === value
                      ? `
                        font-semibold text-gray-900
                        dark:text-gray-100
                      `
                      : `
                        text-gray-700
                        dark:text-gray-300
                      `
                  }
                `}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </label>
  );
}
