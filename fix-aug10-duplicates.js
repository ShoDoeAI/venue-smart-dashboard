#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function fixAug10Duplicates() {
  console.log('\n🔧 FIXING AUGUST 10, 2025 DUPLICATE CHECKS');
  console.log('='.repeat(60));

  // Get all orders for Aug 10
  const { data: orders } = await supabase
    .from('toast_orders')
    .select('order_guid')
    .eq('business_date', 20250810);

  if (!orders || orders.length === 0) {
    console.log('No orders found!');
    return;
  }

  // Get all checks for these orders
  const orderGuids = orders.map((o) => o.order_guid);
  const { data: allChecks } = await supabase
    .from('toast_checks')
    .select('*')
    .in('order_guid', orderGuids)
    .order('created_date', { ascending: true });

  console.log(`Total checks found: ${allChecks?.length || 0}`);

  // Find duplicates
  const checksByGuid = new Map();
  const duplicateIds = [];

  allChecks?.forEach((check) => {
    if (!checksByGuid.has(check.check_guid)) {
      // Keep the first occurrence
      checksByGuid.set(check.check_guid, check);
    } else {
      // This is a duplicate - mark for deletion
      duplicateIds.push(check.id);
    }
  });

  console.log(`Unique checks: ${checksByGuid.size}`);
  console.log(`Duplicate entries to remove: ${duplicateIds.length}`);

  // Calculate revenue before fix
  let totalRevenue = 0;
  checksByGuid.forEach((check) => {
    if (!check.voided) {
      totalRevenue += check.total_amount || 0;
    }
  });
  console.log(`Revenue after removing duplicates: $${totalRevenue.toFixed(2)}`);

  if (duplicateIds.length > 0) {
    console.log('\nRemoving duplicate entries...');

    // Delete duplicates in batches
    const batchSize = 100;
    for (let i = 0; i < duplicateIds.length; i += batchSize) {
      const batch = duplicateIds.slice(i, i + batchSize);
      const { error } = await supabase.from('toast_checks').delete().in('id', batch);

      if (error) {
        console.log(`Error deleting batch ${i / batchSize + 1}:`, error.message);
      } else {
        console.log(`Deleted batch ${i / batchSize + 1} (${batch.length} records)`);
      }
    }

    console.log('\n✅ Duplicates removed successfully!');
  } else {
    console.log('\n✅ No duplicates found - database is clean!');
  }

  // Verify the fix
  console.log('\nVerifying fix...');
  const { data: finalChecks } = await supabase
    .from('toast_checks')
    .select('total_amount, voided')
    .in('order_guid', orderGuids);

  let finalRevenue = 0;
  let finalCount = 0;
  finalChecks?.forEach((check) => {
    if (!check.voided) {
      finalRevenue += check.total_amount || 0;
      finalCount++;
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL RESULTS:');
  console.log(`Total checks: ${finalChecks?.length || 0}`);
  console.log(`Non-voided checks: ${finalCount}`);
  console.log(`Total revenue: $${finalRevenue.toFixed(2)}`);
  console.log(`Toast dashboard shows: $6,500.00`);
  console.log(`Match: ${finalRevenue === 6500 ? '✅ YES!' : '❌ NO'}`);
  console.log('='.repeat(60));
}

fixAug10Duplicates().catch(console.error);
