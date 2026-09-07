// Formatting toolbar — small icon buttons for markdown shortcuts.
export default function FormatToolbar({
  onBold,
  onItalic,
  onCode,
  onBullet,
  onNumbered,
  onLink,
  onImage,
  uploading,
}: {
  onBold: () => void;
  onItalic: () => void;
  onCode: () => void;
  onBullet: () => void;
  onNumbered: () => void;
  onLink: () => void;
  onImage: () => void;
  uploading: boolean;
}) {
  return (
    <div
      className={`
        flex gap-0.5 rounded-t-lg border-x border-t border-gray-200 bg-gray-50 px-2 py-1
        dark:border-gray-700 dark:bg-gray-800/60
      `}
    >
      <button
        type="button"
        onClick={onBold}
        aria-label="Bold"
        title="Bold (Ctrl+B)"
        className={`
          cursor-pointer rounded p-1 text-gray-500 transition-colors
          hover:bg-gray-200 hover:text-gray-700
          dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200
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
          <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
          <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onItalic}
        aria-label="Italic"
        title="Italic (Ctrl+I)"
        className={`
          cursor-pointer rounded p-1 text-gray-500 transition-colors
          hover:bg-gray-200 hover:text-gray-700
          dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200
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
          <line x1="19" y1="4" x2="10" y2="4" />
          <line x1="14" y1="20" x2="5" y2="20" />
          <line x1="15" y1="4" x2="9" y2="20" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onCode}
        aria-label="Inline code"
        title="Inline code"
        className={`
          cursor-pointer rounded p-1 text-gray-500 transition-colors
          hover:bg-gray-200 hover:text-gray-700
          dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200
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
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      </button>
      <div
        className={`
          mx-1 w-px bg-gray-300
          dark:bg-gray-600
        `}
      />
      <button
        type="button"
        onClick={onBullet}
        aria-label="Bullet list"
        title="Bullet list"
        className={`
          cursor-pointer rounded p-1 text-gray-500 transition-colors
          hover:bg-gray-200 hover:text-gray-700
          dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200
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
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onNumbered}
        aria-label="Numbered list"
        title="Numbered list"
        className={`
          cursor-pointer rounded p-1 text-gray-500 transition-colors
          hover:bg-gray-200 hover:text-gray-700
          dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200
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
          <line x1="10" y1="6" x2="21" y2="6" />
          <line x1="10" y1="12" x2="21" y2="12" />
          <line x1="10" y1="18" x2="21" y2="18" />
          <path d="M4 6h1v4" />
          <path d="M4 10h2" />
          <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onLink}
        aria-label="Link"
        title="Link"
        className={`
          cursor-pointer rounded p-1 text-gray-500 transition-colors
          hover:bg-gray-200 hover:text-gray-700
          dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200
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
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      </button>
      <div
        className={`
          mx-1 w-px bg-gray-300
          dark:bg-gray-600
        `}
      />
      <button
        type="button"
        onClick={onImage}
        aria-label="Upload image"
        title="Upload image"
        disabled={uploading}
        className={`
          cursor-pointer rounded p-1 text-gray-500 transition-colors
          hover:bg-gray-200 hover:text-gray-700
          disabled:cursor-not-allowed disabled:opacity-50
          dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200
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
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </button>
    </div>
  );
}
