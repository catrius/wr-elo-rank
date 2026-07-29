import { Link } from 'react-router-dom';

export default function BackButton({ to, className = '' }: { to: string; className?: string }) {
  return (
    <Link
      to={to}
      className={[
        `inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm
        font-medium text-gray-700 shadow-sm transition-all
        hover:bg-gray-50 hover:text-gray-900
        active:scale-95 active:bg-gray-100
        dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 dark:active:bg-gray-600`,
        className,
      ].join(' ')}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        fill="currentColor"
        className="h-4 w-4 shrink-0"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d={
            'M14 8a.75.75 0 0 1-.75.75H4.56l3.22 3.22a.75.75 0 1 1-1.06 1.06l-4.5-4.5a.75.75 0 0 1 0-1.06' +
            'l4.5-4.5a.75.75 0 0 1 1.06 1.06L4.56 7.25H13.25A.75.75 0 0 1 14 8Z'
          }
          clipRule="evenodd"
        />
      </svg>
      Back
    </Link>
  );
}
