import type { Player, Match } from '@/types/common.ts';
import Pill from '@/components/Pill';
import Section from '@/components/Section.tsx';
import MatchCard from '@/components/MatchCard.tsx';

interface Props {
  matches: Match[];
  players: Player[] | null;
  matchCount: number | null;
  onEndMatch: (match: Match, result: 'A' | 'B') => void;
  onRevertMatch: (match: Match) => void;
  onCancelMatch: (match: Match) => void;
  onRematch: (match: Match) => void;
}

export default function MatchHistory({
  matches,
  players,
  matchCount,
  onEndMatch,
  onRevertMatch,
  onCancelMatch,
  onRematch,
}: Props) {
  return (
    <Section title="Match History" actions={<Pill>{matchCount} total</Pill>}>
      {matches.length === 0 ? (
        <div
          className={`
            text-sm text-gray-600
            dark:text-gray-300
          `}
        >
          No matches yet. Start our first one!
        </div>
      ) : (
        <ul className="space-y-3">
          {matches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              players={players}
              onEndMatch={onEndMatch}
              onRevertMatch={onRevertMatch}
              onCancelMatch={onCancelMatch}
              onRematch={onRematch}
            />
          ))}
        </ul>
      )}
    </Section>
  );
}
