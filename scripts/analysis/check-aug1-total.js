#!/usr/bin/env node

// Check August 1st total revenue from Toast API

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

async function checkAugust1Total() {
  console.log('📊 Checking August 1st, 2025 Revenue\n');
  console.log('='.repeat(60));

  try {
    // Get Toast token
    const token = await getToastToken();
    console.log('✅ Authenticated with Toast API\n');

    // Fetch all orders for August 1st
    let allOrders = [];
    let page = 1;
    let hasMore = true;

    console.log('Fetching orders from Toast API...');
    while (hasMore && page <= 20) {
      const response = await axios.get(`${TOAST_CONFIG.baseURL}/orders/v2/ordersBulk`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Toast-Restaurant-External-ID': TOAST_CONFIG.restaurantGuid,
        },
        params: {
          businessDate: '20250801', // August 1, 2025
          pageSize: 100,
          page: page,
        },
      });

      const pageOrders = Array.isArray(response.data) ? response.data : [];
      if (pageOrders.length === 0) {
        hasMore = false;
      } else {
        allOrders = allOrders.concat(pageOrders);
        console.log(`  Page ${page}: ${pageOrders.length} orders`);
        page++;
      }
    }

    // Calculate totals
    let totalRevenue = 0;
    let checkCount = 0;
    let orderCount = allOrders.length;

    // Process each order and its checks
    const checkDetails = [];
    allOrders.forEach((order) => {
      if (order.checks && Array.isArray(order.checks)) {
        order.checks.forEach((check) => {
          if (check.totalAmount !== undefined) {
            totalRevenue += check.totalAmount; // Already in dollars
            checkCount++;

            // Store check details for analysis
            checkDetails.push({
              orderGuid: order.guid,
              checkGuid: check.guid,
              amount: check.totalAmount,
              openedDate: check.openedDate || order.openedDate,
              closedDate: check.closedDate,
            });
          }
        });
      }
    });

    // Sort checks by amount to show largest transactions
    checkDetails.sort((a, b) => b.amount - a.amount);

    console.log('\n' + '='.repeat(60));
    console.log('📊 AUGUST 1ST, 2025 REVENUE SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Revenue: $${totalRevenue.toFixed(2)}`);
    console.log(`Total Orders: ${orderCount}`);
    console.log(`Total Checks: ${checkCount}`);
    console.log(
      `Average Check: $${checkCount > 0 ? (totalRevenue / checkCount).toFixed(2) : '0.00'}`,
    );

    if (checkDetails.length > 0) {
      console.log('\nTop 10 Checks:');
      checkDetails.slice(0, 10).forEach((check, idx) => {
        console.log(
          `  ${idx + 1}. $${check.amount.toFixed(2)} - Check ${check.checkGuid.substring(0, 8)}...`,
        );
      });

      // Show revenue by hour
      console.log('\nRevenue by Hour:');
      const hourlyRevenue = {};
      checkDetails.forEach((check) => {
        if (check.openedDate) {
          const hour = new Date(check.openedDate).getHours();
          if (!hourlyRevenue[hour]) hourlyRevenue[hour] = 0;
          hourlyRevenue[hour] += check.amount;
        }
      });

      Object.keys(hourlyRevenue)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .forEach((hour) => {
          const hourStr = `${hour}:00 - ${parseInt(hour) + 1}:00`;
          console.log(`  ${hourStr.padEnd(12)} $${hourlyRevenue[hour].toFixed(2)}`);
        });
    }

    // Also check database
    console.log('\n' + '-'.repeat(60));
    console.log('Database Comparison:');

    const { data: dbChecks } = await supabase
      .from('toast_checks')
      .select('check_guid, total_amount')
      .gte('created_date', '2025-08-01T00:00:00')
      .lte('created_date', '2025-08-01T23:59:59');

    if (dbChecks) {
      const dbTotal = dbChecks.reduce((sum, check) => sum + (check.total_amount || 0), 0);
      console.log(`Database Total: $${dbTotal.toFixed(2)} (${dbChecks.length} checks)`);
      console.log(`Difference: $${(totalRevenue - dbTotal).toFixed(2)}`);
    }
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Run check
checkAugust1Total();
