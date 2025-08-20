const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY
);

async function checkFebruary2025() {
  console.log('🔍 Checking February 2025 data availability\n');

  // Check revenue_overrides
  const { data: revenueData, error: revenueError } = await supabase
    .from('revenue_overrides')
    .select('date, actual_revenue')
    .gte('date', '2025-02-01')
    .lte('date', '2025-02-28')
    .order('date');

  console.log('📊 Revenue Overrides Table:');
  if (revenueError) {
    console.log('  Error:', revenueError);
  } else if (!revenueData || revenueData.length === 0) {
    console.log('  ❌ No February 2025 data found');
  } else {
    console.log(`  ✅ Found ${revenueData.length} days of data`);
    const total = revenueData.reduce((sum, d) => sum + d.actual_revenue, 0);
    console.log(`  Total: $${total.toFixed(2)}`);
  }

  // Check all available months
  console.log('\n📅 Checking all available months in revenue_overrides:');
  const { data: allMonths, error: monthsError } = await supabase
    .from('revenue_overrides')
    .select('date')
    .order('date');

  if (!monthsError && allMonths) {
    const monthSet = new Set();
    allMonths.forEach(row => {
      const date = new Date(row.date);
      const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      monthSet.add(monthYear);
    });

    const sortedMonths = Array.from(monthSet).sort();
    console.log('\nAvailable months:', sortedMonths);
    console.log(`\nTotal months with data: ${sortedMonths.length}`);
    console.log(`Date range: ${sortedMonths[0]} to ${sortedMonths[sortedMonths.length - 1]}`);
  }
}

checkFebruary2025();