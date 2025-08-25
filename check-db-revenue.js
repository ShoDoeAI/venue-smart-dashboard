const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkRevenue() {
  console.log('Checking revenue_overrides table...\n');

  // Get monthly summaries
  const { data, error } = await supabase
    .from('revenue_overrides')
    .select('date, revenue_total')
    .order('date', { ascending: true });

  if (error) {
    console.error('Error:', error);
    return;
  }

  // Group by month
  const monthlyRevenue = {};
  
  data.forEach(row => {
    const month = row.date.substring(0, 7); // YYYY-MM
    if (!monthlyRevenue[month]) {
      monthlyRevenue[month] = 0;
    }
    monthlyRevenue[month] += row.revenue_total || 0;
  });

  // Display results
  console.log('Monthly Revenue Summary:');
  console.log('========================');
  
  Object.entries(monthlyRevenue)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([month, revenue]) => {
      console.log(`${month}: $${revenue.toFixed(2)}`);
    });
    
  console.log('\nTotal records:', data.length);
  console.log('Date range:', data[0]?.date, 'to', data[data.length - 1]?.date);
}

checkRevenue();