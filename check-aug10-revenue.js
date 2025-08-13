#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkAug10() {
  // Check toast_checks for Aug 10
  const { data: checks, error } = await supabase
    .from('toast_checks')
    .select('total_amount, voided')
    .gte('created_date', '2025-08-10T00:00:00.000Z')
    .lt('created_date', '2025-08-11T00:00:00.000Z');

  if (error) {
    console.log('Error:', error);
    return;
  }

  // Calculate total revenue (excluding voided checks)
  let totalRevenue = 0;
  let voidedRevenue = 0;
  let checkCount = 0;

  for (const check of checks) {
    if (!check.voided) {
      totalRevenue += check.total_amount || 0;
      checkCount++;
    } else {
      voidedRevenue += check.total_amount || 0;
    }
  }

  console.log('\nDatabase Results for August 10, 2025:');
  console.log('=====================================');
  console.log('Total checks in database:', checks.length);
  console.log('Non-voided checks:', checkCount);
  console.log('Total revenue (non-voided):', '$' + totalRevenue.toFixed(2));
  console.log('Voided revenue:', '$' + voidedRevenue.toFixed(2));

  // Also check using business date
  const { data: orderChecks, count } = await supabase
    .from('toast_orders')
    .select('order_guid', { count: 'exact', head: false })
    .eq('business_date', 20250810);

  console.log('\nOrders by business_date (20250810):', count);

  // Get some sample checks to see the data
  const { data: sampleChecks } = await supabase
    .from('toast_checks')
    .select('check_guid, total_amount, created_date, closed_date')
    .gte('created_date', '2025-08-10T00:00:00.000Z')
    .lt('created_date', '2025-08-11T00:00:00.000Z')
    .limit(5);

  console.log('\nSample checks:');
  if (sampleChecks) {
    sampleChecks.forEach((check, i) => {
      console.log(
        `${i + 1}. Check ${check.check_guid.slice(0, 8)}... - $${check.total_amount} - Created: ${check.created_date}`,
      );
    });
  }
}

checkAug10().catch(console.error);
