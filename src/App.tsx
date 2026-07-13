import { useState, useMemo } from 'react';
import Leaderboard from '@/components/Leaderboard.tsx';
import AvailablePlayers from '@/components/AvailablePlayers.tsx';
import NewMatch from '@/components/NewMatch.tsx';
import MatchHistory from '@/components/MatchHistory.tsx';
import PlayerSpotlight from '@/components/PlayerSpotlight.tsx';
import HeadToHead from '@/components/HeadToHead.tsx';
import Pairings from '@/components/Pairings.tsx';
import Section from '@/components/Section.tsx';
import SeasonNav from '@/components/SeasonNav.tsx';
import WeeklyCard from '@/components/WeeklyCard.tsx';
import CurrentGame from '@/components/CurrentGame.tsx';
import { GameDataProvider, useGameDataContext } from '@/contexts/GameDataContext.tsx';
import { TeamsProvider } from '@/contexts/TeamsContext.tsx';
import { MatchActionsProvider } from '@/contexts/MatchActionsContext.tsx';
import { getWeekWindow, computeWeeklyStats, countWeekMatches, computeWeeklyChemistry } from '@/utils/weeklyStats.ts';

function AppContent() {
  const { allMatches, matches, players, seasons, streaks } = useGameDataContext();
  const [leaderboardTab, setLeaderboardTab] = useState<'season' | 'weekly'>('season');

  const weekData = useMemo(() => {
    if (!allMatches || !players || allMatches.length === 0) return null;
    const week = getWeekWindow(allMatches);
    if (!week) return null;
    const stats = computeWeeklyStats(allMatches, players, week);
    const matchCount = countWeekMatches(allMatches, week);
    const chemistry = computeWeeklyChemistry(allMatches, players, week);
    return { week, stats, matchCount, chemistry };
  }, [allMatches, players]);

  return (
    <>
      <SeasonNav seasons={seasons ?? []} />

      {/* Leaderboard */}
      <Leaderboard
        players={players}
        streaks={streaks}
        matches={allMatches ?? undefined}
        weeklyStats={weekData?.stats}
        weekLabel={weekData?.week.label}
        activeTab={leaderboardTab}
        onTabChange={setLeaderboardTab}
      />

      {/* Weekly highlights card */}
      {weekData && weekData.stats.length > 0 && (
        <div className="mt-6">
          <WeeklyCard
            weeklyStats={weekData.stats}
            weekLabel={weekData.week.label}
            weekMatchCount={weekData.matchCount}
            chemistry={weekData.chemistry}
            onViewWeekly={() => {
              setLeaderboardTab('weekly');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </div>
      )}

      {/* Current in-progress match — desktop: full-width below WeeklyCard */}
      <div
        className={`
          hidden
          md:block
        `}
      >
        <CurrentGame />
      </div>

      {/* Input form */}
      <div
        className={`
          mt-6 grid gap-6
          md:mt-10 md:grid-cols-2
        `}
      >
        <AvailablePlayers />

        {/* Current in-progress match — mobile: right above NewMatch */}
        <div className="md:hidden">
          <CurrentGame />
        </div>

        <NewMatch />

        {/* Spotlight + Head-to-Head */}
        {allMatches && (
          <div className="flex flex-col gap-6">
            <PlayerSpotlight />
            <Section title="Head-to-Head">
              <HeadToHead />
            </Section>
            <Section title="Pairings">
              <Pairings />
            </Section>
          </div>
        )}

        {/* History */}
        {matches && <MatchHistory />}
      </div>
    </>
  );
}

export default function App() {
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
            mb-6 flex items-center gap-4
            md:mb-10
          `}
        >
          <h1
            className={`
              text-2xl font-bold tracking-tight
              md:text-3xl
            `}
          >
            Go Go Toolkit
          </h1>
        </header>

        <GameDataProvider>
          <TeamsProvider>
            <MatchActionsProvider>
              <AppContent />
            </MatchActionsProvider>
          </TeamsProvider>
        </GameDataProvider>
      </div>
    </div>
  );
}
