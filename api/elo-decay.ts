import { createClient } from '@supabase/supabase-js';
import type { IncomingMessage, ServerResponse } from 'http';

type Player = { id: number; name: string; elo: number; is_decaying: boolean };
type Match = { created_at: string; result: string | null; team_a_players: number[]; team_b_players: number[] };

/** A player decays once this many whole days have passed since their last completed match. */
const DECAY_AFTER_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

function findDecayPlayers(players: Player[], matches: Match[]) {
  const nowMs = Date.now();

  const lastPlayedMs = new Map<number, number>();
  matches
    .filter((m) => m.result === 'A' || m.result === 'B')
    .forEach((m) => {
      const ts = new Date(m.created_at).getTime();
      [...m.team_a_players, ...m.team_b_players].forEach((pid) => {
        if (ts > (lastPlayedMs.get(pid) ?? 0)) lastPlayedMs.set(pid, ts);
      });
    });

  return players.flatMap((player) => {
    const lastTs = lastPlayedMs.get(player.id);
    if (!lastTs) return [];
    const daysInactive = Math.floor((nowMs - lastTs) / DAY_MS);
    if (daysInactive < DECAY_AFTER_DAYS) return [];
    return [{ player, daysInactive }];
  });
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') {
    res.writeHead(405);
    res.end();
    return;
  }

  const auth = (req.headers['authorization'] as string | undefined) ?? '';
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized' }));
    return;
  }

  const supabase = createClient(
    process.env.VITE_PUBLIC__SUPABASE_URL!,
    process.env.VITE_PUBLIC__SUPABASE_SERVICE_ROLE_KEY!,
  );

  const [{ data: players, error: playersErr }, { data: matches, error: matchesErr }] = await Promise.all([
    supabase.from('player').select('id, name, elo, is_decaying').eq('hidden', false),
    supabase.from('match').select('created_at, result, team_a_players, team_b_players').in('result', ['A', 'B']),
  ]);

  if (playersErr || matchesErr) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: playersErr?.message ?? matchesErr?.message }));
    return;
  }

  const decaying = findDecayPlayers((players ?? []) as Player[], (matches ?? []) as Match[]);
  const decayingIds = new Set(decaying.map((d) => d.player.id));

  const recovering = (players ?? []).filter((p) => (p as Player).is_decaying && !decayingIds.has((p as Player).id));

  await Promise.all([
    ...decaying.map(({ player }) =>
      supabase
        .from('player')
        .update({ elo: player.elo - 10, is_decaying: true })
        .eq('id', player.id),
    ),
    ...recovering.map((p) =>
      supabase.from('player').update({ is_decaying: false }).eq('id', (p as Player).id),
    ),
  ]);

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(
    JSON.stringify({
      decayed: decaying.map((d) => ({ id: d.player.id, name: d.player.name, daysInactive: d.daysInactive })),
      recovered: recovering.map((p) => ({ id: (p as Player).id, name: (p as Player).name })),
    }),
  );
}
