const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function debugSync() {
  console.log('🔍 Debugging August 1st Sync\n');

  // Get orders for Aug 1
  const { data: orders, error: ordersError } = await supabase
    .from('toast_orders')
    .select('*')
    .eq('business_date', 20250801);

  console.log(`📦 Orders in DB: ${orders?.length || 0}`);
  if (orders && orders.length > 0) {
    console.log(`   First order: ${orders[0].order_guid}`);
    console.log(`   Has checks: ${orders.filter((o) => o.order_guid).length}`);
  }

  // Get checks for Aug 1
  const { data: checks, error: checksError } = await supabase
    .from('toast_checks')
    .select('*')
    .gte('created_date', '2025-08-01T00:00:00')
    .lte('created_date', '2025-08-01T23:59:59')
    .order('total_amount', { ascending: false });

  console.log(`\n✅ Checks in DB: ${checks?.length || 0}`);
  console.log(
    `💰 Total revenue: $${checks?.reduce((sum, c) => sum + c.total_amount, 0).toFixed(2) || '0.00'}`,
  );

  // Show top checks
  if (checks && checks.length > 0) {
    console.log('\nTop 5 checks:');
    checks.slice(0, 5).forEach((check) => {
      console.log(`   $${check.total_amount.toFixed(2)} - ${check.check_guid}`);
    });
  }

  // Check for issues
  if (checks && orders) {
    const orderGuids = new Set(orders.map((o) => o.order_guid));
    const checksWithOrders = checks.filter((c) => orderGuids.has(c.order_guid));
    console.log(`\n🔗 Checks with matching orders: ${checksWithOrders.length}/${checks.length}`);

    // Look for duplicate check guids
    const checkGuids = checks.map((c) => c.check_guid);
    const uniqueGuids = [...new Set(checkGuids)];
    if (checkGuids.length !== uniqueGuids.length) {
      console.log(`\n⚠️  Duplicate check GUIDs: ${checkGuids.length - uniqueGuids.length}`);
    }
  }

  // Check what we're missing
  console.log('\n📊 Summary:');
  console.log(`   Expected: 53 checks, $1,295.00`);
  console.log(
    `   Got: ${checks?.length || 0} checks, $${checks?.reduce((sum, c) => sum + c.total_amount, 0).toFixed(2) || '0.00'}`,
  );
  console.log(
    `   Missing: ${53 - (checks?.length || 0)} checks, $${(1295 - (checks?.reduce((sum, c) => sum + c.total_amount, 0) || 0)).toFixed(2)}`,
  );
}

debugSync();
