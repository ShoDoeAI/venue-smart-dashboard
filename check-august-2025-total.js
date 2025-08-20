const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY
);

async function checkAugust2025Total() {
  console.log('🔍 Checking August 2025 revenue total\n');

  // Get all August 2025 data from revenue_overrides
  const { data, error } = await supabase
    .from('revenue_overrides')
    .select('date, actual_revenue, check_count')
    .gte('date', '2025-08-01')
    .lte('date', '2025-08-31')
    .order('date', { ascending: true });

  if (error) {
    console.error('Error fetching data:', error);
    return;
  }

  console.log(`📊 Found ${data.length} days with data in August 2025:\n`);
  
  let totalRevenue = 0;
  let totalChecks = 0;
  
  data.forEach((row) => {
    console.log(`  ${row.date}: $${row.actual_revenue.toFixed(2)} (${row.check_count} checks)`);
    totalRevenue += row.actual_revenue;
    totalChecks += row.check_count;
  });

  console.log('\n💰 AUGUST 2025 TOTALS:');
  console.log(`   Total Revenue: $${totalRevenue.toFixed(2)}`);
  console.log(`   Total Checks: ${totalChecks}`);
  console.log(`   Average Check: $${totalChecks > 0 ? (totalRevenue / totalChecks).toFixed(2) : '0.00'}`);
}

checkAugust2025Total();