import { useEffect, useMemo, useState, useCallback, useLayoutEffect } from 'react';
import EloRank from 'elo-rank';
import { sampleSize, mean, zipWith, sumBy, meanBy } from 'es-toolkit';
import supabase from '@/lib/supabase.ts';
import useSupaQuery from '@/hooks/useSupaQuery.ts';
import type { Player, Match } from '@/types/common.ts';
import { find, some } from 'es-toolkit/compat';
import Leaderboard from '@/components/Leaderboard.tsx';
import AvailablePlayers from '@/components/AvailablePlayers.tsx';
import NewMatch from '@/components/NewMatch.tsx';
import MatchHistory from '@/components/MatchHistory.tsx';
import PlayerSpotlight from '@/components/PlayerSpotlight.tsx';

const eloRank = new EloRank(15);

export default function App() {
  const getPlayersCallback = useCallback(
    async () => supabase.from('player').select().order('elo', { ascending: false }),
    [],
  );
  const [getPlayers, { data: playerData }] = useSupaQuery(getPlayersCallback);
  const players = playerData as Player[] | null;

  const getMatchesCallback = useCallback(
    async () => supabase.from('match').select().order('created_at', { ascending: false }).limit(10),
    [],
  );
  const [getMatches, { data: matchesData }] = useSupaQuery(getMatchesCallback);
  const matches = matchesData as Match[] | null;

  const twoWeeksAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString();
  }, []);

  const getSpotlightMatchesCallback = useCallback(
    async () =>
      supabase.from('match').select().order('created_at', { ascending: false }).gte('created_at', twoWeeksAgo),
    [twoWeeksAgo],
  );
  const [getSpotlightMatches, { data: spotlightMatchesData }] = useSupaQuery(getSpotlightMatchesCallback);
  const spotlightMatches = spotlightMatchesData as Match[] | null;

  const getMatchCountCallback = useCallback(
    async () => supabase.from('match').select('*', { count: 'exact', head: true }),
    [],
  );
  const [getMatchCount, { count: matchCount }] = useSupaQuery(getMatchCountCallback);

  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');

  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

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
    if (!players) return [];
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
    getSpotlightMatches();
  }, [getMatchCount, getMatches, getPlayers, getSpotlightMatches]);

  const cancelMatch = useCallback(
    async (match: Match) => {
      await supabase.from('match').update({ result: 'Cancelled' }).eq('id', match.id);
      refresh();
    },
    [refresh],
  );

  const lastMatch = useCallback(
    (match?: Match) => {
      const lastMatchData = match || matches?.[0];
      const lastTeamA = players?.filter((player) => lastMatchData?.team_a_players.includes(player.id));
      const lastTeamB = players?.filter((player) => lastMatchData?.team_b_players.includes(player.id));

      setAvailableIds([...(lastMatchData?.team_a_players || []), ...(lastMatchData?.team_b_players || [])]);

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
        if (!player) return 0;
        return result === 'A' ? player.win + 1 : player.win;
      }, []);

      const teamBNewWins = match.team_b_players.map((id) => {
        const player = find(players, { id });
        if (!player) return 0;
        return result === 'B' ? player.win + 1 : player.win;
      }, []);

      const teamANewTotal = match.team_a_players.map((id) => {
        const player = find(players, { id });
        if (!player) return 1;
        return player.total + 1;
      }, []);

      const teamBNewTotal = match.team_b_players.map((id) => {
        const player = find(players, { id });
        if (!player) return 1;
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

  const revertMatch = useCallback(
    async (match: Match) => {
      if (!(match.result === 'A' || match.result === 'B') || !match.team_a_new_elos || !match.team_b_new_elos) {
        return;
      }

      // eslint-disable-next-line no-alert
      if (!window.confirm('Are you sure you want to revert this match?')) {
        return;
      }

      const updatedAPlayers: Partial<Player>[] = zipWith(
        match.team_a_players,
        match.team_a_elos,
        match.team_a_new_elos,
        (id: number, elo: number, newElo: number) => {
          const player = find(players, { id });
          if (!player) return { id };

          const revertedElo = newElo - elo;
          const won = match.result === 'A';

          return {
            id,
            total: player.total - 1,
            elo: player.elo - revertedElo,
            win: won ? player.win - 1 : player.win,
          };
        },
      );

      const updatedBPlayers: Partial<Player>[] = zipWith(
        match.team_b_players,
        match.team_b_elos,
        match.team_b_new_elos,
        (id: number, elo: number, newElo: number) => {
          const player = find(players, { id });
          if (!player) return { id };

          const revertedElo = newElo - elo;
          const won = match.result === 'B';

          return {
            id,
            total: player.total - 1,
            elo: player.elo - revertedElo,
            win: won ? player.win - 1 : player.win,
          };
        },
      );

      await supabase.from('match').update({ result: 'Reverted' }).eq('id', match.id);
      await supabase.from('player').upsert([...updatedAPlayers, ...updatedBPlayers]);

      refresh();
    },
    [players, refresh],
  );

  const suggestTeams = useCallback(
    (tolerance = 20) => {
      if (!players) return;

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
      const i3 = candidates.findIndex((p) => p.id === 3); // Khoai
      const i7 = candidates.findIndex((p) => p.id === 7); // Mam
      const haveKhoaiMamPair = i3 !== -1 && i7 !== -1;

      let bestDiff = Infinity;
      let bestChoiceIndexes: number[] = [];
      const withinTolerance: number[][] = [];

      // DFS to choose exactly `sizeA` players whose Elo sum is closest to `target`
      const dfs = (index: number, chosenIdxs: number[], chosenSum: number) => {
        if (chosenIdxs.length === sizeA) {
          if (haveKhoaiMamPair) {
            const aHas3 = chosenIdxs.includes(i3);
            const aHas7 = chosenIdxs.includes(i7);
            if (aHas3 !== aHas7) return; // one is in A and the other is in B -> invalid split
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
          <button
            type="button"
            onClick={() => setDark((d) => !d)}
            className={`
              cursor-pointer rounded-lg border border-gray-200 bg-white p-1.5 text-base shadow-sm transition-colors
              hover:bg-gray-100
              dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700
            `}
            aria-label="Toggle dark mode"
          >
            {dark ? '\u2600\uFE0F' : '\uD83C\uDF19'}
          </button>
        </header>

        {/* Leaderboard */}
        <Leaderboard players={players} />

        {/* Input form */}
        <div
          className={`
            mt-6 grid gap-6
            md:mt-10 md:grid-cols-2
          `}
        >
          <AvailablePlayers players={players} availableIds={availableIds} onToggle={toggleAvailable} />

          <NewMatch
            teamA={teamA}
            teamB={teamB}
            averageTeamAElos={averageTeamAElos}
            averageTeamBElos={averageTeamBElos}
            eloDiff={eloDiff}
            onDragStart={handleDragStart}
            onDragOver={handleDragOverPanel}
            onDropToA={handleDropTo('A')}
            onDropToB={handleDropTo('B')}
            onShuffle={() => suggestTeams(20)}
            onBest={() => suggestTeams(0)}
            onRematch={() => lastMatch()}
            onStart={() => createMatch().then(() => refresh())}
            disabledSuggest={disabledSuggest}
            disabledStart={disabledStart}
          />

          {/* Spotlight */}
          {spotlightMatches && <PlayerSpotlight matches={spotlightMatches} players={players} />}

          {/* History */}
          {matches && (
            <MatchHistory
              matches={matches}
              players={players}
              matchCount={matchCount}
              onEndMatch={endMatch}
              onRevertMatch={revertMatch}
              onCancelMatch={cancelMatch}
              onRematch={lastMatch}
            />
          )}
        </div>
      </div>
    </div>
  );
}
