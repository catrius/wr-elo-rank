import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import type { Player } from '@/types/common.ts';

interface DisplayNameContextValue {
  useIngame: boolean;
  toggleIngame: () => void;
  displayName: (player: Pick<Player, 'name' | 'ingame'>) => string;
}

const DisplayNameContext = createContext<DisplayNameContextValue>({
  useIngame: false,
  toggleIngame: () => {},
  displayName: (player) => player.name,
});

export function DisplayNameProvider({ children }: { children: ReactNode }) {
  const [useIngame, setUseIngame] = useState(() => localStorage.getItem('useIngame') === 'true');

  useLayoutEffect(() => {
    localStorage.setItem('useIngame', useIngame ? 'true' : 'false');
  }, [useIngame]);

  const toggleIngame = useCallback(() => setUseIngame((v) => !v), []);

  const displayName = useCallback(
    (player: Pick<Player, 'name' | 'ingame'>) => {
      if (useIngame && player.ingame) return player.ingame;
      return player.name;
    },
    [useIngame],
  );

  const value = useMemo(() => ({ useIngame, toggleIngame, displayName }), [useIngame, toggleIngame, displayName]);

  return <DisplayNameContext.Provider value={value}>{children}</DisplayNameContext.Provider>;
}

export function useDisplayName() {
  return useContext(DisplayNameContext);
}
