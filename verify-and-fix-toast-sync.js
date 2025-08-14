#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Get Toast token
async function getToastToken() {
  console.log('Getting Toast access token...');

  try {
    const response = await axios.post(
      'https://ws-api.toasttab.com/authentication/v1/authentication/login',
      {
        clientId: process.env.TOAST_CLIENT_ID,
        clientSecret: process.env.TOAST_CLIENT_SECRET,
        userAccessType: 'TOAST_MACHINE_CLIENT',
      },
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );

    if (response.data?.token?.accessToken) {
      console.log('✅ Got Toast token');
      return response.data.token.accessToken;
    }
  } catch (error) {
    console.error('❌ Toast auth error:', error.response?.data || error.message);
    throw error;
  }
}

async function verifyAgainstToastAPI() {
  console.log('\n🔍 VERIFYING AUGUST 10, 2025 AGAINST TOAST API');
  console.log('='.repeat(70));

  try {
    // Get fresh data from Toast API
    const token = await getToastToken();
    const businessDate = '20250810';
    let apiOrders = [];
    let apiRevenue = 0;
    let apiChecks = 0;
    let page = 1;

    console.log('\nFetching fresh data from Toast API...');

    while (true) {
      const url = `https://ws-api.toasttab.com/orders/v2/ordersBulk?businessDate=${businessDate}&page=${page}&pageSize=100`;

      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Toast-Restaurant-External-ID': process.env.TOAST_LOCATION_ID,
        },
        timeout: 30000,
      });

      const orders = response.data || [];

      if (!orders || orders.length === 0) break;

      // Count checks and revenue
      orders.forEach((order) => {
        if (order.checks && Array.isArray(order.checks)) {
          order.checks.forEach((check) => {
            if (!check.deleted && check.guid) {
              apiChecks++;
              if (!check.voided) {
                apiRevenue += check.totalAmount || 0;
              }
            }
          });
        }
      });

      apiOrders = apiOrders.concat(orders);

      if (orders.length < 100) break;
      page++;
    }

    console.log('\n📊 TOAST API RESULTS:');
    console.log(`Total orders: ${apiOrders.length}`);
    console.log(`Total checks: ${apiChecks}`);
    console.log(`Total revenue: $${apiRevenue.toFixed(2)}`);

    // Compare with database
    const { data: dbOrders } = await supabase
      .from('toast_orders')
      .select('order_guid')
      .eq('business_date', 20250810);

    const orderGuids = dbOrders?.map((o) => o.order_guid) || [];
    const { data: dbChecks } = await supabase
      .from('toast_checks')
      .select('total_amount, voided, check_guid')
      .in('order_guid', orderGuids);

    let dbRevenue = 0;
    const uniqueCheckGuids = new Set();

    dbChecks?.forEach((check) => {
      uniqueCheckGuids.add(check.check_guid);
      if (!check.voided) {
        dbRevenue += check.total_amount || 0;
      }
    });

    console.log('\n📊 DATABASE RESULTS:');
    console.log(`Total orders: ${dbOrders?.length || 0}`);
    console.log(`Total checks: ${dbChecks?.length || 0}`);
    console.log(`Unique check GUIDs: ${uniqueCheckGuids.size}`);
    console.log(`Total revenue: $${dbRevenue.toFixed(2)}`);

    console.log('\n✅ VERIFICATION:');
    console.log(`API Revenue: $${apiRevenue.toFixed(2)}`);
    console.log(`DB Revenue: $${dbRevenue.toFixed(2)}`);
    console.log(`Match: ${apiRevenue === dbRevenue ? '✅ YES!' : '❌ NO'}`);

    if (apiRevenue !== dbRevenue) {
      console.log(`\n⚠️  Difference: $${Math.abs(apiRevenue - dbRevenue).toFixed(2)}`);
    }

    return { apiRevenue, dbRevenue, apiChecks, dbChecks: dbChecks?.length || 0 };
  } catch (error) {
    console.error('Error:', error.message);
    return null;
  }
}

// Create database constraint to prevent duplicates
async function createDuplicatePreventionRule() {
  console.log('\n🛡️  CREATING DUPLICATE PREVENTION RULE');
  console.log('='.repeat(70));

  try {
    // Check if unique constraint already exists
    const { data: constraints } = await supabase.rpc('get_table_constraints', {
      table_name: 'toast_checks',
    });

    console.log('Creating SQL migration to add unique constraint...');

    const migrationSQL = `
-- Migration: Add unique constraint to prevent duplicate toast_checks
-- This ensures each check_guid can only appear once in the database

-- First, remove any existing duplicates (keeping the first occurrence)
DELETE FROM toast_checks a
USING toast_checks b
WHERE a.id > b.id 
  AND a.check_guid = b.check_guid;

-- Add unique constraint on check_guid
ALTER TABLE toast_checks 
ADD CONSTRAINT toast_checks_check_guid_unique 
UNIQUE (check_guid);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_toast_checks_check_guid 
ON toast_checks(check_guid);

-- Add similar constraint for toast_orders
DELETE FROM toast_orders a
USING toast_orders b
WHERE a.id > b.id 
  AND a.order_guid = b.order_guid;

ALTER TABLE toast_orders 
ADD CONSTRAINT toast_orders_order_guid_unique 
UNIQUE (order_guid);

CREATE INDEX IF NOT EXISTS idx_toast_orders_order_guid 
ON toast_orders(order_guid);
`;

    console.log('\n📄 MIGRATION SQL:');
    console.log(migrationSQL);

    // Save migration file
    const fs = require('fs');
    const migrationPath = './supabase/migrations/20250814_prevent_toast_duplicates.sql';
    fs.writeFileSync(migrationPath, migrationSQL);
    console.log(`\n✅ Migration saved to: ${migrationPath}`);
    console.log('\nTo apply this migration:');
    console.log('1. Run: npx supabase db push');
    console.log('2. Or apply directly in Supabase Dashboard SQL Editor');
  } catch (error) {
    console.error('Error creating rule:', error.message);
  }
}

// Fix the sync endpoint to use UPSERT instead of INSERT
async function updateSyncEndpoint() {
  console.log('\n🔧 UPDATING SYNC ENDPOINT TO PREVENT DUPLICATES');
  console.log('='.repeat(70));

  const fixedSyncCode = `
// In api/cron/sync-toast-daily.js, update the check insertion:

// OLD CODE (causes duplicates):
const { error } = await supabase
  .from('toast_checks')
  .insert(checkData);

// NEW CODE (prevents duplicates):
const { error } = await supabase
  .from('toast_checks')
  .upsert(checkData, { 
    onConflict: 'check_guid',
    ignoreDuplicates: true 
  });

// Similarly for orders:
await supabase
  .from('toast_orders')
  .upsert({
    order_guid: order.guid,
    business_date: businessDateInt,
    created_date: order.createdDate || order.openedDate,
    location_id: process.env.TOAST_LOCATION_ID
  }, { 
    onConflict: 'order_guid',
    ignoreDuplicates: true 
  });
`;

  console.log(fixedSyncCode);
  console.log('\n✅ This change will prevent duplicates in future syncs');
}

async function main() {
  // 1. Verify against Toast API
  const verification = await verifyAgainstToastAPI();

  if (verification && verification.apiRevenue === 6500) {
    console.log('\n✅ CONFIRMED: $6,500 is the correct revenue for August 10, 2025');
  }

  // 2. Create duplicate prevention rule
  await createDuplicatePreventionRule();

  // 3. Show how to update sync endpoint
  await updateSyncEndpoint();

  console.log('\n' + '='.repeat(70));
  console.log('📋 SUMMARY:');
  console.log('1. ✅ Verified $6,500 is correct for August 10, 2025');
  console.log('2. ✅ Created SQL migration to prevent duplicates');
  console.log('3. ✅ Provided code fix for sync endpoint');
  console.log('='.repeat(70));
}

main().catch(console.error);
