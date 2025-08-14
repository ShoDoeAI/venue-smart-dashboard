#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function analyzeAug10Discrepancy() {
  console.log('\n🔍 ANALYZING AUGUST 10, 2025 REVENUE DISCREPANCY');
  console.log('='.repeat(70));
  console.log('Toast Dashboard shows: $6,500.00');
  console.log('Database shows: $13,516.00');
  console.log('Difference: $7,016.00\n');

  // Get all orders for Aug 10
  const { data: orders } = await supabase
    .from('toast_orders')
    .select('order_guid, created_date')
    .eq('business_date', 20250810);

  if (!orders || orders.length === 0) {
    console.log('No orders found!');
    return;
  }

  console.log(`Total orders: ${orders.length}`);

  // Get all checks
  const orderGuids = orders.map((o) => o.order_guid);
  const { data: checks } = await supabase
    .from('toast_checks')
    .select('*')
    .in('order_guid', orderGuids)
    .order('total_amount', { ascending: false });

  // Analyze checks
  let duplicateChecks = new Map();
  let seenGuids = new Set();
  let totalWithDupes = 0;
  let totalNoDupes = 0;
  let voidedTotal = 0;
  let deletedTotal = 0;

  checks?.forEach((check) => {
    if (check.voided) {
      voidedTotal += check.total_amount || 0;
    } else {
      totalWithDupes += check.total_amount || 0;

      if (!seenGuids.has(check.check_guid)) {
        seenGuids.add(check.check_guid);
        totalNoDupes += check.total_amount || 0;
      } else {
        if (!duplicateChecks.has(check.check_guid)) {
          duplicateChecks.set(check.check_guid, []);
        }
        duplicateChecks.get(check.check_guid).push(check);
      }
    }
  });

  console.log('\n📊 ANALYSIS RESULTS:');
  console.log('='.repeat(70));
  console.log(`Total checks in database: ${checks?.length || 0}`);
  console.log(`Unique check GUIDs: ${seenGuids.size}`);
  console.log(`Duplicate check entries: ${checks?.length - seenGuids.size}`);
  console.log(`\nRevenue with duplicates: $${totalWithDupes.toFixed(2)}`);
  console.log(`Revenue without duplicates: $${totalNoDupes.toFixed(2)}`);
  console.log(`Voided checks total: $${voidedTotal.toFixed(2)}`);

  // Check for test orders or specific patterns
  let testOrderRevenue = 0;
  let largeOrderRevenue = 0;
  let smallOrderRevenue = 0;

  checks?.forEach((check) => {
    if (!check.voided) {
      // Check for test orders (often round numbers or specific amounts)
      if (check.total_amount === 100 || check.total_amount === 1000 || check.total_amount === 500) {
        testOrderRevenue += check.total_amount;
      }
      // Large orders over $100
      if (check.total_amount > 100) {
        largeOrderRevenue += check.total_amount;
      }
      // Small orders under $10
      if (check.total_amount < 10) {
        smallOrderRevenue += check.total_amount;
      }
    }
  });

  console.log(`\n🔍 Order patterns:`);
  console.log(`Test/round number orders: $${testOrderRevenue.toFixed(2)}`);
  console.log(`Large orders (>$100): $${largeOrderRevenue.toFixed(2)}`);
  console.log(`Small orders (<$10): $${smallOrderRevenue.toFixed(2)}`);

  // Show duplicate details
  if (duplicateChecks.size > 0) {
    console.log(`\n⚠️  DUPLICATE CHECKS FOUND:`);
    duplicateChecks.forEach((dupes, guid) => {
      console.log(`\nCheck ${guid}:`);
      dupes.forEach((check) => {
        console.log(`  - Amount: $${check.total_amount}, Created: ${check.created_date}`);
      });
    });
  }

  // Check time ranges
  console.log('\n⏰ TIME ANALYSIS:');
  const timeRanges = {
    morning: { start: 0, end: 12, revenue: 0, count: 0 },
    afternoon: { start: 12, end: 17, revenue: 0, count: 0 },
    evening: { start: 17, end: 22, revenue: 0, count: 0 },
    lateNight: { start: 22, end: 24, revenue: 0, count: 0 },
  };

  checks?.forEach((check) => {
    if (!check.voided && check.created_date) {
      const hour = new Date(check.created_date).getUTCHours();
      Object.entries(timeRanges).forEach(([period, data]) => {
        if (hour >= data.start && hour < data.end) {
          data.revenue += check.total_amount || 0;
          data.count++;
        }
      });
    }
  });

  Object.entries(timeRanges).forEach(([period, data]) => {
    console.log(`${period}: ${data.count} checks, $${data.revenue.toFixed(2)}`);
  });

  // Possible explanations
  console.log('\n💡 POSSIBLE EXPLANATIONS FOR DISCREPANCY:');
  console.log('='.repeat(70));

  if (totalNoDupes === 6500) {
    console.log('✅ Removing duplicates gives us exactly $6,500!');
    console.log('   The issue is duplicate check entries in the database.');
  } else if (Math.abs(totalNoDupes - 6500) < 100) {
    console.log(
      `✅ Removing duplicates gives us $${totalNoDupes.toFixed(2)}, very close to $6,500!`,
    );
    console.log('   The issue is likely duplicate entries plus some rounding.');
  } else {
    console.log('❌ Even after removing duplicates, we have a discrepancy.');
    console.log('   Possible causes:');
    console.log('   1. Some checks belong to a different business date');
    console.log('   2. Toast dashboard applies additional filters');
    console.log('   3. Some orders are test/training orders');
    console.log('   4. Time zone differences in business date calculation');
  }

  // Sample of highest value checks
  console.log('\n📋 TOP 10 CHECKS:');
  const topChecks = checks?.filter((c) => !c.voided).slice(0, 10);
  topChecks?.forEach((check, i) => {
    console.log(
      `${i + 1}. $${check.total_amount.toFixed(2)} - ${check.check_guid.slice(0, 8)}... - Created: ${new Date(check.created_date).toLocaleString()}`,
    );
  });
}

analyzeAug10Discrepancy().catch(console.error);
