#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testDirectAggregator() {
  console.log('🔍 Testing Direct Aggregator Query\n');
  
  // Test for August 1st specifically (single day)
  const startDate = new Date(2025, 7, 1); // Aug 1, 2025
  const endDate = new Date(2025, 7, 1);   // Aug 1, 2025 (same day for single day query)
  
  console.log('Date range:');
  console.log('Start:', startDate.toISOString());
  console.log('End:', endDate.toISOString());
  
  const startBusinessDate = parseInt(startDate.toISOString().split('T')[0].replace(/-/g, ''));
  const endBusinessDate = parseInt(endDate.toISOString().split('T')[0].replace(/-/g, ''));
  
  console.log('\nBusiness dates:');
  console.log('Start:', startBusinessDate);
  console.log('End:', endBusinessDate);
  
  // Query orders
  const { data: orders } = await supabase
    .from('toast_orders')
    .select('order_guid, business_date')
    .gte('business_date', startBusinessDate)
    .lte('business_date', endBusinessDate);
  
  console.log(`\nFound ${orders?.length || 0} orders`);
  
  if (orders && orders.length > 0) {
    // Get unique business dates
    const uniqueDates = [...new Set(orders.map(o => o.business_date))];
    console.log('Business dates found:', uniqueDates);
    
    // Get checks
    const orderGuids = orders.map(o => o.order_guid);
    const { data: checks } = await supabase
      .from('toast_checks')
      .select('total_amount, order_guid')
      .in('order_guid', orderGuids)
      .eq('voided', false);
    
    const total = checks?.reduce((sum, c) => sum + (c.total_amount || 0), 0) || 0;
    console.log(`\nTotal revenue: $${total.toFixed(2)}`);
    console.log(`Total checks: ${checks?.length || 0}`);
    
    // Check if we're getting Aug 2 data
    const aug2Orders = orders.filter(o => o.business_date === 20250802);
    console.log(`\nAugust 2 orders: ${aug2Orders.length}`);
  }
}

testDirectAggregator().catch(console.error);