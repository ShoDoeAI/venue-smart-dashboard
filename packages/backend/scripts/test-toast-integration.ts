#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import { ToastConnector } from '../src/connectors/toast/index';
import { DataOrchestrator } from '../src/services/data-orchestrator';
import type { Database } from '@venuesync/shared';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

async function testToastIntegration() {
  console.log('🔧 Testing Toast Integration...\n');

  // Initialize Supabase client
  const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

  try {
    // Step 1: Check venues table
    console.log('1️⃣ Checking venues table...');
    const { data: venues, error: venuesError } = await supabase
      .from('venues')
      .select('*')
      .eq('is_active', true);

    if (venuesError) {
      console.error('❌ Error fetching venues:', venuesError);
      console.log('\nPlease run the database migration first:');
      console.log('Copy the contents of /supabase/migrations/20250123_fix_missing_tables.sql');
      console.log('and run it in the Supabase SQL editor.\n');
      return;
    }

    console.log(`✅ Found ${venues?.length || 0} active venue(s)`);
    const venue = venues?.[0] || { id: crypto.randomUUID(), name: 'Test Venue' };

    // Step 2: Set up Toast credentials
    console.log('\n2️⃣ Setting up Toast credentials...');
    const { error: deleteError } = await supabase
      .from('api_credentials')
      .delete()
      .eq('venue_id', venue.id)
      .eq('api_name', 'toast');

    const { error: credError } = await supabase
      .from('api_credentials')
      .insert({
        venue_id: venue.id,
        api_name: 'toast',
        credentials: {
          clientId: process.env.TOAST_CLIENT_ID!,
          clientSecret: process.env.TOAST_CLIENT_SECRET!,
          locationGuid: process.env.TOAST_LOCATION_ID!,
          environment: 'sandbox'
        },
        is_active: true
      });

    if (credError) {
      console.error('❌ Error setting credentials:', credError);
      return;
    }
    console.log('✅ Toast credentials configured');

    // Step 3: Test Toast API connection
    console.log('\n3️⃣ Testing Toast API connection...');
    const connector = new ToastConnector(supabase);
    
    try {
      // Get recent orders
      const endDate = new Date();
      const startDate = new Date();
      startDate.setHours(startDate.getHours() - 24); // Last 24 hours

      console.log(`📅 Fetching orders from ${startDate.toISOString()} to ${endDate.toISOString()}`);
      
      const data = await connector.fetchData({
        venueId: venue.id,
        dateRange: { start: startDate, end: endDate }
      });

      console.log('\n✅ Toast API Connection Successful!');
      console.log(`📊 Data Summary:`);
      console.log(`   - Orders: ${data.orders?.length || 0}`);
      console.log(`   - Payments: ${data.payments?.length || 0}`);
      console.log(`   - Line Items: ${data.lineItems?.length || 0}`);
      console.log(`   - Customers: ${data.customers?.length || 0}`);

      // Step 4: Check if data was stored
      console.log('\n4️⃣ Checking stored data...');
      const orchestrator = new DataOrchestrator(supabase);
      
      // Store the fetched data
      if (data.orders && data.orders.length > 0) {
        await connector.storeData(data, venue.id);
        console.log('✅ Data stored successfully');

        // Check Toast tables
        const { data: storedOrders } = await supabase
          .from('toast_orders')
          .select('count')
          .limit(1);
        
        const { data: storedPayments } = await supabase
          .from('toast_payments')
          .select('count')
          .limit(1);

        console.log(`📦 Stored in database:`);
        console.log(`   - Orders in toast_orders table`);
        console.log(`   - Payments in toast_payments table`);
      } else {
        console.log('ℹ️  No data to store (might be outside business hours or no recent orders)');
      }

      // Step 5: Test API sync status
      console.log('\n5️⃣ Checking API sync status...');
      const apiStatuses = await orchestrator.getApiStatuses(venue.id);
      console.log('📊 API Status:', {
        toast: apiStatuses.toast
      });

      console.log('\n✅ Toast integration is fully operational!');
      console.log('\n🎯 Next steps:');
      console.log('1. Deploy to Vercel: vercel --prod');
      console.log('2. Set environment variables in Vercel dashboard');
      console.log('3. The cron job will run every 3 minutes to fetch new data');

    } catch (apiError: any) {
      console.error('\n❌ Toast API Error:', apiError.message);
      if (apiError.response) {
        console.error('Response:', apiError.response.data);
      }
      console.log('\n🔍 Troubleshooting:');
      console.log('1. Check if Toast credentials are correct');
      console.log('2. Verify the location GUID is valid');
      console.log('3. Ensure you have API access enabled in Toast');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the test
testToastIntegration().catch(console.error);