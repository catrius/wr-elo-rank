import { mean, zipWith } from 'es-toolkit';
import { find } from 'es-toolkit/compat';
import type { Player, Match } from '@/types/common.ts';

// Dynamic K-factor: new players adjust faster, established players are more stable
export function getKFactor(totalGames: number): number {
  if (totalGames < 10) return 25;
  if (totalGames <= 30) return 20;
  return 15;
}

function getExpected(playerElo: number, opponentElo: number): number {
  return 1 / (1 + 10 ** ((opponentElo - playerElo) / 400));
}

export function calculateMatchResult(match: Match, result: 'A' | 'B', players: Player[]) {
  const meanTeamAElo = mean(match.team_a_elos);
  const meanTeamBElo = mean(match.team_b_elos);

  const teamANewElos = match.team_a_elos.map((playerAElo, i) => {
    const player = find(players, { id: match.team_a_players[i] });
    const k = getKFactor(player?.total ?? 0);
    const actual = result === 'A' ? 1 : 0;
    const expected = getExpected(playerAElo, meanTeamBElo);
    return Math.round(playerAElo + k * (actual - expected));
  });

  const teamBNewElos = match.team_b_elos.map((playerBElo, i) => {
    const player = find(players, { id: match.team_b_players[i] });
    const k = getKFactor(player?.total ?? 0);
    const actual = result === 'B' ? 1 : 0;
    const expected = getExpected(playerBElo, meanTeamAElo);
    return Math.round(playerBElo + k * (actual - expected));
  });

  const updatedAPlayers: Partial<Player>[] = zipWith(
    match.team_a_players,
    teamANewElos,
    match.team_a_players.map((id) => {
      const player = find(players, { id });
      if (!player) return 0;
      return result === 'A' ? player.win + 1 : player.win;
    }),
    match.team_a_players.map((id) => {
      const player = find(players, { id });
      if (!player) return 1;
      return player.total + 1;
    }),
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
    match.team_b_players.map((id) => {
      const player = find(players, { id });
      if (!player) return 0;
      return result === 'B' ? player.win + 1 : player.win;
    }),
    match.team_b_players.map((id) => {
      const player = find(players, { id });
      if (!player) return 1;
      return player.total + 1;
    }),
    (id: number, elo: number, win: number, total: number) => ({
      id,
      elo,
      win,
      total,
    }),
  );

  return { teamANewElos, teamBNewElos, updatedAPlayers, updatedBPlayers };
}

export function calculateRevertedPlayers(match: Match, players: Player[]) {
  const updatedAPlayers: Partial<Player>[] = zipWith(
    match.team_a_players,
    match.team_a_elos,
    match.team_a_new_elos!,
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
    match.team_b_new_elos!,
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

  return { updatedAPlayers, updatedBPlayers };
}
