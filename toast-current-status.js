#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function showCurrentStatus() {
  console.log('Toast Data Current Status Report');
  console.log('================================');
  console.log('Today: July 31, 2025\n');

  // Check last 7 days
  const dates = [
    '2025-07-31',
    '2025-07-30',
    '2025-07-29',
    '2025-07-28',
    '2025-07-27',
    '2025-07-26',
    '2025-07-25'
  ];

  console.log('Daily Revenue (Last 7 Days):');
  console.log('----------------------------\n');

  let weekTotal = 0;
  let weekChecks = 0;

  for (const date of dates) {
    const { data: checksData } = await supabase
      .from('toast_checks')
      .select('total_amount')
      .gte('created_date', `${date}T00:00:00`)
      .lt('created_date', `${date}T23:59:59.999`);

    const dayTotal = checksData?.reduce((sum, check) => sum + (check.total_amount || 0), 0) || 0;
    const dayChecks = checksData?.length || 0;
    
    weekTotal += dayTotal;
    weekChecks += dayChecks;

    const isToday = date === '2025-07-31';
    console.log(`${date}${isToday ? ' (Today)' : ''}: $${dayTotal.toFixed(2)} (${dayChecks} checks)`);
  }

  console.log('\n7-Day Total: $' + weekTotal.toFixed(2) + ' (' + weekChecks + ' checks)');

  // July month-to-date
  const { data: julyData } = await supabase
    .from('toast_checks')
    .select('total_amount, created_date')
    .gte('created_date', '2025-07-01T00:00:00')
    .lt('created_date', '2025-08-01T00:00:00');

  const julyTotal = julyData?.reduce((sum, check) => sum + (check.total_amount || 0), 0) || 0;
  
  // Group by day to show which days have data
  const dailyTotals = {};
  julyData?.forEach(check => {
    const day = check.created_date.split('T')[0];
    dailyTotals[day] = (dailyTotals[day] || 0) + check.total_amount;
  });

  console.log('\n\nJuly 2025 Month Summary:');
  console.log('========================');
  console.log(`Total Revenue: $${julyTotal.toFixed(2)}`);
  console.log(`Total Checks: ${julyData?.length || 0}`);
  console.log(`Average Check: $${julyData?.length ? (julyTotal / julyData.length).toFixed(2) : '0.00'}`);
  console.log(`Days with data: ${Object.keys(dailyTotals).length} days`);

  // Show which days have data
  console.log('\nDays with revenue in July:');
  Object.entries(dailyTotals)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 10)
    .forEach(([date, total]) => {
      console.log(`  ${date}: $${total.toFixed(2)}`);
    });

  // Check data freshness
  const { data: latestCheck } = await supabase
    .from('toast_checks')
    .select('created_date')
    .order('created_date', { ascending: false })
    .limit(1)
    .single();

  if (latestCheck) {
    console.log(`\nMost recent check in database: ${new Date(latestCheck.created_date).toLocaleString()}`);
  }

  console.log('\n\nIMPORTANT - To ensure data matches Toast:');
  console.log('==========================================');
  console.log('1. The sync script found new orders for July 28 and July 31');
  console.log('2. Some data may still be syncing in the background');
  console.log('3. To verify against Toast dashboard:');
  console.log('   - Log into Toast');
  console.log('   - Go to Reports → Sales Summary');
  console.log('   - Select "July 2025" date range');
  console.log('   - Compare total sales amount');
  console.log('\n4. If numbers don\'t match:');
  console.log('   - Check if you\'re looking at the same location');
  console.log('   - Verify the date range matches');
  console.log('   - Check if tips are included/excluded');
  console.log('   - Some orders may still be open/unpaid');
}

showCurrentStatus().catch(console.error);