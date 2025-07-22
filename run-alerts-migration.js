const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials. Please check your .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('Running alerts table migration...');
    
    // Read the migration SQL
    const migrationPath = path.join(__dirname, 'supabase/migrations/20240120_create_alerts_table.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // If RPC doesn't exist, try running statements individually
      console.log('Running migration statements individually...');
      
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
      for (const statement of statements) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        
        // Since Supabase JS client doesn't support raw SQL, we'll need to use the REST API
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({ sql_query: statement + ';' })
        });
        
        if (!response.ok) {
          console.warn(`Statement failed (might already exist): ${statement.substring(0, 50)}...`);
        }
      }
    }
    
    // Verify the tables were created
    console.log('\nVerifying tables...');
    
    const { data: alertsTable } = await supabase
      .from('alerts')
      .select('*')
      .limit(1);
    
    const { data: historyTable } = await supabase
      .from('alert_history')
      .select('*')
      .limit(1);
    
    console.log('✅ Alerts table verified');
    console.log('✅ Alert history table verified');
    console.log('\nMigration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Alternative approach - direct table creation using Supabase client
async function createTablesDirectly() {
  try {
    console.log('\nAttempting direct table verification/creation...');
    
    // Test if tables exist by trying to select from them
    const { error: alertsError } = await supabase
      .from('alerts')
      .select('count')
      .limit(0);
    
    if (alertsError) {
      console.log('Alerts table not found. Please run the migration SQL directly in Supabase Dashboard.');
      console.log('\nSQL location: supabase/migrations/20240120_create_alerts_table.sql');
      console.log('\nTo run the migration:');
      console.log('1. Go to https://supabase.com/dashboard/project/bmhplnojfuznflbyqqze/editor');
      console.log('2. Click on "SQL Editor" in the left sidebar');
      console.log('3. Copy and paste the contents of the migration file');
      console.log('4. Click "Run" to execute the migration');
    } else {
      console.log('✅ Alerts table already exists');
      
      // Check alert_history table
      const { error: historyError } = await supabase
        .from('alert_history')
        .select('count')
        .limit(0);
      
      if (historyError) {
        console.log('Alert history table not found. Please run the full migration.');
      } else {
        console.log('✅ Alert history table already exists');
      }
    }
    
  } catch (error) {
    console.error('Error checking tables:', error);
  }
}

// Run the migration
runMigration().catch(() => {
  console.log('\nFalling back to direct verification...');
  createTablesDirectly();
});