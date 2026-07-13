import Section from '@/components/Section.tsx';
import MatchCard from '@/components/MatchCard.tsx';
import { useGameDataContext } from '@/contexts/GameDataContext.tsx';
import { useTeamsContext } from '@/contexts/TeamsContext.tsx';
import { useMatchActionsContext } from '@/contexts/MatchActionsContext.tsx';

export default function MatchHistory() {
  const { matches, players } = useGameDataContext();
  const { lastMatch } = useTeamsContext();
  const { endMatch, revertMatch, cancelMatch } = useMatchActionsContext();
  return (
    <Section title="Match History">
      {!matches || matches.filter((m) => m.result !== null).length === 0 ? (
        <div
          className={`
            text-sm text-gray-600
            dark:text-gray-300
          `}
        >
          No matches yet. Start our first one!
        </div>
      ) : (
        <ul className="space-y-4">
          {matches
            .filter((m) => m.result !== null)
            .map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                players={players}
                onEndMatch={endMatch}
                onRevertMatch={revertMatch}
                onCancelMatch={cancelMatch}
                onRematch={lastMatch}
              />
            ))}
        </ul>
      )}
    </Section>
  );
}
