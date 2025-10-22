import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_PUBLIC__SUPABASE_URL,
  import.meta.env.VITE_PUBLIC__SUPABASE_ANON_KEY,
);

export default supabase;
