import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useGameDataContext } from '@/contexts/GameDataContext.tsx';
import useMatchActions from '@/hooks/useMatchActions.ts';
import type { Match } from '@/types/common.ts';

interface MatchActionsContextValue {
  endMatch: (match: Match, result: 'A' | 'B') => Promise<void>;
  revertMatch: (match: Match) => Promise<void>;
  cancelMatch: (match: Match) => Promise<void>;
}

const MatchActionsContext = createContext<MatchActionsContextValue>({
  endMatch: async () => {},
  revertMatch: async () => {},
  cancelMatch: async () => {},
});

export function MatchActionsProvider({ children }: { children: ReactNode }) {
  const { players, refresh } = useGameDataContext();
  const { endMatch, revertMatch, cancelMatch } = useMatchActions(players, refresh);

  const value = useMemo(() => ({ endMatch, revertMatch, cancelMatch }), [endMatch, revertMatch, cancelMatch]);

  return <MatchActionsContext.Provider value={value}>{children}</MatchActionsContext.Provider>;
}

export function useMatchActionsContext() {
  return useContext(MatchActionsContext);
}
