require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkTotals() {
  try {
    // Get total counts
    const { count: orderCount } = await supabase
      .from('toast_orders')
      .select('*', { count: 'exact', head: true });

    const { count: checkCount } = await supabase
      .from('toast_checks')
      .select('*', { count: 'exact', head: true });

    const { count: paymentCount } = await supabase
      .from('toast_payments')
      .select('*', { count: 'exact', head: true });

    // Get date range
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

    // Get total revenue
    const { data: revenueData } = await supabase
      .from('toast_checks')
      .select('total_amount');

    const totalRevenue = revenueData?.reduce((sum, check) => sum + (check.total_amount || 0), 0) || 0;

    // Get July 25 revenue specifically
    const { data: july25Data } = await supabase
      .from('toast_checks')
      .select('total_amount, created_date')
      .gte('created_date', '2025-07-25T00:00:00')
      .lt('created_date', '2025-07-26T00:00:00');

    const july25Revenue = july25Data?.reduce((sum, check) => sum + (check.total_amount || 0), 0) || 0;

    console.log('Toast Data Summary:');
    console.log('==================');
    console.log(`Total Orders: ${orderCount}`);
    console.log(`Total Checks: ${checkCount}`);
    console.log(`Total Payments: ${paymentCount}`);
    console.log(`Total Revenue: $${totalRevenue.toFixed(2)}`);
    console.log(`\nDate Range: ${dateRange?.[0]?.created_date || 'N/A'} to ${latestDate?.[0]?.created_date || 'N/A'}`);
    console.log(`\nJuly 25, 2025 Revenue: $${july25Revenue.toFixed(2)} (${july25Data?.length || 0} checks)`);

    // Show sample of dates with data
    const { data: dailyRevenue } = await supabase
      .rpc('get_daily_revenue')
      .catch(() => null);

    if (!dailyRevenue) {
      // Manual daily grouping
      const { data: allChecks } = await supabase
        .from('toast_checks')
        .select('created_date, total_amount')
        .order('created_date', { ascending: false });

      const dailyTotals = {};
      allChecks?.forEach(check => {
        const date = check.created_date?.split('T')[0];
        if (date) {
          dailyTotals[date] = (dailyTotals[date] || 0) + (check.total_amount || 0);
        }
      });

      console.log('\nDaily Revenue (last 10 days with data):');
      Object.entries(dailyTotals)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .slice(0, 10)
        .forEach(([date, revenue]) => {
          console.log(`  ${date}: $${revenue.toFixed(2)}`);
        });
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkTotals();