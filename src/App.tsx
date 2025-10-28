import { useEffect, useMemo, useState, useCallback } from 'react';
import EloRank from 'elo-rank';
import { sampleSize, mean, zipWith, orderBy, meanBy, sumBy, zip } from 'es-toolkit';
import supabase from '@/lib/supabase.ts';
import useSupaQuery from '@/hooks/useSupaQuery.ts';
import type { Player, Match } from '@/types/common.ts';
import { find, some, isNumber, isNaN } from 'es-toolkit/compat';
import Pill from '@/components/Pill';
import Section from '@/components/Section.tsx';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

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
  const [dragging, setDragging] = useState<{ player: Player; from: 'A' | 'B' } | null>(null);
  const handleDragStart = useCallback(
    (player: Player, from: 'A' | 'B') => (e: any) => {
      // Set some data to satisfy HTML5 DnD requirements
      try {
        e.dataTransfer?.setData('text/plain', String(player.id));
      } catch {
        /* empty */
      }
      setDragging({ player, from });
    },
    [],
  );

  const handleDragOverPanel = useCallback((e: any) => {
    // Necessary to allow dropping
    e.preventDefault();
  }, []);

  const handleDropTo = useCallback(
    (to: 'A' | 'B') => (e: any) => {
      e.preventDefault();
      if (!dragging) return;
      if (dragging.from === to) return; // no-op if dropped back to same team

      if (to === 'A') {
        setTeamB((prev) => prev.filter((p) => p.id !== dragging.player.id));
        setTeamA((prev) => (prev.some((p) => p.id === dragging.player.id) ? prev : [...prev, dragging.player]));
      } else {
        setTeamA((prev) => prev.filter((p) => p.id !== dragging.player.id));
        setTeamB((prev) => (prev.some((p) => p.id === dragging.player.id) ? prev : [...prev, dragging.player]));
      }

      setDragging(null);
    },
    [dragging],
  );

  const averageTeamAElos = useMemo(() => Math.round(meanBy(teamA, (player) => player.elo)), [teamA]);
  const averageTeamBElos = useMemo(() => Math.round(meanBy(teamB, (player) => player.elo)), [teamB]);
  const eloDiff = useMemo(() => Math.abs(averageTeamAElos - averageTeamBElos), [averageTeamAElos, averageTeamBElos]);

  const available = useMemo(() => {
    if (!players) {
      return [];
    }
    return players.filter((p) => availableIds.includes(p.id));
  }, [availableIds, players]);

  const disabledStart = useMemo(
    () =>
      available.length % 2 === 1 ||
      some(matches, (match) => !match.result) ||
      teamA.length === 0 ||
      teamB.length === 0 ||
      teamA.length !== teamB.length,
    [available.length, matches, teamA.length, teamB.length],
  );

  const disabledSuggest = useMemo(() => availableIds.length < 2, [availableIds.length]);

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

  const cancelMatch = useCallback(
    async (match: Match) => {
      await supabase.from('match').update({ result: 'Cancel' }).eq('id', match.id);
      refresh();
    },
    [refresh],
  );

  const lastMatch = useCallback(
    (match?: Match) => {
      const lastMatchData = match || matches?.[0];
      const lastTeamA = players?.filter((player) => lastMatchData?.team_a_players.includes(player.id));
      const lastTeamB = players?.filter((player) => lastMatchData?.team_b_players.includes(player.id));

      setTeamA(lastTeamA || []);
      setTeamB(lastTeamB || []);
    },
    [matches, players],
  );

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

  const suggestTeams = useCallback(
    (tolerance = 20) => {
      if (!players) {
        return;
      }

      const total = Math.min(available.length, 10);

      if (total < 2) {
        setTeamA([]);
        setTeamB([]);
        return;
      }

      const candidates = sampleSize(available, total);
      const totalElo = sumBy(available, (player) => player.elo);
      const sizeA = Math.ceil(total / 2);
      const target = (totalElo * sizeA) / total;

      // locate the indices of the special players inside the current candidates pool
      const i3 = candidates.findIndex((p) => p.id === 3);
      const i7 = candidates.findIndex((p) => p.id === 7);
      const havePair = i3 !== -1 && i7 !== -1;

      let bestDiff = Infinity;
      let bestChoiceIndexes: number[] = [];
      const withinTolerance: number[][] = [];

      // DFS to choose exactly `sizeA` players whose Elo sum is closest to `target`
      const dfs = (index: number, chosenIdxs: number[], chosenSum: number) => {
        if (chosenIdxs.length === sizeA) {
          if (havePair) {
            const aHas3 = chosenIdxs.includes(i3);
            const aHas7 = chosenIdxs.includes(i7);
            if (aHas3 !== aHas7) {
              // one is in A and the other is in B -> invalid split
              return;
            }
          }

          const diff = Math.abs(chosenSum - target);

          if (diff <= tolerance) {
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
    },
    [available, players],
  );

  useEffect(() => {
    suggestTeams(0);
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
        <Section title="Elo Ratings">
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
                  <th className="px-3 py-2 text-right font-semibold">Losses</th>
                  <th className="px-3 py-2 text-right font-semibold">Total</th>
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
                    <td className="px-3 py-2 text-right">{row.total - row.win}</td>
                    <td className="px-3 py-2 text-right">{row.total}</td>
                    <td className="px-3 py-2 text-right">
                      {row.total ? ((row.win / row.total) * 100).toFixed(1) : 0}%
                    </td>
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
                columns-1 gap-2
                [column-fill:_balance]
                sm:columns-2
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
          <Section
            title="New Match"
            actions={isNumber(eloDiff) && !isNaN(eloDiff) ? <Pill>{`Diff ${eloDiff}`}</Pill> : null}
          >
            <div className="mb-4 text-sm">
              To change a player&#39;s team, tap and hold on his name then drop him on the opposite team.
            </div>
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
                  onDragOver={handleDragOverPanel}
                  onDrop={handleDropTo('A')}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-semibold">Team A</h3>
                    {teamA.length > 0 && <Pill>{`Avg ${averageTeamAElos}`}</Pill>}
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {teamA.map((player) => (
                      <div
                        className={`
                          cursor-grab rounded-xl border border-gray-200 bg-white p-2 text-sm
                          focus:ring-2 focus:ring-indigo-500 focus:outline-none
                          active:cursor-grabbing
                          dark:border-gray-700 dark:bg-gray-800
                        `}
                        key={player.id}
                        draggable
                        onDragStart={handleDragStart(player, 'A')}
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
                  onDragOver={handleDragOverPanel}
                  onDrop={handleDropTo('B')}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-semibold">Team B</h3>
                    {teamB.length > 0 && <Pill>{`Avg ${averageTeamBElos}`}</Pill>}
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {teamB.map((player) => (
                      <div
                        className={`
                          cursor-grab rounded-xl border border-gray-200 bg-white p-2 text-sm
                          focus:ring-2 focus:ring-indigo-500 focus:outline-none
                          dark:border-gray-700 dark:bg-gray-800
                        `}
                        key={player.id}
                        draggable
                        onDragStart={handleDragStart(player, 'B')}
                      >
                        {player.name}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col place-content-end gap-3">
                <div className="flex place-content-end gap-3">
                  <button
                    type="button"
                    onClick={() => suggestTeams(20)}
                    className={`
                      cursor-pointer rounded-xl border border-gray-200 px-4 py-2
                      hover:bg-gray-50
                      disabled:cursor-not-allowed disabled:opacity-50
                      dark:border-gray-700 dark:hover:bg-gray-800
                    `}
                    disabled={disabledSuggest}
                  >
                    Shuffle
                  </button>
                  <button
                    type="button"
                    onClick={() => suggestTeams(0)}
                    className={`
                      cursor-pointer rounded-xl border border-gray-200 px-4 py-2
                      hover:bg-gray-50
                      disabled:cursor-not-allowed disabled:opacity-50
                      dark:border-gray-700 dark:hover:bg-gray-800
                    `}
                    disabled={disabledSuggest}
                  >
                    Best
                  </button>
                  <button
                    type="button"
                    onClick={() => lastMatch()}
                    className={`
                      cursor-pointer rounded-xl border border-gray-200 px-4 py-2
                      hover:bg-gray-50
                      disabled:cursor-not-allowed disabled:opacity-50
                      dark:border-gray-700 dark:hover:bg-gray-800
                    `}
                  >
                    Rematch
                  </button>
                </div>
                <div className="flex place-content-end gap-3">
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
                    Start
                  </button>
                </div>
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
                  No matches yet. Start our first one!
                </div>
              ) : (
                <ul className="space-y-3">
                  {matches.map((match) => (
                    <li
                      key={match.id}
                      className={`
                        rounded-xl border border-gray-200 p-3
                        dark:border-gray-700
                        ${match.result === 'Cancel' && 'opacity-50'}
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div
                          className={`
                            text-sm text-gray-600
                            dark:text-gray-300
                          `}
                        >
                          {dayjs.utc(match.created_at).local().format('DD/MM/YYYY HH:mm')}
                        </div>
                        <div className="flex items-center gap-2">
                          <Pill>
                            {match.result
                              ? match.result === 'Cancel'
                                ? 'Cancelled'
                                : `${match.result} won`
                              : 'In game'}
                          </Pill>
                          {!match.result && (
                            <button
                              type="button"
                              className={`
                                cursor-pointer rounded-full bg-red-600 px-2 py-1 text-xs text-white
                                hover:bg-red-700
                                disabled:opacity-50
                              `}
                              onClick={() => {
                                cancelMatch(match);
                              }}
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
                              onClick={() => {
                                lastMatch(match);
                              }}
                            >
                              Rematch
                            </button>
                          )}
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
                            {zip(match.team_a_players, match.team_a_new_elos || [], match.team_a_elos).map(
                              ([id, newElo, elo]) => {
                                const diff = newElo - elo;
                                const diffStr = diff >= 0 ? `+${diff}` : diff;
                                return (
                                  <li key={id}>
                                    <span className="mr-1">{find(players, { id })?.name}</span>
                                    {newElo && elo && (
                                      <span className={diff >= 0 ? 'text-green-700' : 'text-red-700'}>{diffStr}</span>
                                    )}
                                  </li>
                                );
                              },
                            )}
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
                            {zip(match.team_b_players, match.team_b_new_elos || [], match.team_b_elos).map(
                              ([id, newElo, elo]) => {
                                const diff = newElo - elo;
                                const diffStr = diff >= 0 ? `+${diff}` : diff;
                                return (
                                  <li key={id}>
                                    <span className="mr-1">{find(players, { id })?.name}</span>
                                    {newElo && elo && (
                                      <span className={diff >= 0 ? 'text-green-700' : 'text-red-700'}>{diffStr}</span>
                                    )}
                                  </li>
                                );
                              },
                            )}
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
