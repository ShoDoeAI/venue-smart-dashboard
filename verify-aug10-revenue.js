#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function verifyAug10Revenue() {
  console.log('\n🔍 VERIFYING AUGUST 10, 2025 REVENUE');
  console.log('='.repeat(60));

  // Method 1: Query by created_date (UTC)
  const { data: checksByCreatedDate } = await supabase
    .from('toast_checks')
    .select('total_amount, voided')
    .gte('created_date', '2025-08-10T00:00:00.000Z')
    .lt('created_date', '2025-08-11T00:00:00.000Z');

  let method1Revenue = 0;
  let method1Count = 0;
  if (checksByCreatedDate) {
    checksByCreatedDate.forEach((check) => {
      if (!check.voided) {
        method1Revenue += check.total_amount || 0;
        method1Count++;
      }
    });
  }

  console.log('\nMethod 1: Query by created_date (Aug 10 UTC):');
  console.log(`  Checks found: ${checksByCreatedDate?.length || 0}`);
  console.log(`  Non-voided checks: ${method1Count}`);
  console.log(`  Total revenue: $${method1Revenue.toFixed(2)}`);

  // Method 2: Query by business date through orders
  const { data: orders } = await supabase
    .from('toast_orders')
    .select('order_guid')
    .eq('business_date', 20250810);

  if (orders && orders.length > 0) {
    const orderGuids = orders.map((o) => o.order_guid);

    // Get all checks for these orders
    const { data: checksByBusinessDate } = await supabase
      .from('toast_checks')
      .select('total_amount, voided, created_date')
      .in('order_guid', orderGuids);

    let method2Revenue = 0;
    let method2Count = 0;
    let earliestCheck = null;
    let latestCheck = null;

    if (checksByBusinessDate) {
      checksByBusinessDate.forEach((check) => {
        if (!check.voided) {
          method2Revenue += check.total_amount || 0;
          method2Count++;

          // Track time range
          if (!earliestCheck || check.created_date < earliestCheck) {
            earliestCheck = check.created_date;
          }
          if (!latestCheck || check.created_date > latestCheck) {
            latestCheck = check.created_date;
          }
        }
      });
    }

    console.log('\nMethod 2: Query by business date (20250810):');
    console.log(`  Orders found: ${orders.length}`);
    console.log(`  Checks found: ${checksByBusinessDate?.length || 0}`);
    console.log(`  Non-voided checks: ${method2Count}`);
    console.log(`  Total revenue: $${method2Revenue.toFixed(2)}`);

    if (earliestCheck && latestCheck) {
      console.log(
        `  Time range: ${new Date(earliestCheck).toLocaleString()} to ${new Date(latestCheck).toLocaleString()}`,
      );
    }

    // Show breakdown by hour
    if (checksByBusinessDate && checksByBusinessDate.length > 0) {
      const hourlyBreakdown = {};
      checksByBusinessDate.forEach((check) => {
        if (!check.voided) {
          const hour = new Date(check.created_date).getHours();
          if (!hourlyBreakdown[hour]) {
            hourlyBreakdown[hour] = { count: 0, revenue: 0 };
          }
          hourlyBreakdown[hour].count++;
          hourlyBreakdown[hour].revenue += check.total_amount || 0;
        }
      });

      console.log('\nHourly breakdown (UTC hours):');
      Object.keys(hourlyBreakdown)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .forEach((hour) => {
          const data = hourlyBreakdown[hour];
          console.log(`  Hour ${hour}: ${data.count} checks, $${data.revenue.toFixed(2)}`);
        });
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ This is the actual revenue for business date August 10, 2025');
  console.log('The AI should be querying by business date (Method 2) to match Toast dashboard');
}

verifyAug10Revenue().catch(console.error);
