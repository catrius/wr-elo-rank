import { useMemo } from 'react';
import type { Player, Match } from '@/types/common.ts';
import Section from '@/components/Section.tsx';
import Pill from '@/components/Pill.tsx';
import Avatar from '@/components/Avatar.tsx';
import { useDisplayName } from '@/contexts/DisplayNameContext.tsx';
import { useGameDataContext } from '@/contexts/GameDataContext.tsx';

interface StatCard {
  label: string;
  player: Player;
  player2?: Player;
  value: string;
}

function findPlayer(players: Player[], id: number): Player | undefined {
  return players.find((p) => p.id === id);
}

/** Only matches with a definitive winner (A or B) */
function completedMatches(matches: Match[]): Match[] {
  return matches.filter((m) => m.result === 'A' || m.result === 'B');
}

function computeOnFire(finished: Match[], players: Player[]): StatCard | null {
  const frozen: Record<number, boolean> = {};
  const streaks: Record<number, number> = {};

  finished.forEach((m) => {
    const winners = m.result === 'A' ? m.team_a_players : m.team_b_players;
    const losers = m.result === 'A' ? m.team_b_players : m.team_a_players;

    winners.forEach((id) => {
      if (!frozen[id]) streaks[id] = (streaks[id] || 0) + 1;
    });
    losers.forEach((id) => {
      frozen[id] = true;
    });
  });

  const best = Object.entries(streaks).reduce(
    (acc, [id, count]) => (count > acc.count ? { id: Number(id), count } : acc),
    { id: -1, count: 0 },
  );

  if (best.id === -1 || best.count < 2) return null;
  const p = findPlayer(players, best.id);
  return p ? { label: 'On Fire', player: p, value: `${best.count}W streak` } : null;
}

function computeOnIce(finished: Match[], players: Player[]): StatCard | null {
  const frozen: Record<number, boolean> = {};
  const streaks: Record<number, number> = {};

  finished.forEach((m) => {
    const winners = m.result === 'A' ? m.team_a_players : m.team_b_players;
    const losers = m.result === 'A' ? m.team_b_players : m.team_a_players;

    losers.forEach((id) => {
      if (!frozen[id]) streaks[id] = (streaks[id] || 0) + 1;
    });
    winners.forEach((id) => {
      frozen[id] = true;
    });
  });

  const worst = Object.entries(streaks).reduce(
    (acc, [id, count]) => (count > acc.count ? { id: Number(id), count } : acc),
    { id: -1, count: 0 },
  );

  if (worst.id === -1 || worst.count < 2) return null;
  const p = findPlayer(players, worst.id);
  return p ? { label: 'On Ice', player: p, value: `${worst.count}L streak` } : null;
}

function pairKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

function computeTeamChemistry(finished: Match[], players: Player[]): StatCard | null {
  const duoWins: Record<string, number> = {};
  const duoTotal: Record<string, number> = {};

  finished.forEach((m) => {
    const winnerIds = m.result === 'A' ? m.team_a_players : m.team_b_players;
    const loserIds = m.result === 'A' ? m.team_b_players : m.team_a_players;

    // count all pairs on the winning team
    winnerIds.forEach((idA, i) => {
      winnerIds.slice(i + 1).forEach((idB) => {
        const key = pairKey(idA, idB);
        duoWins[key] = (duoWins[key] || 0) + 1;
        duoTotal[key] = (duoTotal[key] || 0) + 1;
      });
    });

    // count all pairs on the losing team (total only)
    loserIds.forEach((idA, i) => {
      loserIds.slice(i + 1).forEach((idB) => {
        const key = pairKey(idA, idB);
        duoTotal[key] = (duoTotal[key] || 0) + 1;
      });
    });
  });

  const MIN_MATCHES = 3;

  const best = Object.entries(duoTotal).reduce(
    (acc, [key, total]) => {
      if (total < MIN_MATCHES) return acc;
      const wins = duoWins[key] || 0;
      const rate = wins / total;
      return rate > acc.rate || (rate === acc.rate && total > acc.total) ? { key, rate, wins, total } : acc;
    },
    { key: '', rate: 0, wins: 0, total: 0 },
  );

  if (!best.key) return null;
  const [idA, idB] = best.key.split('-').map(Number);
  const pA = findPlayer(players, idA);
  const pB = findPlayer(players, idB);
  if (!pA || !pB) return null;

  return {
    label: 'Good Chemistry',
    player: pA,
    player2: pB,
    value: `${best.wins}W–${best.total - best.wins}L (${Math.round(best.rate * 100)}%)`,
  };
}

function computeOilAndWater(finished: Match[], players: Player[]): StatCard | null {
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

  const worst = Object.entries(duoTotal).reduce(
    (acc, [key, total]) => {
      if (total < MIN_MATCHES) return acc;
      const wins = duoWins[key] || 0;
      const rate = wins / total;
      return rate < acc.rate || (rate === acc.rate && total > acc.total) ? { key, rate, wins, total } : acc;
    },
    { key: '', rate: 1, wins: 0, total: 0 },
  );

  if (!worst.key) return null;
  const [idA, idB] = worst.key.split('-').map(Number);
  const pA = findPlayer(players, idA);
  const pB = findPlayer(players, idB);
  if (!pA || !pB) return null;

  return {
    label: 'Bad chemistry',
    player: pA,
    player2: pB,
    value: `${worst.wins}W–${worst.total - worst.wins}L (${Math.round(worst.rate * 100)}%)`,
  };
}

export default function PlayerSpotlight() {
  const { allMatches: matches, players, streaks, currentSeason } = useGameDataContext();
  const seasonName = currentSeason?.name ?? null;
  const { displayName } = useDisplayName();
  const stats = useMemo(() => {
    if (!matches || !players || players.length === 0) return [];
    const finished = completedMatches(matches);
    if (finished.length === 0) return [];

    return [
      computeOnFire(finished, players),
      computeOnIce(finished, players),
      computeTeamChemistry(finished, players),
      computeOilAndWater(finished, players),
    ].filter((card): card is StatCard => card !== null);
  }, [matches, players]);

  if (!matches || stats.length === 0) return null;

  return (
    <Section
      title="Player Spotlight"
      actions={
        <Pill>
          {seasonName ?? 'Current Season'} · {matches.length} matches
        </Pill>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`
              flex flex-col items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 p-3 text-center
              dark:border-gray-800 dark:bg-gray-800/50
            `}
          >
            <span
              className={`
                text-xs font-medium tracking-wide text-gray-500 uppercase
                dark:text-gray-400
              `}
            >
              {stat.label}
            </span>
            <div className="flex items-center gap-1">
              <Avatar src={stat.player.avatar} name={displayName(stat.player)} streak={streaks[stat.player.id]} />
              {stat.player2 && (
                <Avatar src={stat.player2.avatar} name={displayName(stat.player2)} streak={streaks[stat.player2.id]} />
              )}
            </div>
            <span className="text-sm font-semibold">
              {displayName(stat.player)}
              {stat.player2 ? (
                <>
                  <br />
                  {displayName(stat.player2)}
                </>
              ) : (
                ''
              )}
            </span>
            <span
              className={`
                text-xs text-indigo-600
                dark:text-indigo-400
              `}
            >
              {stat.value}
            </span>
          </div>
        ))}
      </div>
    </Section>
  );
}
