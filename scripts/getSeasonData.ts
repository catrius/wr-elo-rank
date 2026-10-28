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

async function getSeasonData() {
  // Get current timestamp
  const now = new Date().toISOString();

  // Fetch all current player data (excluding hidden guest player)
  const { data: players, error: playersError } = await supabase
    .from('player')
    .select('id, name, elo, win, total, avatar, ingame')
    .eq('hidden', false)
    .order('elo', { ascending: false });

  if (playersError) {
    console.error('Error fetching players:', playersError);
    process.exit(1);
  }

  console.log('='.repeat(80));
  console.log('SEASON END DATA');
  console.log('='.repeat(80));
  console.log('\nCurrent season ID: 4 (2026S3)');
  console.log('\n--- END TIMESTAMP ---');
  console.log(now);
  console.log('\n--- PLAYERS JSON (copy everything between the brackets) ---');
  console.log(JSON.stringify(players, null, 2));
  console.log(`\n${'='.repeat(80)}`);
  console.log('\nTo update manually in Supabase dashboard:');
  console.log('1. Go to Table Editor → season table');
  console.log('2. Find row with id=4 (2026S3)');
  console.log('3. Set "end" field to the timestamp above');
  console.log('4. Set "players" field to the JSON array above');
  console.log('='.repeat(80));
}

getSeasonData();
