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

async function verifySeason() {
  console.log('Fetching all seasons...\n');

  const { data: seasons, error } = await supabase.from('season').select().order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching seasons:', error);
    process.exit(1);
  }

  console.log('Seasons:');
  seasons?.forEach((season) => {
    console.log(`\n  ID: ${season.id}`);
    console.log(`  Name: ${season.name}`);
    console.log(`  Start: ${season.start}`);
    console.log(`  End: ${season.end ?? '(current season)'}`);
    const playerCount = Array.isArray(season.players) ? season.players.length : 0;
    console.log(`  Players snapshot: ${playerCount} players`);
  });

  const currentSeason = seasons?.find((s) => !s.end);
  if (currentSeason) {
    console.log(`\n✅ Active season: ${currentSeason.name}`);
  } else {
    console.log('\n⚠️  No active season found (all seasons closed)');
  }
}

verifySeason();
