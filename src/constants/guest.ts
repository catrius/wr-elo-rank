import type { Player } from '@/types/common.ts';

// Guest player constant - always Elo 1500, excluded from leaderboard
export const GUEST_PLAYER_ID = -1;
export const GUEST_PLAYER_NAME = 'Guest';
export const GUEST_PLAYER_ELO = 1500;

export const GUEST_PLAYER: Player = {
  id: GUEST_PLAYER_ID,
  name: GUEST_PLAYER_NAME,
  elo: GUEST_PLAYER_ELO,
  win: 0,
  total: 0,
  avatar: null,
  email: null,
  ingame: null,
  hidden: true,
  is_decaying: false,
  isAdmin: false,
  created_at: new Date().toISOString(),
};

export function isGuestPlayer(playerId: number): boolean {
  return playerId === GUEST_PLAYER_ID;
}
