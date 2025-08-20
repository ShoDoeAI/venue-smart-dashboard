const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY
);

async function checkRevenueYears() {
  console.log('🔍 Checking what years have revenue data in revenue_overrides table\n');

  // Get all unique years from revenue_overrides
  const { data, error } = await supabase
    .from('revenue_overrides')
    .select('date')
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching data:', error);
    return;
  }

  // Extract unique years
  const years = new Set();
  const monthCounts = {};
  
  data.forEach((row) => {
    const date = new Date(row.date);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const yearMonth = `${year}-${month.toString().padStart(2, '0')}`;
    
    years.add(year);
    monthCounts[yearMonth] = (monthCounts[yearMonth] || 0) + 1;
  });

  console.log('📅 Years with revenue data:', Array.from(years).sort());
  console.log(`\n📊 Total records: ${data.length}`);
  
  // Show month breakdown
  console.log('\n📆 Monthly breakdown:');
  Object.entries(monthCounts)
    .sort()
    .forEach(([yearMonth, count]) => {
      console.log(`  ${yearMonth}: ${count} days`);
    });

  // Show date range
  if (data.length > 0) {
    const oldestDate = data[data.length - 1].date;
    const newestDate = data[0].date;
    console.log(`\n📍 Date range: ${oldestDate} to ${newestDate}`);
  }
}

checkRevenueYears();