import type { Database } from '@/types/database.ts';

export type Player = Database['public']['Tables']['player']['Row'];
export type Match = Database['public']['Tables']['match']['Row'];
