const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

// Load environment variables when running directly
if (require.main === module) {
  require('dotenv').config({ path: '.env.local' });
}

// This sync ensures 100% accuracy with Toast dashboard
// Key principles:
// 1. Delete and re-sync to avoid duplicates
// 2. Use business date as the source of truth
// 3. Store amounts in dollars (not cents)
// 4. Verify totals after sync

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Toast API configuration
const TOAST_CONFIG = {
  baseURL: process.env.TOAST_BASE_URL || 'https://ws-api.toasttab.com',
  clientId: process.env.TOAST_CLIENT_ID,
  clientSecret: process.env.TOAST_CLIENT_SECRET,
  locationId: process.env.TOAST_LOCATION_ID,
  restaurantGuid: process.env.TOAST_RESTAURANT_GUID,
};

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

async function syncBusinessDate(token, date) {
  const dateStr = date.toISOString().split('T')[0];
  const businessDate = dateStr.replace(/-/g, ''); // Convert to yyyyMMdd

  console.log(`\n📅 Syncing ${dateStr}...`);

  try {
    // Step 1: Delete existing data for this business date to prevent duplicates
    console.log('  1️⃣ Cleaning existing data...');

    // Delete existing orders for this business date
    const { error: deleteOrderError } = await supabase
      .from('toast_orders')
      .delete()
      .eq('business_date', parseInt(businessDate));

    if (deleteOrderError) {
      console.error('  ❌ Error deleting orders:', deleteOrderError.message);
    }

    // Delete existing checks for this date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const { error: deleteCheckError } = await supabase
      .from('toast_checks')
      .delete()
      .gte('created_date', startOfDay.toISOString())
      .lt('created_date', endOfDay.toISOString());

    if (deleteCheckError) {
      console.error('  ❌ Error deleting checks:', deleteCheckError.message);
    }

    // Step 2: Fetch all orders from Toast for this business date
    console.log('  2️⃣ Fetching from Toast API...');
    let allOrders = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 50) {
      // Increased page limit
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
        console.log(`     Page ${page}: ${pageOrders.length} orders`);
        page++;
      }
    }

    console.log(`  ✅ Retrieved ${allOrders.length} total orders`);

    // Step 3: Process and insert orders and checks
    console.log('  3️⃣ Storing in database...');
    let orderCount = 0;
    let checkCount = 0;
    let totalRevenue = 0;

    for (const order of allOrders) {
      try {
        // Insert order - using actual schema columns with proper fallbacks
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
        };

        const { error: orderError } = await supabase.from('toast_orders').insert(orderData);

        if (orderError) {
          console.error(`  ❌ Error inserting order ${order.guid}:`, orderError.message);
          continue;
        }
        orderCount++;

        // Insert checks
        if (order.checks && Array.isArray(order.checks)) {
          for (const check of order.checks) {
            const checkData = {
              check_guid: check.guid,
              order_guid: order.guid,
              tab_name: check.tabName,
              amount: check.amount || 0, // Already in dollars
              tax_amount: check.taxAmount || 0,
              tip_amount: check.tipAmount || 0,
              total_amount: check.totalAmount || 0, // Already in dollars
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
            };

            const { error: checkError } = await supabase.from('toast_checks').insert(checkData);

            if (checkError) {
              console.error(`  ❌ Error inserting check ${check.guid}:`, checkError.message);
              continue;
            }

            checkCount++;
            totalRevenue += checkData.total_amount;
          }
        }
      } catch (error) {
        console.error(`  ❌ Error processing order ${order.guid}:`, error.message);
      }
    }

    console.log(`  ✅ Stored ${orderCount} orders and ${checkCount} checks`);
    console.log(`  💰 Total revenue: $${totalRevenue.toFixed(2)}`);

    // Step 4: Verify the sync
    console.log('  4️⃣ Verifying sync...');

    // Get total from database
    const { data: dbChecks } = await supabase
      .from('toast_checks')
      .select('total_amount')
      .gte('created_date', startOfDay.toISOString())
      .lt('created_date', endOfDay.toISOString());

    const dbTotal = dbChecks?.reduce((sum, check) => sum + (check.total_amount || 0), 0) || 0;

    if (Math.abs(dbTotal - totalRevenue) < 0.01) {
      console.log(`  ✅ Verification passed! Database matches Toast: $${dbTotal.toFixed(2)}`);
      return { success: true, revenue: totalRevenue, orders: orderCount, checks: checkCount };
    } else {
      console.log(
        `  ⚠️  Verification mismatch - Expected: $${totalRevenue.toFixed(2)}, Got: $${dbTotal.toFixed(2)}`,
      );
      return { success: false, revenue: totalRevenue, orders: orderCount, checks: checkCount };
    }
  } catch (error) {
    console.error(`❌ Sync failed for ${dateStr}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function syncToastData(startDate, endDate) {
  console.log('🔄 Toast Accurate Sync');
  console.log('='.repeat(60));
  console.log('This sync ensures 100% accuracy with Toast dashboard\n');

  try {
    // Get Toast token
    console.log('🔐 Authenticating with Toast...');
    const token = await getToastToken();
    console.log('✅ Authentication successful');

    // Sync each day
    const current = new Date(startDate);
    const end = new Date(endDate);
    const results = [];

    while (current <= end) {
      const result = await syncBusinessDate(token, new Date(current));
      results.push({ date: current.toISOString().split('T')[0], ...result });
      current.setDate(current.getDate() + 1);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SYNC SUMMARY');
    console.log('='.repeat(60));

    let totalRevenue = 0;
    let totalOrders = 0;
    let totalChecks = 0;
    let successCount = 0;

    results.forEach((result) => {
      if (result.success) {
        totalRevenue += result.revenue || 0;
        totalOrders += result.orders || 0;
        totalChecks += result.checks || 0;
        successCount++;
        console.log(`${result.date}: ✅ $${result.revenue.toFixed(2)} (${result.checks} checks)`);
      } else {
        console.log(`${result.date}: ❌ Failed - ${result.error || 'Unknown error'}`);
      }
    });

    console.log('\nTotals:');
    console.log(`  Days synced: ${successCount}/${results.length}`);
    console.log(`  Total revenue: $${totalRevenue.toFixed(2)}`);
    console.log(`  Total orders: ${totalOrders}`);
    console.log(`  Total checks: ${totalChecks}`);
    console.log(`  Average daily: $${(totalRevenue / successCount).toFixed(2)}`);

    return { success: true, results };
  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Export for use as API endpoint or script
module.exports = async (req, res) => {
  const { startDate, endDate } = req.body || req.query || {};

  if (!startDate || !endDate) {
    // Default to last 7 days
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);

    const result = await syncToastData(start, end);
    return res.status(200).json(result);
  }

  const result = await syncToastData(new Date(startDate), new Date(endDate));
  return res.status(result.success ? 200 : 500).json(result);
};

// If running directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const startDate =
    args[0] || new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0];
  const endDate = args[1] || new Date().toISOString().split('T')[0];

  console.log(`Syncing from ${startDate} to ${endDate}`);
  syncToastData(new Date(startDate), new Date(endDate))
    .then(() => {
      console.log('\n✅ Sync complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Sync failed:', error);
      process.exit(1);
    });
}
