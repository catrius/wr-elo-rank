import { useMemo } from 'react';
import type { Player, Match } from '@/types/common.ts';
import Section from '@/components/Section.tsx';
import Avatar from '@/components/Avatar.tsx';
import { useDisplayName } from '@/contexts/DisplayNameContext.tsx';

interface Props {
  players: Player[];
  matches: Match[];
  prevPlayers: Player[] | null;
}

function pairKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

interface DuoStat {
  playerA: Player;
  playerB: Player;
  wins: number;
  total: number;
  rate: number;
}

interface RankChange {
  player: Player;
  prevRank: number;
  currentRank: number;
  change: number;
}

function computeChemistry(matches: Match[], players: Player[]): { good: DuoStat[]; bad: DuoStat[] } {
  const finished = matches.filter((m) => m.result === 'A' || m.result === 'B');
  const duoWins: Record<string, number> = {};
  const duoTotal: Record<string, number> = {};

  finished.forEach((m) => {
    const winnerIds = m.result === 'A' ? m.team_a_players : m.team_b_players;
    const loserIds = m.result === 'A' ? m.team_b_players : m.team_a_players;

    winnerIds.forEach((idA, i) => {
      winnerIds.slice(i + 1).forEach((idB) => {
        const key = pairKey(idA, idB);
        duoWins[key] = (duoWins[key] || 0) + 1;
        duoTotal[key] = (duoTotal[key] || 0) + 1;
      });
    });

    loserIds.forEach((idA, i) => {
      loserIds.slice(i + 1).forEach((idB) => {
        const key = pairKey(idA, idB);
        duoTotal[key] = (duoTotal[key] || 0) + 1;
      });
    });
  });

  const MIN_MATCHES = 3;
  const playerMap = new Map(players.map((p) => [p.id, p]));

  const duos: DuoStat[] = Object.entries(duoTotal)
    .filter(([, total]) => total >= MIN_MATCHES)
    .map(([key, total]) => {
      const [idA, idB] = key.split('-').map(Number);
      const pA = playerMap.get(idA);
      const pB = playerMap.get(idB);
      if (!pA || !pB) return null;
      const wins = duoWins[key] || 0;
      return { playerA: pA, playerB: pB, wins, total, rate: wins / total };
    })
    .filter((d): d is DuoStat => d !== null);

  const good = duos.sort((a, b) => b.rate - a.rate || b.total - a.total).slice(0, 5);
  const bad = [...duos].sort((a, b) => a.rate - b.rate || b.total - a.total).slice(0, 5);

  return { good, bad };
}

function computeRankChanges(
  players: Player[],
  prevPlayers: Player[],
): { improved: RankChange[]; dropped: RankChange[] } {
  const currentRanked = [...players].sort((a, b) => b.elo - a.elo);
  const prevRanked = [...prevPlayers].sort((a, b) => b.elo - a.elo);

  const currentRankMap = new Map(currentRanked.map((p, i) => [p.id, i + 1]));
  const prevRankMap = new Map(prevRanked.map((p, i) => [p.id, i + 1]));

  const changes: RankChange[] = currentRanked
    .filter((p) => prevRankMap.has(p.id))
    .map((p) => {
      const currentRank = currentRankMap.get(p.id)!;
      const prevRank = prevRankMap.get(p.id)!;
      return { player: p, prevRank, currentRank, change: prevRank - currentRank };
    });

  const improved = changes
    .filter((c) => c.change > 0)
    .sort((a, b) => b.change - a.change)
    .slice(0, 5);
  const dropped = changes
    .filter((c) => c.change < 0)
    .sort((a, b) => a.change - b.change)
    .slice(0, 5);

  return { improved, dropped };
}

function DuoList({ duos, displayName }: { duos: DuoStat[]; displayName: (player: Player) => string }) {
  if (duos.length === 0)
    return (
      <p
        className={`
          text-sm text-gray-500
          dark:text-gray-400
        `}
      >
        Not enough data
      </p>
    );
  return (
    <ol className="space-y-2">
      {duos.map((duo, i) => (
        <li key={`${duo.playerA.id}-${duo.playerB.id}`} className="flex items-center gap-2 text-sm">
          <span className="w-4 shrink-0 text-right text-gray-400">{i + 1}</span>
          <Avatar src={duo.playerA.avatar} name={displayName(duo.playerA)} />
          <Avatar src={duo.playerB.avatar} name={displayName(duo.playerB)} />
          <span className="min-w-0 leading-tight">
            <span className="block truncate">{displayName(duo.playerA)}</span>
            <span className="block truncate">{displayName(duo.playerB)}</span>
          </span>
          <span
            className={`
              ml-auto shrink-0 text-xs text-indigo-600
              dark:text-indigo-400
            `}
          >
            {duo.wins}W–{duo.total - duo.wins}L ({Math.round(duo.rate * 100)}%)
          </span>
        </li>
      ))}
    </ol>
  );
}

function RankList({
  changes,
  direction,
  displayName,
}: {
  changes: RankChange[];
  direction: 'up' | 'down';
  displayName: (player: Player) => string;
}) {
  if (changes.length === 0)
    return (
      <p
        className={`
          text-sm text-gray-500
          dark:text-gray-400
        `}
      >
        No changes
      </p>
    );
  return (
    <ol className="space-y-2">
      {changes.map((c, i) => (
        <li key={c.player.id} className="flex items-center gap-2 text-sm">
          <span className="w-4 shrink-0 text-right text-gray-400">{i + 1}</span>
          <Avatar src={c.player.avatar} name={displayName(c.player)} />
          <span className="min-w-0 truncate">{displayName(c.player)}</span>
          <span
            className={`
              ml-auto shrink-0 text-xs
              ${
                direction === 'up'
                  ? `
                    text-green-600
                    dark:text-green-400
                  `
                  : `
                    text-red-600
                    dark:text-red-400
                  `
              }
            `}
          >
            #{c.prevRank} → #{c.currentRank} ({direction === 'up' ? '+' : ''}
            {c.change})
          </span>
        </li>
      ))}
    </ol>
  );
}

export default function SeasonSpotlight({ players, matches, prevPlayers }: Props) {
  const { displayName } = useDisplayName();
  const { good, bad } = useMemo(() => computeChemistry(matches, players), [matches, players]);

  const { improved, dropped } = useMemo(
    () => (prevPlayers ? computeRankChanges(players, prevPlayers) : { improved: [], dropped: [] }),
    [players, prevPlayers],
  );

  return (
    <div
      className={`
        mt-6 grid gap-6
        md:grid-cols-2
      `}
    >
      <Section title="Good Chemistry">
        <DuoList duos={good} displayName={displayName} />
      </Section>
      <Section title="Bad Chemistry">
        <DuoList duos={bad} displayName={displayName} />
      </Section>
      <Section title="Rank Improved">
        <RankList changes={improved} direction="up" displayName={displayName} />
      </Section>
      <Section title="Rank Dropped">
        <RankList changes={dropped} direction="down" displayName={displayName} />
      </Section>
    </div>
  );
}
