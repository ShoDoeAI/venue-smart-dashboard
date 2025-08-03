#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function syncToastData() {
  console.log('Toast Data Sync - Starting');
  console.log('=========================\n');
  
  try {
    // Get auth token
    console.log('Authenticating with Toast...');
    const authResponse = await fetch(
      'https://ws-api.toasttab.com/authentication/v1/authentication/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: process.env.TOAST_CLIENT_ID,
          clientSecret: process.env.TOAST_CLIENT_SECRET,
          userAccessType: 'TOAST_MACHINE_CLIENT'
        })
      }
    );
    
    if (!authResponse.ok) {
      console.error('Auth failed:', authResponse.status);
      return;
    }
    
    const authData = await authResponse.json();
    const token = authData.token.accessToken;
    console.log('✓ Authentication successful');
    
    // Sync last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    console.log(`\nSyncing data from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`);
    
    const url = `https://ws-api.toasttab.com/orders/v2/ordersBulk?` +
      `startDate=${startDate.toISOString()}&` +
      `endDate=${endDate.toISOString()}`;
    
    console.log('Fetching orders from Toast...');
    
    const ordersResponse = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Toast-Restaurant-External-ID': process.env.TOAST_LOCATION_ID,
        'Content-Type': 'application/json'
      }
    });
    
    if (!ordersResponse.ok) {
      console.error('Failed to fetch orders:', ordersResponse.status, ordersResponse.statusText);
      const errorText = await ordersResponse.text();
      console.error('Error:', errorText);
      return;
    }
    
    const orders = await ordersResponse.json();
    console.log(`✓ Found ${orders.length} orders`);
    
    let savedCount = 0;
    let totalRevenue = 0;
    let checkCount = 0;
    let errors = [];
    
    // Use consistent snapshot timestamp for this sync
    const snapshotTimestamp = new Date().toISOString();
    
    // Process and save orders
    console.log('\nProcessing orders...');
    for (const order of orders) {
      if (order.checks && Array.isArray(order.checks)) {
        for (const check of order.checks) {
          checkCount++;
          
          // Convert cents to dollars (matching the schema which expects numeric(10,2))
          const checkData = {
            check_guid: check.guid,
            order_guid: order.guid,
            snapshot_timestamp: snapshotTimestamp,
            tab_name: check.tabName || null,
            total_amount: (check.totalAmount || 0) / 100,
            amount: (check.amount || 0) / 100,
            tax_amount: (check.taxAmount || 0) / 100,
            tip_amount: (check.tipAmount || 0) / 100,
            applied_discount_amount: (check.appliedDiscountAmount || 0) / 100,
            created_date: check.createdDate || check.openedDate,
            opened_date: check.openedDate,
            closed_date: check.closedDate,
            voided: check.voided || false,
            void_date: check.voidDate,
            payment_status: check.paymentStatus || 'OPEN',
            customer_guid: check.customer?.guid || null,
            customer_first_name: check.customer?.firstName || null,
            customer_last_name: check.customer?.lastName || null,
            customer_phone: check.customer?.phone || null,
            customer_email: check.customer?.email || null,
            applied_service_charges: check.appliedServiceCharges || null,
            applied_discounts: check.appliedDiscounts || null,
            is_historical: false
          };
          
          totalRevenue += checkData.total_amount;
          
          // Use upsert with both check_guid and snapshot_timestamp
          const { error } = await supabase
            .from('toast_checks')
            .upsert(checkData, { 
              onConflict: 'check_guid,snapshot_timestamp'
            });
          
          if (error) {
            errors.push({
              check_guid: check.guid,
              error: error.message
            });
            console.error(`Error saving check ${check.guid}:`, error.message);
          } else {
            savedCount++;
          }
        }
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('SYNC COMPLETE');
    console.log('='.repeat(50));
    console.log(`- Total orders: ${orders.length}`);
    console.log(`- Total checks: ${checkCount}`);
    console.log(`- Checks saved: ${savedCount}`);
    console.log(`- Total revenue: $${totalRevenue.toFixed(2)}`);
    console.log(`- Errors: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\nFirst 5 errors:');
      errors.slice(0, 5).forEach(e => {
        console.log(`  ${e.check_guid}: ${e.error}`);
      });
    }
    
    // Show some recent checks
    const { data: recentChecks } = await supabase
      .from('toast_checks')
      .select('created_date, total_amount, payment_status')
      .order('created_date', { ascending: false })
      .limit(5);
    
    if (recentChecks && recentChecks.length > 0) {
      console.log('\nMost recent checks in database:');
      recentChecks.forEach(check => {
        console.log(`  ${new Date(check.created_date).toLocaleDateString()} - $${check.total_amount} (${check.payment_status})`);
      });
    }
    
    // Check dashboard data through the view
    const { data: dashboardData } = await supabase
      .from('simple_transactions')
      .select('amount')
      .gte('transaction_date', startDate.toISOString())
      .lte('transaction_date', endDate.toISOString());
    
    if (dashboardData) {
      const dashboardTotal = dashboardData.reduce((sum, t) => sum + (t.amount || 0), 0);
      console.log(`\n📊 Dashboard will show: $${dashboardTotal.toFixed(2)}`);
    }
    
    console.log('\n✅ Toast data is now synced!');
    console.log('📊 Check your dashboard at: https://venue-smart-dashboard.vercel.app');
    
  } catch (error) {
    console.error('Sync failed:', error);
  }
}

syncToastData().catch(console.error);