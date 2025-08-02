#\!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkJulyCoverage() {
  console.log('July 2025 Data Coverage Report');
  console.log('==============================\n');

  // Get all July data grouped by day
  const { data: julyData } = await supabase
    .from('toast_checks')
    .select('created_date, total_amount')
    .gte('created_date', '2025-07-01T00:00:00')
    .lt('created_date', '2025-08-01T00:00:00')
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

  // Show all 31 days of July
  console.log('Day-by-Day July 2025 Coverage:\n');
  let totalRevenue = 0;
  let totalChecks = 0;
  let daysWithData = 0;

  for (let day = 1; day <= 31; day++) {
    const date = `2025-07-${day.toString().padStart(2, '0')}`;
    const data = dailyData[date];
    
    if (data) {
      console.log(`${date}: $${data.total.toFixed(2)} (${data.count} checks) ✓`);
      totalRevenue += data.total;
      totalChecks += data.count;
      daysWithData++;
    } else {
      console.log(`${date}: No data`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`Total July Revenue: $${totalRevenue.toFixed(2)}`);
  console.log(`Total July Checks: ${totalChecks}`);
  console.log(`Days with data: ${daysWithData}/31`);
  console.log(`Days missing data: ${31 - daysWithData}`);

  // Check which days need syncing
  const missingDays = [];
  for (let day = 1; day <= 31; day++) {
    const date = `2025-07-${day.toString().padStart(2, '0')}`;
    if (\!dailyData[date]) {
      missingDays.push(date);
    }
  }

  if (missingDays.length > 0) {
    console.log('\nDays that need syncing:');
    missingDays.forEach(date => console.log(`  - ${date}`));
  }
}

checkJulyCoverage().catch(console.error);
