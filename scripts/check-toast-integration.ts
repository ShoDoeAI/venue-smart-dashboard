#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkToastIntegration() {
  console.log('🔍 Checking Toast POS Integration Status...\n');

  try {
    // 1. Check if venues table exists
    console.log('1️⃣  Checking venues table...');
    const { data: venues, error: venuesError } = await supabase
      .from('venues')
      .select('id, name, is_active')
      .limit(1);

    if (venuesError) {
      console.log('❌ venues table not found:', venuesError.message);
      console.log('   Run the migration: supabase/migrations/20250123_fix_missing_tables.sql');
    } else {
      console.log('✅ venues table exists');
      if (venues && venues.length > 0) {
        console.log(`   Found venue: ${venues[0].name} (ID: ${venues[0].id})`);
      }
    }

    // 2. Check api_credentials for Toast
    console.log('\n2️⃣  Checking Toast credentials...');
    const { data: toastCreds, error: credsError } = await supabase
      .from('api_credentials')
      .select('*')
      .eq('service', 'toast')
      .single();

    if (credsError || !toastCreds) {
      console.log('❌ Toast credentials not found in api_credentials table');
      console.log('   You need to configure Toast credentials with:');
      console.log('   - clientId');
      console.log('   - clientSecret');
      console.log('   - locationGuid');
      console.log('   - environment (sandbox/production)');
    } else {
      console.log('✅ Toast credentials found');
      console.log(`   Active: ${toastCreds.is_active}`);
      console.log(`   Last successful fetch: ${toastCreds.last_successful_fetch || 'Never'}`);
      console.log(`   Last error: ${toastCreds.last_error || 'None'}`);
    }

    // 3. Check api_sync_status
    console.log('\n3️⃣  Checking Toast sync status...');
    const { data: syncStatus, error: syncError } = await supabase
      .from('api_sync_status')
      .select('*')
      .eq('service', 'toast')
      .single();

    if (syncError || !syncStatus) {
      console.log('❌ No sync status found for Toast');
    } else {
      console.log('✅ Toast sync status:');
      console.log(`   Last sync: ${syncStatus.last_sync_at || 'Never'}`);
      console.log(`   Last successful sync: ${syncStatus.last_successful_sync_at || 'Never'}`);
      console.log(`   Is syncing: ${syncStatus.is_syncing}`);
      console.log(`   Last error: ${syncStatus.last_error || 'None'}`);
    }

    // 4. Check Toast data tables
    console.log('\n4️⃣  Checking Toast data...');
    
    // Check orders
    const { count: ordersCount, error: ordersError } = await supabase
      .from('toast_orders')
      .select('*', { count: 'exact', head: true });

    if (ordersError) {
      console.log('❌ toast_orders table error:', ordersError.message);
    } else {
      console.log(`✅ toast_orders: ${ordersCount || 0} records`);
    }

    // Check payments
    const { count: paymentsCount, error: paymentsError } = await supabase
      .from('toast_payments')
      .select('*', { count: 'exact', head: true });

    if (paymentsError) {
      console.log('❌ toast_payments table error:', paymentsError.message);
    } else {
      console.log(`✅ toast_payments: ${paymentsCount || 0} records`);
    }

    // Check transactions view
    const { count: transactionsCount, error: transactionsError } = await supabase
      .from('toast_transactions')
      .select('*', { count: 'exact', head: true });

    if (transactionsError) {
      console.log('❌ toast_transactions view error:', transactionsError.message);
    } else {
      console.log(`✅ toast_transactions view: ${transactionsCount || 0} records`);
    }

    // 5. Check cron logs
    console.log('\n5️⃣  Checking cron job logs...');
    const { data: cronLogs, error: cronError } = await supabase
      .from('cron_logs')
      .select('*')
      .eq('job_name', 'fetch-data')
      .order('executed_at', { ascending: false })
      .limit(5);

    if (cronError) {
      console.log('❌ cron_logs table not found:', cronError.message);
    } else {
      console.log(`✅ Found ${cronLogs?.length || 0} recent cron executions`);
      cronLogs?.forEach((log, index) => {
        console.log(`   ${index + 1}. ${log.executed_at}: ${log.status} (${log.duration_ms}ms)`);
        if (log.error_message) {
          console.log(`      Error: ${log.error_message}`);
        }
      });
    }

    // 6. Check environment variables
    console.log('\n6️⃣  Checking Toast environment variables...');
    const hasToastEnvVars = !!(
      process.env.TOAST_CLIENT_ID &&
      process.env.TOAST_CLIENT_SECRET &&
      process.env.TOAST_LOCATION_GUID
    );

    if (hasToastEnvVars) {
      console.log('✅ Toast environment variables are set');
      console.log(`   Environment: ${process.env.TOAST_ENVIRONMENT || 'production'}`);
    } else {
      console.log('❌ Missing Toast environment variables:');
      if (!process.env.TOAST_CLIENT_ID) console.log('   - TOAST_CLIENT_ID');
      if (!process.env.TOAST_CLIENT_SECRET) console.log('   - TOAST_CLIENT_SECRET');
      if (!process.env.TOAST_LOCATION_GUID) console.log('   - TOAST_LOCATION_GUID');
    }

    // Summary
    console.log('\n📊 SUMMARY:');
    console.log('═══════════');
    
    const issues = [];
    if (venuesError) issues.push('venues table missing');
    if (!toastCreds) issues.push('Toast credentials not configured');
    if (!syncStatus) issues.push('No sync status');
    if (ordersCount === 0) issues.push('No Toast data');
    if (!hasToastEnvVars) issues.push('Missing environment variables');

    if (issues.length === 0) {
      console.log('✅ Toast integration appears to be working!');
    } else {
      console.log('❌ Issues found:');
      issues.forEach(issue => console.log(`   - ${issue}`));
      
      console.log('\n🔧 Next steps:');
      console.log('1. Run the database migration to create missing tables');
      console.log('2. Set Toast environment variables in Vercel');
      console.log('3. Configure Toast credentials in the database');
      console.log('4. Trigger the cron job manually or wait for it to run');
    }

  } catch (error) {
    console.error('❌ Error checking Toast integration:', error);
  }
}

// Run the check
checkToastIntegration();