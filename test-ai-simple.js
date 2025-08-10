#!/usr/bin/env node

// Simple AI chat test
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testDirectQuery() {
  console.log('🔍 Testing AI Chat with Direct Query\n');
  
  // Test 1: Get August 1st revenue
  console.log('Test 1: August 1st Revenue');
  console.log('-'.repeat(40));
  
  const { data: aug1Orders } = await supabase
    .from('toast_orders')
    .select('order_guid')
    .eq('business_date', 20250801);
  
  if (aug1Orders && aug1Orders.length > 0) {
    const orderGuids = aug1Orders.map(o => o.order_guid);
    const { data: checks } = await supabase
      .from('toast_checks')
      .select('total_amount')
      .in('order_guid', orderGuids)
      .eq('voided', false);
    
    const total = checks?.reduce((sum, c) => sum + (c.total_amount || 0), 0) || 0;
    console.log(`✅ August 1st Revenue: $${total.toFixed(2)}`);
    console.log(`   Orders: ${aug1Orders.length}`);
    console.log(`   Checks: ${checks?.length || 0}`);
  } else {
    console.log('❌ No data found for August 1st');
  }
  
  // Test 2: Get August 9th (today) revenue
  console.log('\n\nTest 2: August 9th (Today) Revenue');
  console.log('-'.repeat(40));
  
  const { data: todayOrders } = await supabase
    .from('toast_orders')
    .select('order_guid')
    .eq('business_date', 20250809);
  
  if (todayOrders && todayOrders.length > 0) {
    const orderGuids = todayOrders.map(o => o.order_guid);
    const { data: checks } = await supabase
      .from('toast_checks')
      .select('total_amount')
      .in('order_guid', orderGuids)
      .eq('voided', false);
    
    const total = checks?.reduce((sum, c) => sum + (c.total_amount || 0), 0) || 0;
    console.log(`✅ August 9th Revenue: $${total.toFixed(2)}`);
    console.log(`   Orders: ${todayOrders.length}`);
    console.log(`   Checks: ${checks?.length || 0}`);
  } else {
    console.log('❌ No data found for August 9th');
  }
  
  // Test 3: Get week total
  console.log('\n\nTest 3: This Week Revenue (Aug 4-10)');
  console.log('-'.repeat(40));
  
  const { data: weekOrders } = await supabase
    .from('toast_orders')
    .select('order_guid, business_date')
    .gte('business_date', 20250804)
    .lte('business_date', 20250810)
    .order('business_date');
  
  if (weekOrders && weekOrders.length > 0) {
    const orderGuids = weekOrders.map(o => o.order_guid);
    const { data: checks } = await supabase
      .from('toast_checks')
      .select('total_amount, order_guid')
      .in('order_guid', orderGuids)
      .eq('voided', false);
    
    // Group by date
    const dailyTotals = new Map();
    weekOrders.forEach(order => {
      if (!dailyTotals.has(order.business_date)) {
        dailyTotals.set(order.business_date, { revenue: 0, orders: 0, checks: 0 });
      }
      dailyTotals.get(order.business_date).orders++;
    });
    
    checks?.forEach(check => {
      const order = weekOrders.find(o => o.order_guid === check.order_guid);
      if (order) {
        const day = dailyTotals.get(order.business_date);
        day.revenue += check.total_amount || 0;
        day.checks++;
      }
    });
    
    console.log('✅ Week Breakdown:');
    let weekTotal = 0;
    dailyTotals.forEach((data, date) => {
      const dateStr = String(date).replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
      console.log(`   ${dateStr}: $${data.revenue.toFixed(2)} (${data.checks} checks)`);
      weekTotal += data.revenue;
    });
    console.log(`   TOTAL: $${weekTotal.toFixed(2)}`);
  } else {
    console.log('❌ No data found for this week');
  }
  
  // Test 4: Get last year same week
  console.log('\n\nTest 4: Last Year Same Week (Aug 5-11, 2024)');
  console.log('-'.repeat(40));
  
  const { data: lastYearOrders } = await supabase
    .from('toast_orders')
    .select('order_guid')
    .gte('business_date', 20240805)
    .lte('business_date', 20240811);
  
  if (lastYearOrders && lastYearOrders.length > 0) {
    const orderGuids = lastYearOrders.map(o => o.order_guid);
    const { data: checks } = await supabase
      .from('toast_checks')
      .select('total_amount')
      .in('order_guid', orderGuids)
      .eq('voided', false);
    
    const total = checks?.reduce((sum, c) => sum + (c.total_amount || 0), 0) || 0;
    console.log(`✅ Last Year Same Week Revenue: $${total.toFixed(2)}`);
    console.log(`   Orders: ${lastYearOrders.length}`);
    console.log(`   Checks: ${checks?.length || 0}`);
  } else {
    console.log('❌ No data found for last year same week');
  }
}

testDirectQuery().catch(console.error);