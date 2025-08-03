#\!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function verifyToastData() {
  console.log('Toast Data Verification');
  console.log('======================\n');
  console.log('Compare these numbers with your Toast Dashboard:\n');
  
  // Get today's date in EST/EDT (Toast timezone)
  const now = new Date();
  const today = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const todayISO = today.toISOString();
  const tomorrowISO = tomorrow.toISOString();
  
  console.log(`Today (EST): ${today.toLocaleDateString('en-US', {timeZone: "America/New_York"})}`);
  console.log(`Checking data from: ${todayISO}`);
  console.log(`To: ${tomorrowISO}\n`);
  
  // 1. Check today's revenue
  const { data: todayChecks, error: todayError } = await supabase
    .from('toast_checks')
    .select('total_amount, amount, tax_amount, tip_amount, created_date, payment_status')
    .gte('created_date', todayISO)
    .lt('created_date', tomorrowISO)
    .order('created_date', { ascending: false });
  
  if (todayError) {
    console.error('Error fetching today data:', todayError);
    return;
  }
  
  console.log(`Today's Data:`);
  console.log(`- Number of checks: ${todayChecks?.length || 0}`);
  
  if (todayChecks && todayChecks.length > 0) {
    const totals = todayChecks.reduce((acc, check) => ({
      gross: acc.gross + (check.total_amount || 0),
      net: acc.net + (check.amount || 0),
      tax: acc.tax + (check.tax_amount || 0),
      tips: acc.tips + (check.tip_amount || 0),
      paid: acc.paid + (check.payment_status === 'PAID' || check.payment_status === 'CLOSED' ? 1 : 0)
    }), { gross: 0, net: 0, tax: 0, tips: 0, paid: 0 });
    
    console.log(`- Gross Sales (Total): $${totals.gross.toFixed(2)}`);
    console.log(`- Net Sales (Subtotal): $${totals.net.toFixed(2)}`);
    console.log(`- Tax Collected: $${totals.tax.toFixed(2)}`);
    console.log(`- Tips: $${totals.tips.toFixed(2)}`);
    console.log(`- Paid/Closed Checks: ${totals.paid}`);
    
    // Show first few checks
    console.log('\nFirst 5 checks:');
    todayChecks.slice(0, 5).forEach(check => {
      const time = new Date(check.created_date).toLocaleTimeString('en-US', {
        timeZone: "America/New_York",
        hour: '2-digit',
        minute: '2-digit'
      });
      console.log(`  ${time} - $${check.total_amount.toFixed(2)} (${check.payment_status})`);
    });
  }
  
  // 2. Check yesterday's data
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayISO = yesterday.toISOString();
  
  const { data: yesterdayChecks } = await supabase
    .from('toast_checks')
    .select('total_amount, amount, tax_amount, tip_amount, payment_status')
    .gte('created_date', yesterdayISO)
    .lt('created_date', todayISO);
  
  if (yesterdayChecks && yesterdayChecks.length > 0) {
    const yesterdayTotal = yesterdayChecks.reduce((sum, check) => sum + (check.total_amount || 0), 0);
    console.log(`\nYesterday (${yesterday.toLocaleDateString('en-US', {timeZone: "America/New_York"})}): $${yesterdayTotal.toFixed(2)} (${yesterdayChecks.length} checks)`);
  }
  
  // 3. Check this month's total
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const { data: monthChecks } = await supabase
    .from('toast_checks')
    .select('total_amount')
    .gte('created_date', firstOfMonth.toISOString())
    .lt('created_date', tomorrowISO);
  
  if (monthChecks) {
    const monthTotal = monthChecks.reduce((sum, check) => sum + (check.total_amount || 0), 0);
    console.log(`\nMonth-to-date: $${monthTotal.toFixed(2)} (${monthChecks.length} checks)`);
  }
  
  // 4. Data quality check
  console.log('\n\nData Quality Check:');
  console.log('==================');
  
  // Check for $0 checks
  const { count: zeroCount } = await supabase
    .from('toast_checks')
    .select('*', { count: 'exact', head: true })
    .eq('total_amount', 0);
  
  console.log(`- Checks with $0 total: ${zeroCount || 0}`);
  
  // Check date range
  const { data: dateRange } = await supabase
    .from('toast_checks')
    .select('created_date')
    .order('created_date', { ascending: true })
    .limit(1);
  
  const { data: latestDate } = await supabase
    .from('toast_checks')
    .select('created_date')
    .order('created_date', { ascending: false })
    .limit(1);
  
  if (dateRange && dateRange[0] && latestDate && latestDate[0]) {
    console.log(`- Earliest check: ${new Date(dateRange[0].created_date).toLocaleDateString()}`);
    console.log(`- Latest check: ${new Date(latestDate[0].created_date).toLocaleDateString()}`);
  }
  
  console.log('\n\nIMPORTANT: Toast Dashboard Comparison');
  console.log('=====================================');
  console.log('In your Toast Dashboard, go to:');
  console.log('1. Reports > Sales Summary');
  console.log('2. Select today\'s date');
  console.log('3. Compare these numbers:');
  console.log('   - Gross Sales (should match our Total)');
  console.log('   - Net Sales (should match our Subtotal)');
  console.log('   - Tax (should match our Tax)');
  console.log('   - Tips (should match our Tips)');
  console.log('\nIf numbers don\'t match, the issue could be:');
  console.log('- Timezone differences (we\'re using EST/EDT)');
  console.log('- Open checks not synced yet');
  console.log('- Different location selected');
  console.log('- Data sync delay');
}

verifyToastData().catch(console.error);
EOF < /dev/null