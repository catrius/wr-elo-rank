import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { Database } from '../src/types/database';

// Load environment variables from .env.development
const envPath = resolve(process.cwd(), '.env.development');
const envFile = readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};
envFile.split('\n').forEach((line) => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = envVars.VITE_PUBLIC__SUPABASE_URL;
const supabaseKey = envVars.VITE_PUBLIC__SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.development');
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

async function closeSeason() {
  console.log('Closing current season...\n');

  // 1. Fetch current season (end = null)
  const { data: seasons, error: seasonError } = await supabase
    .from('season')
    .select()
    .is('end', null)
    .order('created_at', { ascending: false });

  if (seasonError) {
    console.error('Error fetching current season:', seasonError);
    process.exit(1);
  }

  if (!seasons || seasons.length === 0) {
    console.log('No active season found (all seasons already closed).');
    process.exit(0);
  }

  const currentSeason = seasons[0];
  console.log(`Found active season: ${currentSeason.name} (ID: ${currentSeason.id})`);

  // 2. Fetch all current player data (excluding hidden guest player)
  const { data: players, error: playersError } = await supabase
    .from('player')
    .select('id, name, elo, win, total, avatar, ingame')
    .eq('hidden', false)
    .order('elo', { ascending: false });

  if (playersError) {
    console.error('Error fetching players:', playersError);
    process.exit(1);
  }

  console.log(`Snapshotting ${players?.length ?? 0} players\n`);

  // 3. Update season with end timestamp and player snapshot
  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('season')
    .update({
      end: now,
      players: players as any, // Store full player snapshot
    })
    .eq('id', currentSeason.id);

  if (updateError) {
    console.error('Error closing season:', updateError);
    process.exit(1);
  }

  console.log(`✅ Season closed successfully!`);
  console.log(`   Season: ${currentSeason.name}`);
  console.log(`   End time: ${now}`);
  console.log(`   Players saved: ${players?.length ?? 0}`);

  // Verify the update
  const { data: verifyData, error: verifyError } = await supabase
    .from('season')
    .select()
    .eq('id', currentSeason.id)
    .single();

  if (verifyError) {
    console.error('\n⚠️  Could not verify update:', verifyError);
  } else if (verifyData.end) {
    console.log('\n✅ Verified: Season end timestamp is set');
    console.log(`   Players in snapshot: ${Array.isArray(verifyData.players) ? verifyData.players.length : 0}`);
  } else {
    console.error('\n⚠️  Warning: Season end is still null after update!');
  }
}

closeSeason();
