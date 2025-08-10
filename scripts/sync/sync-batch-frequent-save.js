#!/usr/bin/env node

// Modified batch sync that saves progress more frequently

const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
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

const PROGRESS_FILE = path.join(__dirname, '.sync-progress.json');

// Load progress
function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    }
  } catch (error) {
    console.log('Could not load progress file');
  }

  const endDate = new Date();
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 2);

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    currentDate: startDate.toISOString(),
    completed: [],
    totalRevenue: 0,
    totalOrders: 0,
    totalChecks: 0,
    failedDates: [],
  };
}

// Save progress
function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

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
async function syncDay(token, date, progress) {
  const dateStr = date.toISOString().split('T')[0];
  const businessDate = dateStr.replace(/-/g, '');

  // Skip if already completed
  if (progress.completed.includes(dateStr)) {
    return { date: dateStr, skipped: true };
  }

  try {
    // Delete existing data
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

// Main batch function
async function runBatch() {
  console.log('🔄 Frequent-Save Batch Sync');
  console.log('='.repeat(60));

  const progress = loadProgress();
  const startDate = new Date(progress.startDate);
  const endDate = new Date(progress.endDate);
  const currentDate = new Date(progress.currentDate);

  const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  const completedDays = progress.completed.length;

  console.log(
    `📊 Progress: ${completedDays}/${totalDays} days (${((completedDays / totalDays) * 100).toFixed(1)}%)`,
  );
  console.log(`💰 Synced so far: $${progress.totalRevenue.toFixed(2)}\n`);

  try {
    // Get Toast token
    console.log('🔐 Authenticating with Toast...');
    const token = await getToastToken();
    console.log('✅ Authentication successful\n');

    // Process 10 days max per batch
    let daysProcessed = 0;
    const maxDaysPerBatch = 10;

    while (currentDate <= endDate && daysProcessed < maxDaysPerBatch) {
      const dateStr = currentDate.toISOString().split('T')[0];

      if (!progress.completed.includes(dateStr)) {
        const result = await syncDay(token, new Date(currentDate), progress);

        if (!result.skipped) {
          if (result.success) {
            progress.completed.push(result.date);
            progress.totalRevenue += result.revenue;
            progress.totalOrders += result.orders;
            progress.totalChecks += result.checks;

            if (result.orders > 0) {
              console.log(
                `✅ ${result.date}: ${result.orders} orders, ${result.checks} checks, $${result.revenue.toFixed(2)}`,
              );
            }

            // Save after EVERY successful day
            progress.currentDate = currentDate.toISOString();
            saveProgress(progress);
            daysProcessed++;
          } else {
            progress.failedDates.push({ date: result.date, error: result.error });
            console.log(`❌ ${result.date}: ${result.error}`);
          }
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Final save
    progress.currentDate = currentDate.toISOString();
    saveProgress(progress);

    // Summary
    const newCompleted = progress.completed.length;
    console.log(`\n✅ Batch complete! Processed ${daysProcessed} days`);
    console.log(
      `📊 Overall progress: ${newCompleted}/${totalDays} days (${((newCompleted / totalDays) * 100).toFixed(1)}%)`,
    );
    console.log(`💰 Total revenue: $${progress.totalRevenue.toFixed(2)}`);

    if (newCompleted < totalDays) {
      console.log('\nRun this script again to continue syncing');
    } else {
      console.log('\n🎉 Sync complete!');
      fs.unlinkSync(PROGRESS_FILE);
    }
  } catch (error) {
    console.error('\n❌ Batch failed:', error.message);
    saveProgress(progress);
  }
}

// Run the batch
runBatch();
