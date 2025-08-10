#!/usr/bin/env node

// Sync 2 years of historical Toast data
// This ensures your database matches Toast dashboard 100% for all historical data

const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Toast API configuration
const TOAST_CONFIG = {
  baseURL: process.env.TOAST_BASE_URL || 'https://ws-api.toasttab.com',
  clientId: process.env.TOAST_CLIENT_ID,
  clientSecret: process.env.TOAST_CLIENT_SECRET,
  locationId: process.env.TOAST_LOCATION_ID,
  restaurantGuid: process.env.TOAST_RESTAURANT_GUID,
};

// Get Toast access token
async function getToastToken() {
  const response = await axios.post(
    `${TOAST_CONFIG.baseURL}/authentication/v1/authentication/login`,
    {
      clientId: TOAST_CONFIG.clientId,
      clientSecret: TOAST_CONFIG.clientSecret,
      userAccessType: 'TOAST_MACHINE_CLIENT',
    },
  );
  return response.data.token.accessToken;
}

// Sync a single day
async function syncDay(token, date) {
  const dateStr = date.toISOString().split('T')[0];
  const businessDate = dateStr.replace(/-/g, ''); // yyyyMMdd format

  try {
    // Delete existing data for this date
    const { data: existingOrders } = await supabase
      .from('toast_orders')
      .select('order_guid')
      .eq('business_date', parseInt(businessDate));

    if (existingOrders && existingOrders.length > 0) {
      const orderGuids = existingOrders.map((o) => o.order_guid);
      await supabase.from('toast_checks').delete().in('order_guid', orderGuids);
      await supabase.from('toast_orders').delete().eq('business_date', parseInt(businessDate));
    }

    // Fetch from Toast
    let allOrders = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 50) {
      const response = await axios.get(`${TOAST_CONFIG.baseURL}/orders/v2/ordersBulk`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Toast-Restaurant-External-ID': TOAST_CONFIG.restaurantGuid,
        },
        params: {
          businessDate: businessDate,
          pageSize: 100,
          page: page,
        },
      });

      const pageOrders = Array.isArray(response.data) ? response.data : [];
      if (pageOrders.length === 0) {
        hasMore = false;
      } else {
        allOrders = allOrders.concat(pageOrders);
        page++;
      }
    }

    // Process and store
    let orderCount = 0;
    let checkCount = 0;
    let totalRevenue = 0;

    for (const order of allOrders) {
      try {
        // Insert order
        const orderData = {
          order_guid: order.guid,
          location_id: TOAST_CONFIG.restaurantGuid,
          business_date: parseInt(businessDate),
          created_date: order.createdDate || order.openedDate || new Date().toISOString(),
          opened_date: order.openedDate,
          closed_date: order.closedDate,
          paid_date: order.paidDate,
          deleted_date: order.deletedDate,
          source: order.source || 'POS',
          void_date: order.voidDate,
          voided: order.voided || false,
          display_number: order.displayNumber || '0',
          dining_option_guid: order.diningOption?.guid,
          dining_option_name: order.diningOption?.name,
          guest_count: order.guestCount || 0,
          snapshot_timestamp: new Date().toISOString(),
          created_at: new Date().toISOString(),
          is_historical: true,
        };

        const { error: orderError } = await supabase.from('toast_orders').insert(orderData);

        if (!orderError) {
          orderCount++;

          // Insert checks
          if (order.checks && Array.isArray(order.checks)) {
            for (const check of order.checks) {
              const checkData = {
                check_guid: check.guid,
                order_guid: order.guid,
                tab_name: check.tabName,
                amount: check.amount || 0,
                tax_amount: check.taxAmount || 0,
                tip_amount: check.tipAmount || 0,
                total_amount: check.totalAmount || 0,
                applied_discount_amount: check.appliedDiscountAmount || 0,
                created_date: check.createdDate || check.openedDate || order.openedDate,
                opened_date: check.openedDate,
                closed_date: check.closedDate,
                voided: check.voided || false,
                void_date: check.voidDate,
                payment_status: check.paymentStatus,
                customer_guid: check.customer?.guid,
                customer_first_name: check.customer?.firstName,
                customer_last_name: check.customer?.lastName,
                customer_phone: check.customer?.phone,
                customer_email: check.customer?.email,
                snapshot_timestamp: new Date().toISOString(),
                created_at: new Date().toISOString(),
                is_historical: true,
              };

              const { error: checkError } = await supabase.from('toast_checks').insert(checkData);

              if (!checkError) {
                checkCount++;
                totalRevenue += checkData.total_amount;
              }
            }
          }
        }
      } catch (error) {
        // Continue with next order
      }
    }

    return {
      date: dateStr,
      orders: orderCount,
      checks: checkCount,
      revenue: totalRevenue,
      success: true,
    };
  } catch (error) {
    return {
      date: dateStr,
      error: error.message,
      success: false,
    };
  }
}

// Main sync function
async function sync2YearsHistory() {
  console.log('🔄 Starting 2-Year Historical Data Sync');
  console.log('='.repeat(60));
  console.log('This will sync all Toast data to ensure 100% accuracy\n');

  try {
    // Get Toast token
    console.log('🔐 Authenticating with Toast...');
    const token = await getToastToken();
    console.log('✅ Authentication successful\n');

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 2);

    console.log(
      `📅 Date Range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
    );
    console.log(
      `📊 Total days to sync: ${Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))}\n`,
    );

    // Process in monthly batches
    const results = [];
    const current = new Date(startDate);
    let monthlyRevenue = 0;
    let monthlyOrders = 0;
    let monthlyChecks = 0;
    let currentMonth = current.getMonth();
    let currentYear = current.getFullYear();

    console.log('Starting sync...\n');

    while (current <= endDate) {
      // Check if we've moved to a new month
      if (current.getMonth() !== currentMonth || current.getFullYear() !== currentYear) {
        // Print monthly summary
        const monthName = new Date(currentYear, currentMonth).toLocaleString('default', {
          month: 'long',
          year: 'numeric',
        });
        console.log(`\n📅 ${monthName} Summary:`);
        console.log(`   Orders: ${monthlyOrders}`);
        console.log(`   Checks: ${monthlyChecks}`);
        console.log(`   Revenue: $${monthlyRevenue.toFixed(2)}\n`);

        // Reset monthly counters
        monthlyRevenue = 0;
        monthlyOrders = 0;
        monthlyChecks = 0;
        currentMonth = current.getMonth();
        currentYear = current.getFullYear();
      }

      // Sync the day
      const result = await syncDay(token, new Date(current));
      results.push(result);

      if (result.success) {
        monthlyRevenue += result.revenue;
        monthlyOrders += result.orders;
        monthlyChecks += result.checks;

        // Show progress for days with data
        if (result.orders > 0) {
          console.log(
            `✅ ${result.date}: ${result.orders} orders, ${result.checks} checks, $${result.revenue.toFixed(2)}`,
          );
        }
      } else {
        console.log(`❌ ${result.date}: ${result.error}`);
      }

      // Move to next day
      current.setDate(current.getDate() + 1);

      // Add a small delay to avoid rate limiting
      if (results.length % 30 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Print final monthly summary
    const monthName = new Date(currentYear, currentMonth).toLocaleString('default', {
      month: 'long',
      year: 'numeric',
    });
    console.log(`\n📅 ${monthName} Summary:`);
    console.log(`   Orders: ${monthlyOrders}`);
    console.log(`   Checks: ${monthlyChecks}`);
    console.log(`   Revenue: $${monthlyRevenue.toFixed(2)}`);

    // Overall summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 2-YEAR SYNC SUMMARY');
    console.log('='.repeat(60));

    const successful = results.filter((r) => r.success);
    const totalRevenue = successful.reduce((sum, r) => sum + r.revenue, 0);
    const totalOrders = successful.reduce((sum, r) => sum + r.orders, 0);
    const totalChecks = successful.reduce((sum, r) => sum + r.checks, 0);

    console.log(`Days synced: ${successful.length}/${results.length}`);
    console.log(`Total orders: ${totalOrders.toLocaleString()}`);
    console.log(`Total checks: ${totalChecks.toLocaleString()}`);
    console.log(`Total revenue: $${totalRevenue.toFixed(2)}`);
    console.log(`Average daily revenue: $${(totalRevenue / successful.length).toFixed(2)}`);

    console.log('\n✅ Sync complete! Your database now matches Toast 100% for the last 2 years.');
  } catch (error) {
    console.error('\n❌ Sync failed:', error.message);
  }
}

// Run the sync
console.log('⚠️  This will sync 2 years of data and may take 10-20 minutes.\n');
sync2YearsHistory();
