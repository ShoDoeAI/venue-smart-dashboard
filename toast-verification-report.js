#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function generateVerificationReport() {
  console.log('Toast Data Verification Report');
  console.log('==============================\n');
  console.log('Compare these numbers with your Toast dashboard:\n');
  
  // Dates to verify
  const datesToCheck = [
    '2025-07-25',
    '2025-07-19',
    '2025-07-13',
    '2025-07-12',
    '2025-07-11'
  ];

  for (const date of datesToCheck) {
    await verifyDate(date);
  }

  // Also show monthly totals
  await showMonthlyTotals();
}

async function verifyDate(date) {
  console.log(`\n${date} Summary:`);
  console.log('-'.repeat(50));

  // Get data from toast_checks table
  const { data: checksData, error } = await supabase
    .from('toast_checks')
    .select('check_guid, order_guid, total_amount, amount, tax_amount, tip_amount, created_date, closed_date, payment_status')
    .gte('created_date', `${date}T00:00:00`)
    .lt('created_date', `${date}T23:59:59.999`)
    .order('created_date', { ascending: true });

  if (error) {
    console.error('Error fetching data:', error);
    return;
  }

  // Calculate totals
  const totalRevenue = checksData?.reduce((sum, check) => sum + (check.total_amount || 0), 0) || 0;
  const subtotal = checksData?.reduce((sum, check) => sum + (check.amount || 0), 0) || 0;
  const totalTax = checksData?.reduce((sum, check) => sum + (check.tax_amount || 0), 0) || 0;
  const totalTips = checksData?.reduce((sum, check) => sum + (check.tip_amount || 0), 0) || 0;

  console.log(`  Number of Checks: ${checksData?.length || 0}`);
  console.log(`  Gross Sales (Total): $${totalRevenue.toFixed(2)}`);
  console.log(`  Net Sales (Subtotal): $${subtotal.toFixed(2)}`);
  console.log(`  Tax Collected: $${totalTax.toFixed(2)}`);
  console.log(`  Tips: $${totalTips.toFixed(2)}`);

  // Show payment status breakdown
  const statusCounts = {};
  checksData?.forEach(check => {
    const status = check.payment_status || 'UNKNOWN';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });
  
  console.log(`\n  Check Status:`);
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`    ${status}: ${count}`);
  });

  // Show first 3 checks for verification
  console.log(`\n  First 3 Checks (for manual verification):`);
  checksData?.slice(0, 3).forEach(check => {
    const time = new Date(check.created_date).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
    console.log(`    ${time} - Check Total: $${check.total_amount.toFixed(2)}`);
  });
}

async function showMonthlyTotals() {
  console.log('\n\nMonthly Revenue Summary:');
  console.log('========================');
  console.log('(Compare with Toast Reports > Sales Summary)\n');

  // Get all checks grouped by month
  const { data: allChecks } = await supabase
    .from('toast_checks')
    .select('created_date, total_amount, amount, tax_amount, tip_amount')
    .order('created_date', { ascending: false });

  const monthlyData = {};
  
  allChecks?.forEach(check => {
    const month = check.created_date?.substring(0, 7);
    if (month) {
      if (!monthlyData[month]) {
        monthlyData[month] = {
          revenue: 0,
          subtotal: 0,
          tax: 0,
          tips: 0,
          count: 0
        };
      }
      monthlyData[month].revenue += (check.total_amount || 0);
      monthlyData[month].subtotal += (check.amount || 0);
      monthlyData[month].tax += (check.tax_amount || 0);
      monthlyData[month].tips += (check.tip_amount || 0);
      monthlyData[month].count += 1;
    }
  });

  Object.entries(monthlyData)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 6) // Last 6 months
    .forEach(([month, data]) => {
      console.log(`${month}:`);
      console.log(`  Gross Sales: $${data.revenue.toFixed(2)} (${data.count} checks)`);
      console.log(`  Net Sales: $${data.subtotal.toFixed(2)}`);
      console.log(`  Tax: $${data.tax.toFixed(2)}`);
      console.log(`  Tips: $${data.tips.toFixed(2)}`);
      console.log('');
    });

  // Show grand total
  const totals = Object.values(monthlyData).reduce((acc, data) => ({
    revenue: acc.revenue + data.revenue,
    subtotal: acc.subtotal + data.subtotal,
    tax: acc.tax + data.tax,
    tips: acc.tips + data.tips,
    count: acc.count + data.count
  }), { revenue: 0, subtotal: 0, tax: 0, tips: 0, count: 0 });

  console.log('GRAND TOTAL (All Data):');
  console.log(`  Gross Sales: $${totals.revenue.toFixed(2)}`);
  console.log(`  Net Sales: $${totals.subtotal.toFixed(2)}`);
  console.log(`  Tax: $${totals.tax.toFixed(2)}`);
  console.log(`  Tips: $${totals.tips.toFixed(2)}`);
  console.log(`  Total Checks: ${totals.count}`);

  // Instructions for verification
  console.log('\n\nHow to Verify in Toast Dashboard:');
  console.log('==================================');
  console.log('1. Log into Toast Dashboard');
  console.log('2. Go to Reports > Sales Summary');
  console.log('3. Select the date range for each period above');
  console.log('4. Compare these numbers:');
  console.log('   - "Gross Sales" = Toast "Total Sales"');
  console.log('   - "Net Sales" = Toast "Net Sales" (before tax)');
  console.log('   - "Tax" = Toast "Tax Collected"');
  console.log('   - "Tips" = Toast "Tips"');
  console.log('\n5. For daily verification:');
  console.log('   - Go to Reports > Daily Summary');
  console.log('   - Select the specific date');
  console.log('   - Check "Sales by Revenue Center" section');
}

// Run verification
generateVerificationReport().catch(console.error);