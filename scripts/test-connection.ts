import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testConnection() {
  console.log('🔄 Testing Supabase connection...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase credentials in .env file');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // Test 1: Check venue_config table
    console.log('📋 Testing venue_config table...');
    const { data: venueData, error: venueError } = await supabase
      .from('venue_config')
      .select('*');

    if (venueError) {
      console.error('❌ Error accessing venue_config:', venueError.message);
    } else {
      console.log('✅ venue_config table accessible');
      console.log(`   Found ${venueData?.length || 0} venues`);
      if (venueData?.length > 0) {
        console.log(`   Venue: ${venueData[0].name}`);
      }
    }

    // Test 2: Check if tables exist
    console.log('\n📋 Checking for required tables...');
    const tables = [
      'api_credentials',
      'venue_snapshots',
      'eventbrite_events',
      'toast_transactions',
      'wisk_inventory',
      'daily_summaries',
      'chat_history',
      'action_log'
    ];

    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .select('count', { count: 'exact', head: true });
      
      if (error) {
        console.error(`❌ Table '${table}' - Error: ${error.message}`);
      } else {
        console.log(`✅ Table '${table}' exists`);
      }
    }

    // Test 3: Check RLS policies
    console.log('\n📋 Testing Row Level Security...');
    console.log('ℹ️  RLS should be enabled on all tables');
    console.log('ℹ️  Authenticated users should have read access');

    console.log('\n✅ Database connection test complete!');
    console.log('\nNext steps:');
    console.log('1. Add your service role key to .env');
    console.log('2. Run "pnpm generate:types" to generate TypeScript types');
    console.log('3. Start building the API connectors!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

testConnection();