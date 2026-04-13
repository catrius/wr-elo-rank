import { zip } from 'es-toolkit';
import { find } from 'es-toolkit/compat';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import type { Player, Match } from '@/types/common.ts';
import Pill from '@/components/Pill';
import Avatar from '@/components/Avatar.tsx';

dayjs.extend(utc);

interface Props {
  match: Match;
  players: Player[] | null;
  onEndMatch: (match: Match, result: 'A' | 'B') => void;
  onRevertMatch: (match: Match) => void;
  onCancelMatch: (match: Match) => void;
  onRematch: (match: Match) => void;
}

function TeamEloList({
  playerIds,
  newElos,
  elos,
  players,
}: {
  playerIds: number[];
  newElos: number[];
  elos: number[];
  players: Player[] | null;
}) {
  return (
    <ul className="mb-3 space-y-1.5">
      {zip(playerIds, newElos, elos).map(([id, newElo, elo]) => {
        const diff = newElo - elo;
        const diffStr = diff >= 0 ? `+${diff}` : diff;
        const player = find(players, { id });
        return (
          <li key={id} className="flex items-center gap-2">
            {newElo && elo && <span className={diff >= 0 ? 'text-green-700' : 'text-red-700'}>{diffStr}</span>}
            <Avatar src={player?.avatar ?? null} name={player?.name ?? ''} />
            <span>{player?.name}</span>
          </li>
        );
      })}
    </ul>
  );
}

export default function MatchCard({ match, players, onEndMatch, onRevertMatch, onCancelMatch, onRematch }: Props) {
  return (
    <li
      className={`
        rounded-xl border border-gray-200 p-4
        dark:border-gray-700
        ${(match.result === 'Cancelled' || match.result === 'Reverted') && 'opacity-50'}
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex flex-1/4 justify-start gap-2">
          {match.result !== 'A' && match.result !== 'B' && <Pill>{match.result || 'In game'}</Pill>}
          {(match.result === 'A' || match.result === 'B') && (
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
          {!match.result && (
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
          {match.result && (
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
        <div>
          <div className="mb-1 font-medium">Team A</div>
          <TeamEloList
            playerIds={match.team_a_players}
            newElos={match.team_a_new_elos || []}
            elos={match.team_a_elos}
            players={players}
          />
          {!match.result && (
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
        <div>
          <div className="mb-1 font-medium">Team B</div>
          <TeamEloList
            playerIds={match.team_b_players}
            newElos={match.team_b_new_elos || []}
            elos={match.team_b_elos}
            players={players}
          />
          {!match.result && (
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
