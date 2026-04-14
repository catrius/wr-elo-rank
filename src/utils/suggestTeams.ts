import { sampleSize, sumBy } from 'es-toolkit';
import type { Player, Pairing } from '@/types/common.ts';

export function findTeams(
  available: Player[],
  pairings: Pairing[] | null,
  tolerance: number,
): { teamA: Player[]; teamB: Player[] } {
  const total = Math.min(available.length, 10);

  if (total < 2) {
    return { teamA: [], teamB: [] };
  }

  const candidates = sampleSize(available, total);
  const totalElo = sumBy(available, (player) => player.elo);
  const sizeA = Math.ceil(total / 2);
  const target = (totalElo * sizeA) / total;

  // Build active pairing constraints from candidates
  const activePairs: [number, number][] = (pairings ?? [])
    .filter((pairing) => pairing.player1 && pairing.player2)
    .map((pairing) => {
      const idx1 = candidates.findIndex((p) => p.id === pairing.player1);
      const idx2 = candidates.findIndex((p) => p.id === pairing.player2);
      return [idx1, idx2] as [number, number];
    })
    .filter(([idx1, idx2]) => idx1 !== -1 && idx2 !== -1);

  let bestDiff = Infinity;
  let bestChoiceIndexes: number[] = [];
  const withinTolerance: number[][] = [];

  // DFS to choose exactly `sizeA` players whose Elo sum is closest to `target`
  const dfs = (index: number, chosenIdxs: number[], chosenSum: number) => {
    if (chosenIdxs.length === sizeA) {
      // Enforce pairing constraints: paired players must be on the same team
      const pairViolation = activePairs.some(([idx1, idx2]) => {
        const aHas1 = chosenIdxs.includes(idx1);
        const aHas2 = chosenIdxs.includes(idx2);
        return aHas1 !== aHas2; // split pair -> invalid
      });
      if (pairViolation) return;

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

  const teamA = candidates.filter((_, i) => chosenSet.has(i));
  const teamB = candidates.filter((_, i) => !chosenSet.has(i));

  return { teamA, teamB };
}
