const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkAllChecks() {
  console.log('🔍 Checking ALL checks for August 1st orders\n');

  // Get all order GUIDs for Aug 1
  const { data: orders } = await supabase
    .from('toast_orders')
    .select('order_guid')
    .eq('business_date', 20250801);

  if (orders && orders.length > 0) {
    const orderGuids = orders.map((o) => o.order_guid);
    console.log(`Found ${orderGuids.length} orders for Aug 1\n`);

    // Get ALL checks for these orders (regardless of created_date)
    const { data: checks } = await supabase
      .from('toast_checks')
      .select('check_guid, total_amount, created_date, order_guid')
      .in('order_guid', orderGuids)
      .order('total_amount', { ascending: false });

    console.log(`✅ Total checks for Aug 1 orders: ${checks?.length || 0}`);
    console.log(
      `💰 Total revenue: $${checks?.reduce((sum, c) => sum + c.total_amount, 0).toFixed(2) || '0.00'}`,
    );

    // Group by date
    if (checks) {
      const byDate = {};
      checks.forEach((c) => {
        const date = c.created_date.split('T')[0];
        if (!byDate[date]) byDate[date] = { count: 0, total: 0 };
        byDate[date].count++;
        byDate[date].total += c.total_amount;
      });

      console.log('\nChecks by created_date:');
      Object.entries(byDate)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([date, data]) => {
          console.log(`  ${date}: ${data.count} checks, $${data.total.toFixed(2)}`);
        });

      // Show top 5 checks
      console.log('\nTop 5 checks:');
      checks.slice(0, 5).forEach((c) => {
        const date = c.created_date.split('T')[0];
        console.log(`  $${c.total_amount.toFixed(2)} - ${c.check_guid} (created: ${date})`);
      });
    }
  }

  console.log('\n🎯 Expected: 53 checks, $1,295.00');
  console.log('This should match your Toast dashboard for August 1st business date');
}

checkAllChecks();
