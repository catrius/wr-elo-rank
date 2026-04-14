import { useCallback } from 'react';
import { isNumber, isNaN } from 'es-toolkit/compat';
import Pill from '@/components/Pill';
import Section from '@/components/Section.tsx';
import TeamPanel from '@/components/TeamPanel.tsx';
import { useGameDataContext } from '@/contexts/GameDataContext.tsx';
import { useTeamsContext } from '@/contexts/TeamsContext.tsx';

export default function NewMatch() {
  const { streaks, refresh } = useGameDataContext();
  const {
    teamA,
    teamB,
    averageTeamAElos,
    averageTeamBElos,
    eloDiff,
    handleDragStart,
    handleDragOverPanel,
    handleDropTo,
    suggestTeams,
    lastMatch,
    createMatch,
    disabledSuggest,
    disabledStart,
  } = useTeamsContext();

  const handleStart = useCallback(() => createMatch().then(() => refresh()), [createMatch, refresh]);
  return (
    <Section title="New Match" actions={isNumber(eloDiff) && !isNaN(eloDiff) ? <Pill>{`Diff ${eloDiff}`}</Pill> : null}>
      <div className="mb-4 text-sm">
        To change a player&#39;s team, tap and hold on his name then drop him on the opposite team.
      </div>
      <form className="space-y-4">
        <div
          className={`
            grid grid-cols-1 gap-4
            md:grid-cols-2
          `}
        >
          <TeamPanel
            label="Team A"
            team={teamA}
            averageElo={averageTeamAElos}
            onDragStart={handleDragStart}
            onDragOver={handleDragOverPanel}
            onDrop={handleDropTo('A')}
            side="A"
            streaks={streaks}
          />
          <TeamPanel
            label="Team B"
            team={teamB}
            averageElo={averageTeamBElos}
            onDragStart={handleDragStart}
            onDragOver={handleDragOverPanel}
            onDrop={handleDropTo('B')}
            side="B"
            streaks={streaks}
          />
        </div>

        <div className="flex flex-col place-content-end gap-3">
          <div className="flex place-content-end gap-3">
            <button
              type="button"
              onClick={() => suggestTeams(20)}
              className={`
                cursor-pointer rounded-xl border border-gray-200 px-4 py-2
                hover:bg-gray-50
                disabled:cursor-not-allowed disabled:opacity-50
                dark:border-gray-700 dark:hover:bg-gray-800
              `}
              disabled={disabledSuggest}
            >
              Shuffle
            </button>
            <button
              type="button"
              onClick={() => suggestTeams(0)}
              className={`
                cursor-pointer rounded-xl border border-gray-200 px-4 py-2
                hover:bg-gray-50
                disabled:cursor-not-allowed disabled:opacity-50
                dark:border-gray-700 dark:hover:bg-gray-800
              `}
              disabled={disabledSuggest}
            >
              Best
            </button>
            <button
              type="button"
              onClick={() => lastMatch()}
              className={`
                cursor-pointer rounded-xl border border-gray-200 px-4 py-2
                hover:bg-gray-50
                disabled:cursor-not-allowed disabled:opacity-50
                dark:border-gray-700 dark:hover:bg-gray-800
              `}
            >
              Rematch
            </button>
          </div>
          <div className="flex place-content-end gap-3">
            <button
              type="button"
              className={`
                cursor-pointer rounded-xl bg-indigo-600 px-4 py-2 text-white
                hover:bg-indigo-700
                disabled:cursor-not-allowed disabled:opacity-50
              `}
              onClick={handleStart}
              disabled={disabledStart}
            >
              Start
            </button>
          </div>
        </div>
      </form>
    </Section>
  );
}
