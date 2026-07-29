import { useState, useEffect, useRef } from 'react';

export default function DecayIndicator() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const tooltipVisible = open ? 'opacity-100' : 'opacity-0 group-hover:opacity-100';

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (open && ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <span ref={ref} className="group relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`
          cursor-default text-base font-bold text-orange-500
          dark:text-orange-400
        `}
      >
        ↓
      </button>
      <span
        className={`
          pointer-events-none absolute right-0 bottom-full z-10 mb-1.5 w-44 rounded-md bg-gray-800 px-2.5 py-1.5
          text-left text-xs text-white shadow-lg transition-opacity
          dark:bg-gray-700
          ${tooltipVisible}
        `}
      >
        Elo decaying · inactive for 2+ weeks (-10 per week)
      </span>
    </span>
  );
}
