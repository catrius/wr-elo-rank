import { createClient } from '@supabase/supabase-js';
import type { IncomingMessage, ServerResponse } from 'http';
import type { Database } from '../src/types/database.ts';
import { findDecayPlayers } from '../src/utils/eloDecay.ts';

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

  const supabase = createClient<Database>(
    process.env.VITE_PUBLIC__SUPABASE_URL!,
    process.env.VITE_PUBLIC__SUPABASE_SERVICE_ROLE_KEY!,
  );

  const [{ data: players, error: playersErr }, { data: matches, error: matchesErr }] = await Promise.all([
    supabase.from('player').select('*').eq('hidden', false),
    supabase.from('match').select('*').in('result', ['A', 'B']),
  ]);

  if (playersErr || matchesErr) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: playersErr?.message ?? matchesErr?.message }));
    return;
  }

  const decaying = findDecayPlayers(players ?? [], matches ?? []);
  const decayingIds = new Set(decaying.map((d) => d.player.id));

  // Players coming back from inactivity — clear their flag
  const recovering = (players ?? []).filter((p) => p.is_decaying && !decayingIds.has(p.id));

  await Promise.all([
    ...decaying.map(({ player }) =>
      supabase
        .from('player')
        .update({ elo: player.elo - 10, is_decaying: true })
        .eq('id', player.id),
    ),
    ...recovering.map((p) =>
      supabase.from('player').update({ is_decaying: false }).eq('id', p.id),
    ),
  ]);

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(
    JSON.stringify({
      decayed: decaying.map((d) => ({ id: d.player.id, name: d.player.name, weeksInactive: d.weeksInactive })),
      recovered: recovering.map((p) => ({ id: p.id, name: p.name })),
    }),
  );
}
