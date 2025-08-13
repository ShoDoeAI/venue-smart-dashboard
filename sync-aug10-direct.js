#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Get Toast token
async function getToastToken() {
  console.log('Getting Toast access token...');

  try {
    const response = await axios.post(
      'https://ws-api.toasttab.com/authentication/v1/authentication/login',
      {
        clientId: process.env.TOAST_CLIENT_ID,
        clientSecret: process.env.TOAST_CLIENT_SECRET,
        userAccessType: 'TOAST_MACHINE_CLIENT',
      },
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );

    if (response.data?.token?.accessToken) {
      console.log('✅ Got Toast token');
      return response.data.token.accessToken;
    }
  } catch (error) {
    console.error('❌ Toast auth error:', error.response?.data || error.message);
    throw error;
  }
}

async function syncAug10Direct() {
  console.log('🔄 DIRECT SYNC FOR AUGUST 10, 2025\n');
  console.log('='.repeat(80));
  console.log('This will fetch ALL orders to match Toast dashboard exactly.\n');

  try {
    // Get Toast token
    const token = await getToastToken();

    // Clear any existing data for Aug 10
    console.log('Clearing old data...');
    await supabase.from('toast_orders').delete().eq('business_date', 20250810);

    // Fetch ALL orders from Toast
    const businessDate = '20250810';
    let allOrders = [];
    let page = 1;
    let totalRevenue = 0;
    let totalChecks = 0;

    console.log(`\nFetching orders for business date ${businessDate}...`);

    while (true) {
      console.log(`\nFetching page ${page}...`);

      const url = `https://ws-api.toasttab.com/orders/v2/ordersBulk?businessDate=${businessDate}&page=${page}&pageSize=100`;

      try {
        const response = await axios.get(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Toast-Restaurant-External-ID': process.env.TOAST_LOCATION_ID,
          },
          timeout: 30000,
        });

        const orders = response.data || [];
        console.log(`  Found ${orders.length} orders on page ${page}`);

        if (!orders || orders.length === 0) {
          console.log('  No more orders found.');
          break;
        }

        // Process each order
        for (const order of orders) {
          // Save order
          const { error: orderError } = await supabase.from('toast_orders').insert({
            order_guid: order.guid,
            business_date: 20250810,
            created_date: order.createdDate || order.openedDate,
            order_data: order,
          });

          if (orderError) {
            console.log(`  ⚠️  Error saving order ${order.guid}:`, orderError.message);
          }

          // Process checks
          if (order.checks && Array.isArray(order.checks)) {
            for (const check of order.checks) {
              if (!check.deleted && check.guid) {
                totalChecks++;

                const checkAmount = check.totalAmount || 0;
                if (!check.voided) {
                  totalRevenue += checkAmount;
                }

                // Save check
                const { error: checkError } = await supabase.from('toast_checks').upsert(
                  {
                    check_guid: check.guid,
                    order_guid: order.guid,
                    total_amount: checkAmount,
                    closed_at: check.closedDate,
                    voided: check.voided || false,
                    check_data: check,
                  },
                  { onConflict: 'check_guid' },
                );

                if (checkError) {
                  console.log(`  ⚠️  Error saving check ${check.guid}:`, checkError.message);
                }
              }
            }
          }
        }

        allOrders = allOrders.concat(orders);

        // Continue if we got a full page
        if (orders.length === 100) {
          page++;
        } else {
          console.log('\nReached end of data.');
          break;
        }
      } catch (error) {
        console.log(`\n❌ Error on page ${page}:`, error.message);
        if (error.response?.status === 401) {
          console.log('Toast token expired. Need fresh token.');
        }
        break;
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 SYNC COMPLETE - AUGUST 10, 2025');
    console.log('='.repeat(80));
    console.log(`Total Pages Processed: ${page - 1}`);
    console.log(`Total Orders: ${allOrders.length}`);
    console.log(`Total Checks: ${totalChecks}`);
    console.log(`Total Revenue: $${totalRevenue.toFixed(2)}`);
    console.log('='.repeat(80));

    // Verify in database
    console.log('\nVerifying database...');
    const { count: dbOrders } = await supabase
      .from('toast_orders')
      .select('*', { count: 'exact', head: true })
      .eq('business_date', 20250810);

    console.log(`Orders in database: ${dbOrders}`);

    if (allOrders.length > 100) {
      console.log('\n✅ SUCCESS! Now have complete data for August 10.');
      console.log('The AI will now report accurate revenue matching Toast dashboard.');
    } else if (allOrders.length === 0) {
      console.log('\n❌ No orders found. Please check:');
      console.log('1. Toast credentials are correct');
      console.log('2. Restaurant ID is correct');
      console.log('3. Business date format is correct');
      console.log('4. There is actually data for this date in Toast');
    }
  } catch (error) {
    console.log('\n❌ Sync failed:', error.message);
  }
}

syncAug10Direct().catch(console.error);
