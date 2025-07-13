#!/usr/bin/env tsx
/**
 * Test harness for Toast connector data flow
 * 
 * This script:
 * 1. Initializes the Toast connector
 * 2. Fetches data from Toast API
 * 3. Stores data in Supabase
 * 4. Validates the entire flow
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { ToastConnector } from '@venuesync/shared/connectors/toast/toast-connector';
import type { Database } from '@venuesync/shared/types/database.generated';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

// Validate required environment variables
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'TOAST_CLIENT_ID',
  'TOAST_CLIENT_SECRET',
  'TOAST_LOCATION_GUID',
  'TOAST_ENVIRONMENT',
];

const missingVars = requiredEnvVars.filter(key => !process.env[key]);
if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars);
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testToastFlow() {
  console.log('🚀 Starting Toast connector test flow...\n');

  try {
    // Step 1: Initialize Toast connector
    console.log('1️⃣ Initializing Toast connector...');
    const connector = new ToastConnector(
      {
        id: 'test-toast-1',
        service: 'toast',
        credentials: {
          clientId: process.env.TOAST_CLIENT_ID!,
          clientSecret: process.env.TOAST_CLIENT_SECRET!,
          locationGuid: process.env.TOAST_LOCATION_GUID!,
          environment: process.env.TOAST_ENVIRONMENT as 'sandbox' | 'production',
        },
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        timeout: 30000,
        maxRetries: 3,
        retryDelay: 1000,
      },
      supabase
    );

    // Step 2: Validate credentials
    console.log('2️⃣ Validating Toast credentials...');
    const isValid = await connector.validateCredentials();
    if (!isValid) {
      throw new Error('Invalid Toast credentials');
    }
    console.log('✅ Credentials validated\n');

    // Step 3: Test connection
    console.log('3️⃣ Testing Toast connection...');
    const connectionTest = await connector.testConnection();
    if (!connectionTest.success) {
      throw new Error(`Connection test failed: ${connectionTest.error?.message}`);
    }
    console.log('✅ Connection successful\n');

    // Step 4: Fetch locations
    console.log('4️⃣ Fetching Toast locations...');
    const locationsResult = await connector.fetchLocations();
    if (!locationsResult.success || !locationsResult.data || locationsResult.data.length === 0) {
      throw new Error('No locations found. Please ensure your Toast account has at least one location.');
    }
    
    const location = locationsResult.data[0];
    console.log(`✅ Found ${locationsResult.data.length} location(s)`);
    console.log(`📍 Using location: ${location.name || location.id}\n`);

    // Step 5: Fetch recent transactions
    const endTime = new Date();
    const startTime = new Date();
    startTime.setDate(startTime.getDate() - 7); // Last 7 days

    console.log('5️⃣ Fetching Toast transactions...');
    console.log(`📅 Date range: ${startTime.toISOString()} to ${endTime.toISOString()}`);
    
    const transactionsResult = await connector.fetchAllTransactions(
      location.id,
      startTime,
      endTime
    );

    if (!transactionsResult.success) {
      throw new Error(`Failed to fetch transactions: ${transactionsResult.error?.message}`);
    }

    const transactions = transactionsResult.data || [];
    console.log(`✅ Fetched ${transactions.length} transaction(s)\n`);

    // Step 6: Store in Supabase
    if (transactions.length > 0) {
      console.log('6️⃣ Storing transactions in Supabase...');
      const saveResult = await connector.saveTransactions(transactions, new Date().toISOString());
      
      if (!saveResult.success) {
        throw new Error(`Failed to save transactions: ${saveResult.error?.message}`);
      }
      
      console.log(`✅ Saved ${saveResult.data} transaction(s) to database\n`);

      // Step 7: Verify data in Supabase
      console.log('7️⃣ Verifying data in Supabase...');
      const { data: savedTransactions, error } = await supabase
        .from('toast_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        throw new Error(`Failed to verify data: ${error.message}`);
      }

      console.log(`✅ Verified ${savedTransactions?.length || 0} recent transaction(s) in database`);
      
      if (savedTransactions && savedTransactions.length > 0) {
        console.log('\n📊 Sample transaction:');
        const sample = savedTransactions[0];
        console.log(`  - ID: ${sample.transaction_id}`);
        console.log(`  - Amount: $${(sample.total_amount / 100).toFixed(2)}`);
        console.log(`  - Created: ${sample.created_at}`);
        console.log(`  - Status: ${sample.status}`);
      }
    } else {
      console.log('ℹ️  No transactions found in the specified date range.');
      console.log('   This is normal for sandbox environments or new accounts.\n');
    }

    // Step 8: Test other endpoints
    console.log('\n8️⃣ Testing additional endpoints...');
    
    // Test customers
    console.log('   - Fetching customers...');
    const customersResult = await connector.fetchCustomers();
    if (customersResult.success) {
      console.log(`   ✅ Found ${customersResult.data?.data.length || 0} customer(s)`);
    }

    // Test team members
    console.log('   - Fetching team members...');
    const teamMembersResult = await connector.fetchTeamMembers([location.id]);
    if (teamMembersResult.success) {
      console.log(`   ✅ Found ${teamMembersResult.data?.data.length || 0} team member(s)`);
    }

    // Step 9: Display metrics
    console.log('\n9️⃣ Connector metrics:');
    const metrics = connector.getMetrics();
    console.log(`   - Total requests: ${metrics.totalRequests}`);
    console.log(`   - Successful: ${metrics.successfulRequests}`);
    console.log(`   - Failed: ${metrics.failedRequests}`);
    console.log(`   - Avg response time: ${metrics.averageResponseTime.toFixed(0)}ms`);

    // Display circuit breaker state
    const circuitBreakerState = connector.getCircuitBreakerState();
    console.log(`   - Circuit breaker: ${circuitBreakerState.state}`);

    console.log('\n✅ Toast connector test flow completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test flow failed:', error);
    process.exit(1);
  }
}

// Run the test
testToastFlow().then(() => {
  console.log('\n👋 Test complete. Exiting...');
  process.exit(0);
}).catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});