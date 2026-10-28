import { zip } from 'es-toolkit';
import { find } from 'es-toolkit/compat';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import type { Player, Match } from '@/types/common.ts';
import Pill from '@/components/Pill';
import Avatar from '@/components/Avatar.tsx';
import { useDisplayName } from '@/contexts/DisplayNameContext.tsx';

dayjs.extend(utc);

interface Props {
  match: Match;
  players: Player[] | null;
  highlightedPlayerId?: number;
  onEndMatch?: (match: Match, result: 'A' | 'B') => void;
  onRevertMatch?: (match: Match) => void;
  onCancelMatch?: (match: Match) => void;
  onRematch?: (match: Match) => void;
}

function TeamEloList({
  playerIds,
  newElos,
  elos,
  players,
  highlightedPlayerId,
}: {
  playerIds: number[];
  newElos: number[];
  elos: number[];
  players: Player[] | null;
  highlightedPlayerId: number | undefined;
}) {
  const { displayName } = useDisplayName();

  return (
    <ul className="mb-3 space-y-1.5">
      {zip(playerIds, newElos, elos).map(([id, newElo, elo]) => {
        const diff = newElo - elo;
        const diffStr = diff >= 0 ? `+${diff}` : diff;
        const player = find(players, { id });
        return (
          <li key={id} className="flex items-center gap-2">
            {newElo && elo && (
              <span
                className={`
                  w-8 text-right
                  ${diff >= 0 ? 'text-green-700' : 'text-red-700'}
                `}
              >
                {diffStr}
              </span>
            )}
            <Avatar src={player?.avatar ?? null} name={player ? displayName(player) : ''} />
            <span
              className={`
                min-w-0 flex-1 truncate
                ${
                  id === highlightedPlayerId
                    ? `
                      font-bold text-indigo-700
                      dark:text-indigo-300
                    `
                    : ''
                }
              `}
            >
              {player ? displayName(player) : ''}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default function MatchCard({
  match,
  players,
  highlightedPlayerId = undefined,
  onEndMatch = undefined,
  onRevertMatch = undefined,
  onCancelMatch = undefined,
  onRematch = undefined,
}: Props) {
  let playerResult: 'Win' | 'Loss' | null = null;
  if (highlightedPlayerId !== undefined && (match.result === 'A' || match.result === 'B')) {
    const playerTeam = match.team_a_players.includes(highlightedPlayerId)
      ? 'A'
      : match.team_b_players.includes(highlightedPlayerId)
        ? 'B'
        : null;
    if (playerTeam) playerResult = playerTeam === match.result ? 'Win' : 'Loss';
  }

  return (
    <li
      className={`
        rounded-xl border border-gray-200 p-4
        dark:border-gray-700
        ${
          playerResult === 'Win'
            ? `
              border-l-4 border-l-green-500
              dark:border-l-green-400
            `
            : ''
        }
        ${
          playerResult === 'Loss'
            ? `
              border-l-4 border-l-red-500
              dark:border-l-red-400
            `
            : ''
        }
        ${(match.result === 'Cancelled' || match.result === 'Reverted') && 'opacity-50'}
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex flex-1/4 justify-start gap-2">
          {playerResult && (
            <span
              className={`
                inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold tracking-wide uppercase ring-1
                ring-inset
                ${
                  playerResult === 'Win'
                    ? `
                      bg-green-100 text-green-800 ring-green-200
                      dark:bg-green-900/40 dark:text-green-300 dark:ring-green-800
                    `
                    : `
                      bg-red-100 text-red-800 ring-red-200
                      dark:bg-red-900/40 dark:text-red-300 dark:ring-red-800
                    `
                }
              `}
            >
              {playerResult}
            </span>
          )}
          {match.result !== 'A' && match.result !== 'B' && <Pill>{match.result || 'In game'}</Pill>}
          {(match.result === 'A' || match.result === 'B') && onRevertMatch && (
            <button
              type="button"
              className={`
                cursor-pointer rounded-full bg-red-600 px-2 py-1 text-xs text-white
                hover:bg-red-700
                disabled:opacity-50
              `}
              onClick={() => onRevertMatch(match)}
            >
              Revert
            </button>
          )}
        </div>
        <div
          className={`
            flex-1/2 justify-center text-center text-sm text-gray-600
            dark:text-gray-300
          `}
        >
          <span>{dayjs.utc(match.created_at).local().format('DD/MM/YYYY HH:mm')}</span>
        </div>
        <div className="flex flex-1/4 justify-end gap-2">
          {!match.result && onCancelMatch && (
            <button
              type="button"
              className={`
                cursor-pointer rounded-full bg-red-600 px-2 py-1 text-xs text-white
                hover:bg-red-700
                disabled:opacity-50
              `}
              onClick={() => onCancelMatch(match)}
            >
              Cancel
            </button>
          )}
          {match.result && onRematch && (
            <button
              type="button"
              className={`
                cursor-pointer rounded-full bg-green-600 px-2 py-1 text-xs text-white
                hover:bg-green-700
                disabled:opacity-50
              `}
              onClick={() => onRematch(match)}
            >
              Rematch
            </button>
          )}
        </div>
      </div>
      <div
        className={`
          mt-3 grid grid-cols-1 gap-4 text-sm
          md:grid-cols-[1fr_auto_1fr]
        `}
      >
        <div className="min-w-0">
          <div className="mb-1 font-medium">Team A</div>
          <TeamEloList
            playerIds={match.team_a_players}
            newElos={match.team_a_new_elos || []}
            elos={match.team_a_elos}
            players={players}
            highlightedPlayerId={highlightedPlayerId}
          />
          {!match.result && onEndMatch && (
            <button
              type="button"
              className={`
                cursor-pointer rounded-xl bg-cyan-600 px-4 py-2 text-white
                hover:bg-cyan-700
                disabled:opacity-50
              `}
              onClick={() => onEndMatch(match, 'A')}
            >
              Team A wins
            </button>
          )}
        </div>
        <div
          className={`
            h-px w-full bg-gray-200
            md:hidden
            dark:bg-gray-700
          `}
        />
        <div
          className={`
            hidden w-px self-stretch bg-gray-200
            md:block
            dark:bg-gray-700
          `}
        />
        <div className="min-w-0">
          <div className="mb-1 font-medium">Team B</div>
          <TeamEloList
            playerIds={match.team_b_players}
            newElos={match.team_b_new_elos || []}
            elos={match.team_b_elos}
            players={players}
            highlightedPlayerId={highlightedPlayerId}
          />
          {!match.result && onEndMatch && (
            <button
              type="button"
              className={`
                cursor-pointer rounded-xl bg-cyan-600 px-4 py-2 text-white
                hover:bg-cyan-700
                disabled:opacity-50
              `}
              onClick={() => onEndMatch(match, 'B')}
            >
              Team B wins
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
