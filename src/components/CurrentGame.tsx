import Section from '@/components/Section.tsx';
import MatchCard from '@/components/MatchCard.tsx';
import { useGameDataContext } from '@/contexts/GameDataContext.tsx';
import { useTeamsContext } from '@/contexts/TeamsContext.tsx';
import { useMatchActionsContext } from '@/contexts/MatchActionsContext.tsx';

export default function CurrentGame() {
  const { matches, players } = useGameDataContext();
  const { lastMatch } = useTeamsContext();
  const { endMatch, revertMatch, cancelMatch } = useMatchActionsContext();

  const currentMatch = matches?.find((m) => m.result === null);

  if (!currentMatch) return null;

  return (
    <div className="mt-6">
      <Section title="Current Game">
        <ul>
          <MatchCard
            match={currentMatch}
            players={players}
            onEndMatch={endMatch}
            onRevertMatch={revertMatch}
            onCancelMatch={cancelMatch}
            onRematch={lastMatch}
          />
        </ul>
      </Section>
    </div>
  );
}
