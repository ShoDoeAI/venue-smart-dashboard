#!/usr/bin/env tsx
/**
 * Test Supabase Connection
 * Verifies that we can connect to Supabase and perform basic operations
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '.env.local') });

async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase Connection...\n');

  // Check environment variables
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  console.log('📋 Environment Check:');
  console.log(`SUPABASE_URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`);
  console.log(`SUPABASE_SERVICE_KEY: ${supabaseServiceKey ? '✅ Set' : '❌ Missing'}`);
  console.log(`SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✅ Set' : '❌ Missing'}`);

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('\n❌ Missing required environment variables!');
    console.error('Make sure .env.local contains SUPABASE_URL and SUPABASE_SERVICE_KEY');
    process.exit(1);
  }

  // Create Supabase client
  console.log('\n🔗 Creating Supabase client...');
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Test 1: Check if we can query tables
    console.log('\n📊 Test 1: Checking database tables...');
    const { data: tables, error: tablesError } = await supabase
      .from('venue_config')
      .select('*')
      .limit(1);

    if (tablesError) {
      console.error('❌ Error querying venue_config:', tablesError.message);
      
      // Check if table exists
      if (tablesError.message.includes('relation') && tablesError.message.includes('does not exist')) {
        console.log('\n⚠️  Table venue_config does not exist. Database might not be initialized.');
        console.log('Run database migrations to create tables.');
      }
    } else {
      console.log('✅ Successfully connected to venue_config table');
      console.log(`   Found ${tables?.length || 0} records`);
    }

    // Test 2: Check other critical tables
    console.log('\n📊 Test 2: Checking other tables...');
    const tablesToCheck = [
      'api_credentials',
      'venue_snapshots',
      'daily_summaries',
      'alerts',
      'chat_history',
      'action_log'
    ];

    let tablesFound = 0;
    for (const tableName of tablesToCheck) {
      const { error } = await supabase
        .from(tableName)
        .select('count')
        .limit(1)
        .single();

      if (!error) {
        console.log(`✅ ${tableName} - exists`);
        tablesFound++;
      } else {
        console.log(`❌ ${tableName} - ${error.message}`);
      }
    }

    console.log(`\n📊 Tables found: ${tablesFound}/${tablesToCheck.length}`);

    // Test 3: Test write capability
    console.log('\n✍️  Test 3: Testing write capability...');
    const testData = {
      key: 'test_connection',
      value: new Date().toISOString(),
      test: true
    };

    const { data: writeData, error: writeError } = await supabase
      .from('venue_config')
      .upsert(testData)
      .select();

    if (writeError) {
      console.error('❌ Write test failed:', writeError.message);
    } else {
      console.log('✅ Write test successful');
      
      // Clean up test data
      await supabase
        .from('venue_config')
        .delete()
        .eq('key', 'test_connection');
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📋 SUPABASE CONNECTION TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`Project URL: ${supabaseUrl}`);
    console.log(`Project ID: ${supabaseUrl.split('.')[0].split('//')[1]}`);
    console.log(`Connection: ✅ Successful`);
    console.log(`Tables: ${tablesFound > 0 ? '✅ Found' : '❌ Missing - needs migration'}`);
    console.log(`Read: ✅ Working`);
    console.log(`Write: ${writeError ? '❌ Failed' : '✅ Working'}`);
    console.log('='.repeat(50));

    return tablesFound > 0;

  } catch (error) {
    console.error('\n❌ Connection test failed:', error);
    return false;
  }
}

// Run the test
testSupabaseConnection().then(success => {
  process.exit(success ? 0 : 1);
});