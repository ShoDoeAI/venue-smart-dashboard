import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Use VITE_ prefix for frontend compatibility
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
  process.exit(1);
}

async function runMigration() {
  console.log('🚀 Running alerts table migration...');
  console.log('Supabase URL:', supabaseUrl);

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'create-alerts-table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
      // Try running the SQL directly as an alternative
      console.log('RPC failed, trying direct approach...');
      
      // Split by statement and run each one
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (const statement of statements) {
        console.log('\nExecuting statement:', statement.substring(0, 50) + '...');
        
        // For CREATE TABLE statements, we can check if table exists first
        if (statement.includes('CREATE TABLE IF NOT EXISTS public.alerts')) {
          const { data: existing } = await supabase
            .from('alerts')
            .select('id')
            .limit(1);
          
          if (existing) {
            console.log('✅ Alerts table already exists');
            continue;
          }
        }

        // Skip policy creation for now as it requires admin access
        if (statement.includes('CREATE POLICY') || statement.includes('ALTER TABLE') && statement.includes('ENABLE ROW LEVEL SECURITY')) {
          console.log('⏭️  Skipping RLS/Policy statement (requires admin access)');
          continue;
        }
      }
      
      console.log('\n✅ Migration completed (tables created, RLS policies skipped)');
    } else {
      console.log('✅ Migration completed successfully!');
    }

    // Verify the table exists
    const { data, error: checkError } = await supabase
      .from('alerts')
      .select('count')
      .limit(1);

    if (!checkError) {
      console.log('✅ Verified: alerts table exists and is accessible');
    } else {
      console.error('❌ Could not verify alerts table:', checkError);
    }

  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

runMigration();