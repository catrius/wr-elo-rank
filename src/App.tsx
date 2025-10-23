import { useEffect, useMemo, useState, useCallback } from 'react';
import EloRank from 'elo-rank';
import { sampleSize, mean, zipWith, orderBy, meanBy, sum, sumBy } from 'es-toolkit';
import supabase from '@/lib/supabase.ts';
import useSupaQuery from '@/hooks/useSupaQuery.ts';
import type { Player, Match } from '@/types/common.ts';
import { find, some } from 'es-toolkit/compat';
import Pill from '@/components/Pill';
import Section from '@/components/Section.tsx';

const eloRank = new EloRank(15);

export default function App() {
  const getPlayersCallback = useCallback(
    async () => supabase.from('player').select().order('elo', { ascending: false }),
    [],
  );
  const [getPlayers, { data: playerData }] = useSupaQuery(getPlayersCallback);
  const players = playerData as Player[] | null;

  const getMatchesCallback = useCallback(
    async () => supabase.from('match').select().order('created_at', { ascending: false }).limit(20),
    [],
  );
  const [getMatches, { data: matchesData }] = useSupaQuery(getMatchesCallback);
  const matches = matchesData as Match[] | null;

  const getMatchCountCallback = useCallback(
    async () => supabase.from('match').select('*', { count: 'exact', head: true }),
    [],
  );
  const [getMatchCount, { count: matchCount }] = useSupaQuery(getMatchCountCallback);

  const [teamA, setTeamA] = useState<Player[]>([]);
  const [teamB, setTeamB] = useState<Player[]>([]);
  const [availableIds, setAvailableIds] = useState<number[]>([]);

  const disabledStart = useMemo(
    () => some(matches, (match) => !match.result) || teamA.length === 0,
    [matches, teamA.length],
  );

  const disabledSuggest = useMemo(() => teamA.length === 0, [teamA.length]);

  const newMatch = useMemo(
    () =>
      ({
        team_a_elos: teamA.map((player) => player.elo),
        team_a_players: teamA.map((player) => player.id),
        team_b_elos: teamB.map((player) => player.elo),
        team_b_players: teamB.map((player) => player.id),
      }) as Match,
    [teamA, teamB],
  );

  const createMatchCallback = useCallback(async () => supabase.from('match').insert([newMatch]), [newMatch]);
  const [createMatch] = useSupaQuery(createMatchCallback);

  const toggleAvailable = useCallback((id: number) => {
    setAvailableIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const refresh = useCallback(() => {
    getPlayers();
    getMatches();
    getMatchCount();
  }, [getMatchCount, getMatches, getPlayers]);

  const endMatch = useCallback(
    async (match: Match, result: 'A' | 'B') => {
      const meanTeamAElo = mean(match.team_a_elos);
      const meanTeamBElo = mean(match.team_b_elos);

      const teamANewElos = match.team_a_elos.map((playerAElo) => {
        const resultNumber = result === 'A' ? 1 : 0;
        const expectedScoreA = eloRank.getExpected(playerAElo, meanTeamBElo);
        return eloRank.updateRating(expectedScoreA, resultNumber, playerAElo);
      });

      const teamBNewElos = match.team_b_elos.map((playerBElo) => {
        const resultNumber = result === 'B' ? 1 : 0;
        const expectedScoreB = eloRank.getExpected(playerBElo, meanTeamAElo);
        return eloRank.updateRating(expectedScoreB, resultNumber, playerBElo);
      });

      const teamANewWins = match.team_a_players.map((id) => {
        const player = find(players, { id });
        if (!player) {
          return 0;
        }
        if (result === 'A') {
          return player.win + 1;
        }
        return player.win;
      }, []);

      const teamBNewWins = match.team_b_players.map((id) => {
        const player = find(players, { id });
        if (!player) {
          return 0;
        }
        if (result === 'B') {
          return player.win + 1;
        }
        return player.win;
      }, []);

      const teamANewTotal = match.team_a_players.map((id) => {
        const player = find(players, { id });
        if (!player) {
          return 1;
        }
        return player.total + 1;
      }, []);

      const teamBNewTotal = match.team_b_players.map((id) => {
        const player = find(players, { id });
        if (!player) {
          return 1;
        }
        return player.total + 1;
      }, []);

      const updatedAPlayers: Partial<Player>[] = zipWith(
        match.team_a_players,
        teamANewElos,
        teamANewWins,
        teamANewTotal,
        (id: number, elo: number, win: number, total: number) => ({
          id,
          elo,
          win,
          total,
        }),
      );

      const updatedBPlayers: Partial<Player>[] = zipWith(
        match.team_b_players,
        teamBNewElos,
        teamBNewWins,
        teamBNewTotal,
        (id: number, elo: number, win: number, total: number) => ({
          id,
          elo,
          win,
          total,
        }),
      );

      await supabase
        .from('match')
        .update({ result, team_a_new_elos: teamANewElos, team_b_new_elos: teamBNewElos })
        .eq('id', match.id);

      await supabase.from('player').upsert([...updatedAPlayers, ...updatedBPlayers]);

      refresh();
    },
    [players, refresh],
  );

  const suggestTeams = useCallback(() => {
    if (!players) {
      return;
    }

    const available = players.filter((p) => availableIds.includes(p.id));
    const total = Math.min(available.length, 10);

    if (total < 2) {
      setTeamA([]);
      setTeamB([]);
      return;
    }
    const candidates = sampleSize(available, total);
    const totalElo = sumBy(available, (player) => player.elo);
    const TOLERANCE = 20;
    const sizeA = Math.ceil(total / 2);
    const target = (totalElo * sizeA) / total;

    let bestDiff = Infinity;
    let bestChoiceIndexes: number[] = [];
    const withinTolerance: number[][] = [];

    // DFS to choose exactly `sizeA` players whose Elo sum is closest to `target`
    const dfs = (index: number, chosenIdxs: number[], chosenSum: number) => {
      if (chosenIdxs.length === sizeA) {
        const diff = Math.abs(chosenSum - target);

        if (diff <= TOLERANCE) {
          withinTolerance.push([...chosenIdxs]);
        }

        if (diff < bestDiff) {
          bestDiff = diff;
          bestChoiceIndexes = [...chosenIdxs];
        }
        return;
      }

      if (index >= candidates.length) return;

      // Prune: if not enough remaining players to fill Team A
      const remainingNeeded = sizeA - chosenIdxs.length;
      const remainingAvailable = candidates.length - index;
      if (remainingNeeded > remainingAvailable) return;

      // Option 1: take current index
      dfs(index + 1, [...chosenIdxs, index], chosenSum + candidates[index].elo);

      // Option 2: skip current index
      dfs(index + 1, chosenIdxs, chosenSum);
    };

    dfs(0, [], 0);

    const pick = withinTolerance.length
      ? withinTolerance[Math.floor(Math.random() * withinTolerance.length)]
      : bestChoiceIndexes;

    const chosenSet = new Set(pick);

    const teamAPlayers = candidates.filter((_, i) => chosenSet.has(i));
    const teamBPlayers = candidates.filter((_, i) => !chosenSet.has(i));

    setTeamA(teamAPlayers);
    setTeamB(teamBPlayers);
  }, [availableIds, players]);

  useEffect(() => {
    suggestTeams();
  }, [suggestTeams]);

  useEffect(() => {
    refresh();
  }, [refresh]);

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
        </header>

        {/* Leaderboard */}
        <Section title="Leaderboard">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead
                className={`
                  bg-gray-100
                  dark:bg-gray-800
                `}
              >
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">#</th>
                  <th className="px-3 py-2 text-left font-semibold">Player</th>
                  <th className="px-3 py-2 text-right font-semibold">Elo</th>
                  <th className="px-3 py-2 text-right font-semibold">Wins</th>
                  <th className="px-3 py-2 text-right font-semibold">Win Rate</th>
                </tr>
              </thead>
              <tbody>
                {players?.map((row, i) => (
                  <tr
                    key={row.id}
                    className={
                      i % 2
                        ? `
                          bg-white
                          dark:bg-gray-900
                        `
                        : `
                          bg-gray-50
                          dark:bg-gray-950
                        `
                    }
                  >
                    <td className="px-3 py-2">{i + 1}</td>
                    <td className="px-3 py-2">{row.name}</td>
                    <td className="px-3 py-2 text-right">{row.elo}</td>
                    <td className="px-3 py-2 text-right">{row.win}</td>
                    <td className="px-3 py-2 text-right">{((row.win / row.total) * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Input form */}
        <div
          className={`
            mt-6 grid gap-6
            md:mt-10 md:grid-cols-2
          `}
        >
          <Section title="Available Players" actions={<Pill>{availableIds.length} total</Pill>}>
            <div
              className={`
                columns-2 gap-2
                [column-fill:_balance]
              `}
            >
              {players &&
                orderBy(players, ['name'], ['asc'])?.map((player) => (
                  <label
                    key={player.id}
                    className={`
                      mb-2 flex cursor-pointer break-inside-avoid items-center gap-2 rounded-xl border border-gray-200
                      bg-white p-2 text-sm
                      dark:border-gray-700 dark:bg-gray-800
                    `}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={availableIds.includes(player.id)}
                      onChange={() => toggleAvailable(player.id)}
                    />
                    <span className="flex-1">{player.name}</span>
                    <span
                      className={`
                        text-xs text-gray-500
                        dark:text-gray-400
                      `}
                    >
                      Elo {player.elo}
                    </span>
                  </label>
                ))}
            </div>
          </Section>
          <Section title="Add Match">
            <form className="space-y-4">
              <div
                className={`
                  grid grid-cols-1 gap-4
                  md:grid-cols-2
                `}
              >
                {/* Team A */}
                <div
                  className={`
                    rounded-xl border border-gray-200 p-3
                    dark:border-gray-700
                  `}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-semibold">Team A</h3>
                    {teamA.length > 0 && <Pill>{`Avg ${Math.round(meanBy(teamA, (player) => player.elo))}`}</Pill>}
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {teamA.map((player) => (
                      <div
                        className={`
                          rounded-xl border border-gray-200 bg-white p-2 text-sm
                          focus:ring-2 focus:ring-indigo-500 focus:outline-none
                          dark:border-gray-700 dark:bg-gray-800
                        `}
                        key={player.id}
                      >
                        {player.name}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Team B */}
                <div
                  className={`
                    rounded-xl border border-gray-200 p-3
                    dark:border-gray-700
                  `}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-semibold">Team B</h3>
                    {teamB.length > 0 && <Pill>{`Avg ${Math.round(meanBy(teamB, (player) => player.elo))}`}</Pill>}
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {teamB.map((player) => (
                      <div
                        className={`
                          rounded-xl border border-gray-200 bg-white p-2 text-sm
                          focus:ring-2 focus:ring-indigo-500 focus:outline-none
                          dark:border-gray-700 dark:bg-gray-800
                        `}
                        key={player.id}
                      >
                        {player.name}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex place-content-end items-center gap-3">
                <button
                  type="button"
                  className={`
                    cursor-pointer rounded-xl bg-indigo-600 px-4 py-2 text-white
                    hover:bg-indigo-700
                    disabled:cursor-not-allowed disabled:opacity-50
                  `}
                  onClick={() => {
                    createMatch().then(() => {
                      refresh();
                    });
                  }}
                  disabled={disabledStart}
                >
                  Start Match
                </button>
                <button
                  type="button"
                  onClick={suggestTeams}
                  className={`
                    cursor-pointer rounded-xl border border-gray-200 px-4 py-2
                    hover:bg-gray-50
                    disabled:cursor-not-allowed disabled:opacity-50
                    dark:border-gray-700 dark:hover:bg-gray-800
                  `}
                  disabled={disabledSuggest}
                >
                  Suggest Teams
                </button>
              </div>
            </form>
          </Section>

          {/* History */}
          {matches && (
            <Section title="Match History" actions={<Pill>{matchCount} total</Pill>}>
              {matches.length === 0 ? (
                <div
                  className={`
                    text-sm text-gray-600
                    dark:text-gray-300
                  `}
                >
                  No matches yet. Add your first one!
                </div>
              ) : (
                <ul className="space-y-3">
                  {matches.map((match) => (
                    <li
                      key={match.id}
                      className={`
                        rounded-xl border border-gray-200 p-3
                        dark:border-gray-700
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div
                          className={`
                            text-sm text-gray-600
                            dark:text-gray-300
                          `}
                        >
                          {new Date(match.created_at).toLocaleString()}
                        </div>
                        <div className="flex items-center gap-2">
                          <Pill>{match.result ? `Winner: Team ${match.result}` : 'In game'}</Pill>
                        </div>
                      </div>
                      <div
                        className={`
                          mt-2 grid grid-cols-1 gap-4 text-sm
                          md:grid-cols-2
                        `}
                      >
                        <div>
                          <div className="mb-1 font-medium">Team A</div>
                          <ul className="mb-2 list-inside list-disc space-y-0.5">
                            {match.team_a_players.map((id) => (
                              <li key={id}>{find(players, { id })?.name}</li>
                            ))}
                          </ul>
                          {!match.result && (
                            <button
                              type="button"
                              className={`
                                cursor-pointer rounded-xl bg-cyan-600 px-4 py-2 text-white
                                hover:bg-cyan-700
                                disabled:opacity-50
                              `}
                              onClick={() => {
                                endMatch(match, 'A');
                              }}
                            >
                              Team A wins
                            </button>
                          )}
                        </div>
                        <div>
                          <div className="mb-1 font-medium">Team B</div>
                          <ul className="mb-2 list-inside list-disc space-y-0.5">
                            {match.team_b_players.map((id) => (
                              <li key={id}>{find(players, { id })?.name}</li>
                            ))}
                          </ul>
                          {!match.result && (
                            <button
                              type="button"
                              className={`
                                cursor-pointer rounded-xl bg-cyan-600 px-4 py-2 text-white
                                hover:bg-cyan-700
                                disabled:opacity-50
                              `}
                              onClick={() => {
                                endMatch(match, 'B');
                              }}
                            >
                              Team B wins
                            </button>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}
