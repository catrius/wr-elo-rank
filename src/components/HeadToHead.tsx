import { useState, useMemo } from 'react';
import { orderBy } from 'es-toolkit';
import type { Player, Match } from '@/types/common.ts';
import type { Streak } from '@/utils/streaks.ts';
import Avatar from '@/components/Avatar.tsx';
import { useDisplayName } from '@/contexts/DisplayNameContext.tsx';

interface Props {
  players: Player[] | null;
  matches: Match[] | null;
  streaks: Record<number, Streak>;
}

function PlayerSelect({
  players,
  value,
  onChange,
  label,
  displayName,
}: {
  players: Player[];
  value: number | null;
  onChange: (id: number | null) => void;
  label: string;
  displayName: (player: Player) => string;
}) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      aria-label={label}
      className={`
        w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm
        dark:border-gray-700 dark:bg-gray-800
      `}
    >
      <option value="">Select player</option>
      {players.map((p) => (
        <option key={p.id} value={p.id}>
          {displayName(p)}
        </option>
      ))}
    </select>
  );
}

export default function HeadToHead({ players, matches: allMatches, streaks }: Props) {
  const { displayName } = useDisplayName();
  const [playerAId, setPlayerAId] = useState<number | null>(null);
  const [playerBId, setPlayerBId] = useState<number | null>(null);

  const sortedPlayers = useMemo(
    () => (players ? orderBy(players, [(p) => displayName(p)], ['asc']) : []),
    [players, displayName],
  );

  const playerA = useMemo(() => players?.find((p) => p.id === playerAId) ?? null, [players, playerAId]);
  const playerB = useMemo(() => players?.find((p) => p.id === playerBId) ?? null, [players, playerBId]);

  const results = useMemo(() => {
    if (!playerAId || !playerBId || !allMatches) return null;

    return allMatches.reduce(
      (acc, m) => {
        if (m.result !== 'A' && m.result !== 'B') return acc;

        const aInTeamA = m.team_a_players.includes(playerAId);
        const aInTeamB = m.team_b_players.includes(playerAId);
        const bInTeamA = m.team_a_players.includes(playerBId);
        const bInTeamB = m.team_b_players.includes(playerBId);

        // only count matches where they were on opposite teams
        const opposed = (aInTeamA && bInTeamB) || (aInTeamB && bInTeamA);
        if (!opposed) return acc;

        const aWon = (aInTeamA && m.result === 'A') || (aInTeamB && m.result === 'B');

        return {
          total: acc.total + 1,
          aWins: acc.aWins + (aWon ? 1 : 0),
          bWins: acc.bWins + (aWon ? 0 : 1),
        };
      },
      { total: 0, aWins: 0, bWins: 0 },
    );
  }, [playerAId, playerBId, allMatches]);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <PlayerSelect
          players={sortedPlayers}
          value={playerAId}
          onChange={setPlayerAId}
          label="Player A"
          displayName={displayName}
        />
        <span
          className={`
            text-xs font-semibold text-gray-400
            dark:text-gray-500
          `}
        >
          VS
        </span>
        <PlayerSelect
          players={sortedPlayers}
          value={playerBId}
          onChange={setPlayerBId}
          label="Player B"
          displayName={displayName}
        />
      </div>

      {playerA && playerB && results ? (
        results.total === 0 ? (
          <p
            className={`
              text-center text-sm text-gray-500
              dark:text-gray-400
            `}
          >
            No matches found between these players
          </p>
        ) : (
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="flex flex-col items-center gap-1">
              <Avatar src={playerA.avatar} name={displayName(playerA)} streak={streaks[playerA.id]} />
              <span className="text-sm font-semibold">{displayName(playerA)}</span>
              <span
                className={`
                  text-2xl font-bold text-indigo-600
                  dark:text-indigo-400
                `}
              >
                {results.aWins}
              </span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span
                className={`
                  text-xs text-gray-400
                  dark:text-gray-500
                `}
              >
                {results.total} matches
              </span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Avatar src={playerB.avatar} name={displayName(playerB)} streak={streaks[playerB.id]} />
              <span className="text-sm font-semibold">{displayName(playerB)}</span>
              <span
                className={`
                  text-2xl font-bold text-indigo-600
                  dark:text-indigo-400
                `}
              >
                {results.bWins}
              </span>
            </div>
          </div>
        )
      ) : (
        <p
          className={`
            text-center text-sm text-gray-500
            dark:text-gray-400
          `}
        >
          Pick two players to compare
        </p>
      )}
    </div>
  );
}
