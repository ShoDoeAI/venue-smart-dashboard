import { createClient } from '@supabase/supabase-js';
import type { Database } from '@venuesync/shared';

// Use placeholder values if env vars are missing (for testing)
const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'test-key';

export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseKey
);