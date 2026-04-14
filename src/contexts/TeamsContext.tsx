import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useGameDataContext } from '@/contexts/GameDataContext.tsx';
import useTeams from '@/hooks/useTeams.ts';
import type { Player, Match } from '@/types/common.ts';

interface TeamsContextValue {
  teamA: Player[];
  teamB: Player[];
  availableIds: number[];
  averageTeamAElos: number;
  averageTeamBElos: number;
  eloDiff: number;
  disabledStart: boolean;
  disabledSuggest: boolean;
  handleDragStart: (player: Player, from: 'A' | 'B') => (e: any) => void;
  handleDragOverPanel: (e: any) => void;
  handleDropTo: (to: 'A' | 'B') => (e: any) => void;
  toggleAvailable: (id: number) => void;
  suggestTeams: (tolerance?: number) => void;
  lastMatch: (match?: Match) => void;
  createMatch: () => Promise<void>;
}

const TeamsContext = createContext<TeamsContextValue>({
  teamA: [],
  teamB: [],
  availableIds: [],
  averageTeamAElos: 0,
  averageTeamBElos: 0,
  eloDiff: 0,
  disabledStart: true,
  disabledSuggest: true,
  handleDragStart: () => () => {},
  handleDragOverPanel: () => {},
  handleDropTo: () => () => {},
  toggleAvailable: () => {},
  suggestTeams: () => {},
  lastMatch: () => {},
  createMatch: async () => {},
});

export function TeamsProvider({ children }: { children: ReactNode }) {
  const { players, matches, pairings } = useGameDataContext();
  const {
    teamA,
    teamB,
    availableIds,
    averageTeamAElos,
    averageTeamBElos,
    eloDiff,
    disabledStart,
    disabledSuggest,
    handleDragStart,
    handleDragOverPanel,
    handleDropTo,
    toggleAvailable,
    suggestTeams,
    lastMatch,
    createMatch,
  } = useTeams(players, matches, pairings);

  const value = useMemo(
    () => ({
      teamA,
      teamB,
      availableIds,
      averageTeamAElos,
      averageTeamBElos,
      eloDiff,
      disabledStart,
      disabledSuggest,
      handleDragStart,
      handleDragOverPanel,
      handleDropTo,
      toggleAvailable,
      suggestTeams,
      lastMatch,
      createMatch,
    }),
    [
      teamA,
      teamB,
      availableIds,
      averageTeamAElos,
      averageTeamBElos,
      eloDiff,
      disabledStart,
      disabledSuggest,
      handleDragStart,
      handleDragOverPanel,
      handleDropTo,
      toggleAvailable,
      suggestTeams,
      lastMatch,
      createMatch,
    ],
  );

  return <TeamsContext.Provider value={value}>{children}</TeamsContext.Provider>;
}

export function useTeamsContext() {
  return useContext(TeamsContext);
}
