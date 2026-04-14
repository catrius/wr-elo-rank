import { createContext, useContext, useMemo, type ReactNode } from 'react';
import useGameData from '@/hooks/useGameData.ts';
import type { Player, Match, Pairing, Season } from '@/types/common.ts';
import type { Streak } from '@/utils/streaks.ts';

interface GameDataContextValue {
  players: Player[] | null;
  allMatches: Match[] | null;
  matches: Match[] | null;
  pairings: Pairing[] | null;
  seasons: Pick<Season, 'id' | 'name' | 'end' | 'start'>[] | null;
  currentSeason: Pick<Season, 'id' | 'name' | 'end' | 'start'> | null;
  streaks: Record<number, Streak>;
  refresh: () => void;
}

const GameDataContext = createContext<GameDataContextValue>({
  players: null,
  allMatches: null,
  matches: null,
  pairings: null,
  seasons: null,
  currentSeason: null,
  streaks: {},
  refresh: () => {},
});

export function GameDataProvider({ children }: { children: ReactNode }) {
  const { players, allMatches, matches, pairings, seasons, currentSeason, streaks, refresh } = useGameData();

  const value = useMemo(
    () => ({ players, allMatches, matches, pairings, seasons, currentSeason, streaks, refresh }),
    [players, allMatches, matches, pairings, seasons, currentSeason, streaks, refresh],
  );

  return <GameDataContext.Provider value={value}>{children}</GameDataContext.Provider>;
}

export function useGameDataContext() {
  return useContext(GameDataContext);
}
