import { useDisplayName } from '@/contexts/DisplayNameContext.tsx';
import GamepadIcon from '@/images/gamepad.svg?react';

export default function IngameToggle() {
  const { useIngame, toggleIngame } = useDisplayName();

  return (
    <button
      type="button"
      onClick={toggleIngame}
      className={`
        fixed right-4 bottom-4 z-50 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border
        text-xs leading-tight font-medium shadow-lg transition-colors
        ${
          useIngame
            ? `
              border-green-500 bg-green-600 text-white
              hover:bg-green-700
              dark:border-green-400 dark:bg-green-500 dark:hover:bg-green-600
            `
            : `
              border-gray-200 bg-white text-gray-700
              hover:bg-gray-100
              dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700
            `
        }
      `}
      aria-label="Toggle ingame names"
    >
      <GamepadIcon className="h-6 w-6" />
    </button>
  );
}
