const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY
);

async function plan24MonthSync() {
  console.log('📅 PLANNING 24-MONTH DATA SYNC\n');
  
  // Get current date (system shows Aug 19, 2025)
  const currentDate = new Date();
  console.log(`Current Date: ${currentDate.toDateString()}\n`);

  // Calculate 24 months back
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 23); // 23 months back + current month = 24
  
  console.log(`Target Date Range: ${startDate.toDateString()} to ${currentDate.toDateString()}`);
  console.log('─'.repeat(60));

  // Get existing data
  const { data: existingData, error } = await supabase
    .from('revenue_overrides')
    .select('date')
    .order('date');

  if (error) {
    console.error('Error fetching existing data:', error);
    return;
  }

  // Create a set of existing months
  const existingMonths = new Set();
  existingData.forEach(row => {
    const date = new Date(row.date);
    const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    existingMonths.add(monthKey);
  });

  // Generate list of all months needed
  const allMonthsNeeded = [];
  const missingMonths = [];
  
  let checkDate = new Date(startDate);
  while (checkDate <= currentDate) {
    const year = checkDate.getFullYear();
    const month = checkDate.getMonth() + 1;
    const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
    
    allMonthsNeeded.push(monthKey);
    
    if (!existingMonths.has(monthKey)) {
      missingMonths.push({
        year,
        month,
        monthKey,
        monthName: checkDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      });
    }
    
    checkDate.setMonth(checkDate.getMonth() + 1);
  }

  console.log('\n📊 SYNC SUMMARY:');
  console.log(`Total months needed: ${allMonthsNeeded.length}`);
  console.log(`Months with data: ${existingMonths.size}`);
  console.log(`Missing months: ${missingMonths.length}`);

  console.log('\n✅ EXISTING MONTHS:');
  Array.from(existingMonths).sort().forEach(month => {
    console.log(`  ${month}`);
  });

  console.log('\n❌ MISSING MONTHS (need to sync):');
  missingMonths.forEach(({ monthName, year, month }) => {
    console.log(`  ${monthName} (${year}-${month.toString().padStart(2, '0')})`);
  });

  // Create sync commands
  console.log('\n🚀 SYNC STRATEGY:');
  console.log('Since we need to sync 20 months, we should:');
  console.log('1. Sync in batches to avoid timeouts');
  console.log('2. Start with most recent missing data');
  console.log('3. Use year-based sync for efficiency');

  // Group by year
  const yearGroups = {};
  missingMonths.forEach(({ year, month }) => {
    if (!yearGroups[year]) yearGroups[year] = [];
    yearGroups[year].push(month);
  });

  console.log('\n📋 SYNC COMMANDS BY YEAR:');
  Object.entries(yearGroups).sort().forEach(([year, months]) => {
    const monthList = months.sort((a, b) => a - b).join(',');
    console.log(`\nYear ${year} (${months.length} months):`);
    console.log(`curl -X GET "https://venue-smart-dashboard.vercel.app/api/sync-missing-months?year=${year}&months=${monthList}"`);
  });

  console.log('\n⚡ QUICK SYNC (for testing - first 3 days per month):');
  Object.entries(yearGroups).sort().reverse().forEach(([year, months]) => {
    if (months.length > 0) {
      const firstMonth = Math.min(...months);
      console.log(`curl -X GET "https://venue-smart-dashboard.vercel.app/api/sync-missing-months?year=${year}&months=${firstMonth}&quick=true"`);
      return;
    }
  });
}

plan24MonthSync();