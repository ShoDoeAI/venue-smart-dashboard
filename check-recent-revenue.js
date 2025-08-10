#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkRecentRevenue() {
  console.log('📊 Checking Recent Revenue Data\n');
  console.log('Today is: Saturday, August 10, 2025');
  console.log('=' .repeat(60));
  
  // Check last 7 days
  const dates = [
    { date: 20250809, label: 'August 9 (Yesterday - Friday)' },
    { date: 20250808, label: 'August 8 (Thursday)' },
    { date: 20250807, label: 'August 7 (Wednesday)' },
    { date: 20250806, label: 'August 6 (Tuesday)' },
    { date: 20250805, label: 'August 5 (Monday)' },
    { date: 20250804, label: 'August 4 (Sunday)' },
    { date: 20250803, label: 'August 3 (Saturday)' },
  ];
  
  for (const { date, label } of dates) {
    const { data: orders } = await supabase
      .from('toast_orders')
      .select('order_guid')
      .eq('business_date', date);
    
    if (orders && orders.length > 0) {
      const { data: checks } = await supabase
        .from('toast_checks')
        .select('total_amount')
        .in('order_guid', orders.map(o => o.order_guid))
        .eq('voided', false);
      
      const total = checks?.reduce((sum, c) => sum + (c.total_amount || 0), 0) || 0;
      console.log(`${label}: $${total.toFixed(2)} (${checks?.length || 0} checks)`);
    } else {
      console.log(`${label}: No data`);
    }
  }
  
  // Also check what we have for today (Aug 10)
  console.log('\n' + '-'.repeat(60));
  const { data: todayOrders } = await supabase
    .from('toast_orders')
    .select('order_guid')
    .eq('business_date', 20250810);
  
  if (todayOrders && todayOrders.length > 0) {
    const { data: checks } = await supabase
      .from('toast_checks')
      .select('total_amount')
      .in('order_guid', todayOrders.map(o => o.order_guid))
      .eq('voided', false);
    
    const total = checks?.reduce((sum, c) => sum + (c.total_amount || 0), 0) || 0;
    console.log(`Today (August 10): $${total.toFixed(2)} (${checks?.length || 0} checks)`);
  } else {
    console.log('Today (August 10): No data yet');
  }
}

checkRecentRevenue().catch(console.error);