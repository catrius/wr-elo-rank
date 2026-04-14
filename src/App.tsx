import Leaderboard from '@/components/Leaderboard.tsx';
import AvailablePlayers from '@/components/AvailablePlayers.tsx';
import NewMatch from '@/components/NewMatch.tsx';
import MatchHistory from '@/components/MatchHistory.tsx';
import PlayerSpotlight from '@/components/PlayerSpotlight.tsx';
import HeadToHead from '@/components/HeadToHead.tsx';
import Pairings from '@/components/Pairings.tsx';
import Section from '@/components/Section.tsx';
import SeasonNav from '@/components/SeasonNav.tsx';
import useGameData from '@/hooks/useGameData.ts';
import useTeams from '@/hooks/useTeams.ts';
import useMatchActions from '@/hooks/useMatchActions.ts';
import useDarkMode from '@/hooks/useDarkMode.ts';

export default function App() {
  const { players, allMatches, matches, pairings, seasons, currentSeason, streaks, refresh } = useGameData();
  const { dark, toggleDark } = useDarkMode();
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
  const { endMatch, revertMatch, cancelMatch } = useMatchActions(players, refresh);

  return (
    <div
      className={`
        min-h-screen bg-gradient-to-b from-gray-50 to-white text-gray-900
        dark:from-gray-950 dark:to-gray-900 dark:text-gray-100
      `}
    >
      <div
        className={`
          mx-auto max-w-6xl p-4
          md:p-8
        `}
      >
        <header
          className={`
            mb-6 flex items-center justify-between gap-4
            md:mb-10
          `}
        >
          <div>
            <h1
              className={`
                text-2xl font-bold tracking-tight
                md:text-3xl
              `}
            >
              Go Go Toolkit
            </h1>
          </div>
          <button
            type="button"
            onClick={toggleDark}
            className={`
              cursor-pointer rounded-lg border border-gray-200 bg-white p-1.5 text-base shadow-sm transition-colors
              hover:bg-gray-100
              dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700
            `}
            aria-label="Toggle dark mode"
          >
            {dark ? '\u2600\uFE0F' : '\uD83C\uDF19'}
          </button>
        </header>

        <SeasonNav seasons={seasons ?? []} />

        {/* Leaderboard */}
        <Leaderboard players={players} streaks={streaks} />

        {/* Input form */}
        <div
          className={`
            mt-6 grid gap-6
            md:mt-10 md:grid-cols-2
          `}
        >
          <AvailablePlayers
            players={players}
            availableIds={availableIds}
            onToggle={toggleAvailable}
            streaks={streaks}
          />

          <NewMatch
            teamA={teamA}
            teamB={teamB}
            averageTeamAElos={averageTeamAElos}
            averageTeamBElos={averageTeamBElos}
            eloDiff={eloDiff}
            onDragStart={handleDragStart}
            onDragOver={handleDragOverPanel}
            onDropToA={handleDropTo('A')}
            onDropToB={handleDropTo('B')}
            onShuffle={() => suggestTeams(20)}
            onBest={() => suggestTeams(0)}
            onRematch={() => lastMatch()}
            onStart={() => createMatch().then(() => refresh())}
            disabledSuggest={disabledSuggest}
            disabledStart={disabledStart}
            streaks={streaks}
          />

          {/* Spotlight + Head-to-Head */}
          {allMatches && (
            <div className="flex flex-col gap-6">
              <PlayerSpotlight
                matches={allMatches}
                players={players}
                streaks={streaks}
                seasonName={currentSeason?.name ?? null}
              />
              <Section title="Head-to-Head">
                <HeadToHead players={players} matches={allMatches} streaks={streaks} />
              </Section>
              <Section title="Pairings">
                <Pairings players={players} pairings={pairings} onRefresh={refresh} />
              </Section>
            </div>
          )}

          {/* History */}
          {matches && (
            <MatchHistory
              matches={matches}
              players={players}
              onEndMatch={endMatch}
              onRevertMatch={revertMatch}
              onCancelMatch={cancelMatch}
              onRematch={lastMatch}
            />
          )}
        </div>
      </div>
    </div>
  );
}
