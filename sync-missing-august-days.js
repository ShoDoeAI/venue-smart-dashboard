#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const TOAST_CONFIG = {
  baseUrl: process.env.TOAST_BASE_URL || 'https://ws-api.toasttab.com',
  locationId: process.env.TOAST_LOCATION_ID,
  restaurantGuid: process.env.TOAST_RESTAURANT_GUID,
  managementGroupGuid: process.env.TOAST_MANAGEMENT_GROUP_GUID
};

const toastHeaders = {
  'Authorization': `Bearer ${process.env.TOAST_ACCESS_TOKEN}`,
  'Toast-Restaurant-External-ID': TOAST_CONFIG.restaurantGuid,
  'Content-Type': 'application/json'
};

async function syncBusinessDate(businessDate) {
  const startDate = `${businessDate}T04:00:00.000-0000`;
  const endDate = `${businessDate}T03:59:59.000-0000`;
  
  console.log(`\n📅 Syncing ${businessDate}...`);
  
  try {
    // Fetch orders from Toast
    const response = await axios.get(
      `${TOAST_CONFIG.baseUrl}/orders/v2/ordersBulk`,
      {
        headers: toastHeaders,
        params: {
          restaurantGuid: TOAST_CONFIG.restaurantGuid,
          startDate,
          endDate
        }
      }
    );
    
    const orders = response.data || [];
    console.log(`   Found ${orders.length} orders`);
    
    if (orders.length === 0) {
      console.log('   No orders for this date');
      return { orders: 0, checks: 0, revenue: 0 };
    }
    
    // Delete existing data for this date
    const { data: existingOrders } = await supabase
      .from('toast_orders')
      .select('order_guid')
      .eq('business_date', parseInt(businessDate.replace(/-/g, '')));
    
    if (existingOrders && existingOrders.length > 0) {
      const existingGuids = existingOrders.map(o => o.order_guid);
      
      await supabase
        .from('toast_checks')
        .delete()
        .in('order_guid', existingGuids);
      
      await supabase
        .from('toast_orders')
        .delete()
        .eq('business_date', parseInt(businessDate.replace(/-/g, '')));
      
      console.log(`   Cleaned up ${existingOrders.length} existing orders`);
    }
    
    // Process and insert orders
    let totalRevenue = 0;
    let totalChecks = 0;
    
    for (const order of orders) {
      // Insert order
      const orderData = {
        order_guid: order.guid,
        location_id: TOAST_CONFIG.restaurantGuid,
        business_date: parseInt(businessDate.replace(/-/g, '')),
        created_date: order.createdDate || order.openedDate || new Date().toISOString(),
        modified_date: order.modifiedDate || order.createdDate || new Date().toISOString(),
        promised_date: order.promisedDate || null,
        void_date: order.voidDate || null,
        source: order.source || 'POS',
        void_business_date: order.voidBusinessDate || null,
        display_number: order.displayNumber || null,
        total_amount: order.totalAmount || 0,
        total_tax: order.totalTax || 0,
        total_tip: order.totalTip || 0,
        tab_name: order.tabName || null,
        payment_status: order.paymentStatus || null,
        amount_due: order.amountDue || 0
      };
      
      const { error: orderError } = await supabase
        .from('toast_orders')
        .insert([orderData]);
      
      if (orderError) {
        console.error(`   Error inserting order ${order.guid}:`, orderError.message);
        continue;
      }
      
      // Insert checks
      if (order.checks && Array.isArray(order.checks)) {
        for (const check of order.checks) {
          const checkData = {
            check_guid: check.guid,
            order_guid: order.guid,
            entity_type: check.entityType || 'Check',
            external_id: check.externalId || null,
            display_number: check.displayNumber || null,
            created_date: check.createdDate || order.createdDate || new Date().toISOString(),
            closed_date: check.closedDate || null,
            deleted_date: check.deletedDate || null,
            modified_date: check.modifiedDate || check.createdDate || new Date().toISOString(),
            deleted: check.deleted || false,
            total_amount: check.totalAmount || 0,
            total_tax: check.totalTax || 0,
            total_tip: check.totalTip || 0,
            amount: check.amount || 0,
            tip_amount: check.tipAmount || 0,
            customer_count: check.customerCount || 1,
            tax_exempt: check.taxExempt || false,
            voided: check.voided || false,
            paid_date: check.paidDate || null,
            tab_name: check.tabName || null,
            payment_status: check.paymentStatus || null,
            amount_due: check.amountDue || 0,
            tax_amount: check.taxAmount || 0,
            applied_service_charge_amount: check.appliedServiceChargeAmount || 0
          };
          
          const { error: checkError } = await supabase
            .from('toast_checks')
            .insert([checkData]);
          
          if (checkError) {
            console.error(`   Error inserting check ${check.guid}:`, checkError.message);
          } else if (!check.voided) {
            totalRevenue += check.totalAmount || 0;
            totalChecks++;
          }
        }
      }
    }
    
    console.log(`   ✅ Synced: ${orders.length} orders, ${totalChecks} checks, $${totalRevenue.toFixed(2)} revenue`);
    
    return { orders: orders.length, checks: totalChecks, revenue: totalRevenue };
    
  } catch (error) {
    console.error(`   ❌ Error syncing ${businessDate}:`, error.response?.data || error.message);
    return { orders: 0, checks: 0, revenue: 0, error: error.message };
  }
}

async function syncMissingDays() {
  console.log('🔄 Starting sync for missing August days...\n');
  console.log('Today is: Saturday, August 10, 2025');
  console.log('=' .repeat(60));
  
  // Days to sync
  const missingDays = [
    '2025-08-03', // Saturday
    '2025-08-04', // Sunday
    '2025-08-05', // Monday
    '2025-08-06', // Tuesday
    '2025-08-07', // Wednesday
    '2025-08-09', // Friday (yesterday)
    '2025-08-10'  // Saturday (today)
  ];
  
  const results = [];
  
  for (const day of missingDays) {
    const result = await syncBusinessDate(day);
    results.push({ date: day, ...result });
    
    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 SYNC SUMMARY:');
  console.log('=' .repeat(60));
  
  let totalOrders = 0;
  let totalChecks = 0;
  let totalRevenue = 0;
  
  results.forEach(r => {
    const dayOfWeek = new Date(r.date).toLocaleDateString('en-US', { weekday: 'short' });
    console.log(`${r.date} (${dayOfWeek}): ${r.orders} orders, ${r.checks} checks, $${r.revenue?.toFixed(2) || '0.00'}`);
    totalOrders += r.orders;
    totalChecks += r.checks;
    totalRevenue += r.revenue || 0;
  });
  
  console.log('-' .repeat(60));
  console.log(`TOTAL: ${totalOrders} orders, ${totalChecks} checks, $${totalRevenue.toFixed(2)}`);
  
  // Verify August totals
  console.log('\n📈 Verifying August 2025 totals...');
  
  const { data: augustOrders } = await supabase
    .from('toast_orders')
    .select('order_guid')
    .gte('business_date', 20250801)
    .lte('business_date', 20250831);
  
  if (augustOrders) {
    const { data: augustChecks } = await supabase
      .from('toast_checks')
      .select('total_amount')
      .in('order_guid', augustOrders.map(o => o.order_guid))
      .eq('voided', false);
    
    const augustTotal = augustChecks?.reduce((sum, c) => sum + (c.total_amount || 0), 0) || 0;
    console.log(`\n✅ August 2025 Total: $${augustTotal.toFixed(2)} (${augustChecks?.length || 0} checks)`);
  }
}

// Run the sync
syncMissingDays().catch(console.error);