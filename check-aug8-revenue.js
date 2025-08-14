#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkAug8Revenue() {
  console.log('\n📊 CHECKING AUGUST 8, 2025 REVENUE');
  console.log('='.repeat(50));

  // Get orders for Aug 8 business date
  const { data: orders } = await supabase
    .from('toast_orders')
    .select('order_guid')
    .eq('business_date', 20250808);

  if (!orders || orders.length === 0) {
    console.log('No orders found for August 8, 2025');
    return;
  }

  // Get checks for these orders
  const orderGuids = orders.map((o) => o.order_guid);
  const { data: checks } = await supabase
    .from('toast_checks')
    .select('check_guid, total_amount, voided')
    .in('order_guid', orderGuids);

  // Check for duplicates and calculate revenue
  const uniqueChecks = new Map();
  let duplicateCount = 0;

  checks?.forEach((check) => {
    if (!uniqueChecks.has(check.check_guid)) {
      uniqueChecks.set(check.check_guid, check);
    } else {
      duplicateCount++;
    }
  });

  // Calculate revenue
  let totalRevenue = 0;
  let nonVoidedChecks = 0;
  let voidedChecks = 0;

  uniqueChecks.forEach((check) => {
    if (!check.voided) {
      totalRevenue += check.total_amount || 0;
      nonVoidedChecks++;
    } else {
      voidedChecks++;
    }
  });

  console.log(`\nOrders: ${orders.length}`);
  console.log(`Total checks in DB: ${checks?.length || 0}`);
  console.log(`Unique checks: ${uniqueChecks.size}`);
  console.log(`Duplicate entries: ${duplicateCount}`);
  console.log(`Non-voided checks: ${nonVoidedChecks}`);
  console.log(`Voided checks: ${voidedChecks}`);
  console.log('\n💰 Total Revenue: $' + totalRevenue.toFixed(2));
  console.log('='.repeat(50));
}

checkAug8Revenue().catch(console.error);
