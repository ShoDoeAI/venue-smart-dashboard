require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function analyzeToastGaps() {
  console.log('Toast Data Gap Analysis');
  console.log('=======================\n');
  
  // Get all July data
  const { data: julyData } = await supabase
    .from('toast_checks')
    .select('created_date, total_amount')
    .gte('created_date', '2025-07-01')
    .lt('created_date', '2025-08-01')
    .order('created_date');
  
  // Group by day
  const dailyData = {};
  julyData?.forEach(check => {
    const day = check.created_date.split('T')[0];
    if (!dailyData[day]) {
      dailyData[day] = { count: 0, total: 0 };
    }
    dailyData[day].count++;
    dailyData[day].total += check.total_amount || 0;
  });
  
  console.log('July 2025 Coverage Report:');
  console.log('Day | Checks | Revenue    | Status');
  console.log('----+--------+------------+--------');
  
  let totalRevenue = 0;
  let daysWithData = 0;
  
  for (let day = 1; day <= 31; day++) {
    const date = `2025-07-${day.toString().padStart(2, '0')}`;
    const data = dailyData[date];
    
    if (data && data.count > 0) {
      console.log(`${day.toString().padStart(2)}  | ${data.count.toString().padStart(6)} | $${data.total.toFixed(2).padStart(9)} | ✓`);
      totalRevenue += data.total;
      daysWithData++;
    } else {
      console.log(`${day.toString().padStart(2)}  | ${' '.repeat(6)} | ${' '.repeat(11)} | MISSING`);
    }
  }
  
  console.log('\nSummary:');
  console.log(`- Days with data: ${daysWithData}/31`);
  console.log(`- Days missing: ${31 - daysWithData}`);
  console.log(`- Total revenue (partial): $${totalRevenue.toFixed(2)}`);
  
  console.log('\n⚠️  IMPORTANT: Only ${Math.round(daysWithData/31*100)}% of July is synced!');
  console.log('This explains why the data doesn\'t match your Toast dashboard.');
  console.log('\nTo fix this, we need to:');
  console.log('1. Run historical sync for missing days');
  console.log('2. Set up proper daily sync going forward');
  console.log('3. Verify amounts are in correct units (dollars vs cents)');
  
  // Check if we have proper Toast credentials
  const hasToastCreds = process.env.TOAST_CLIENT_ID && process.env.TOAST_CLIENT_SECRET;
  console.log(`\nToast credentials: ${hasToastCreds ? '✓ Found' : '✗ Missing'}`);
}

analyzeToastGaps().catch(console.error);