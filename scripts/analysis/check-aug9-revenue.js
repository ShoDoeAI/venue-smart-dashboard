#!/usr/bin/env node

// Check August 9th, 2025 (Today - Saturday) revenue

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

async function checkAug9Revenue() {
  console.log('📊 Checking Saturday, August 9th, 2025 Revenue\n');
  console.log('='.repeat(60));

  try {
    // First check database
    console.log('1️⃣ Checking database...');

    // Get orders for Aug 9 business date
    const { data: orders } = await supabase
      .from('toast_orders')
      .select('order_guid')
      .eq('business_date', 20250809);

    let dbTotal = 0;
    let dbCheckCount = 0;

    if (orders && orders.length > 0) {
      const orderGuids = orders.map((o) => o.order_guid);

      // Get checks for these orders
      const { data: checks } = await supabase
        .from('toast_checks')
        .select('check_guid, total_amount')
        .in('order_guid', orderGuids);

      if (checks) {
        dbTotal = checks.reduce((sum, c) => sum + c.total_amount, 0);
        dbCheckCount = checks.length;
      }
    }

    console.log(`   Database: ${orders?.length || 0} orders, ${dbCheckCount} checks`);
    console.log(`   Database Total: $${dbTotal.toFixed(2)}\n`);

    // Now check Toast API for real-time data
    console.log('2️⃣ Fetching from Toast API (real-time)...');
    const token = await getToastToken();

    let allOrders = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 20) {
      const response = await axios.get(`${TOAST_CONFIG.baseURL}/orders/v2/ordersBulk`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Toast-Restaurant-External-ID': TOAST_CONFIG.restaurantGuid,
        },
        params: {
          businessDate: '20250809', // August 9, 2025
          pageSize: 100,
          page: page,
        },
      });

      const pageOrders = Array.isArray(response.data) ? response.data : [];
      if (pageOrders.length === 0) {
        hasMore = false;
      } else {
        allOrders = allOrders.concat(pageOrders);
        console.log(`   Page ${page}: ${pageOrders.length} orders`);
        page++;
      }
    }

    // Calculate Toast total
    let toastTotal = 0;
    let toastCheckCount = 0;
    let openChecks = 0;
    let closedChecks = 0;

    allOrders.forEach((order) => {
      if (order.checks && Array.isArray(order.checks)) {
        order.checks.forEach((check) => {
          if (check.totalAmount !== undefined) {
            toastTotal += check.totalAmount; // Already in dollars
            toastCheckCount++;

            if (check.closedDate) {
              closedChecks++;
            } else {
              openChecks++;
            }
          }
        });
      }
    });

    console.log(`   Toast API: ${allOrders.length} orders, ${toastCheckCount} checks`);
    console.log(`   Status: ${openChecks} open, ${closedChecks} closed`);
    console.log(`   Toast API Total: $${toastTotal.toFixed(2)}\n`);

    // Summary
    console.log('='.repeat(60));
    console.log('📊 SATURDAY, AUGUST 9TH, 2025 REVENUE');
    console.log('='.repeat(60));
    console.log(`🍞 Toast Dashboard Total: $${toastTotal.toFixed(2)}`);
    console.log(`💾 Database Total: $${dbTotal.toFixed(2)}`);
    console.log(`📋 Total Checks: ${toastCheckCount} (${openChecks} still open)`);

    const match = Math.abs(toastTotal - dbTotal) < 0.01;
    console.log(`\nSync Status: ${match ? '✅ SYNCED' : '⚠️  NEEDS UPDATE'}`);

    if (!match && toastTotal > dbTotal) {
      const difference = toastTotal - dbTotal;
      console.log(`\n💡 New revenue since last sync: $${difference.toFixed(2)}`);
      console.log(`   This is normal for today's active business`);
      console.log(`   Run sync to update: node api/sync-toast-final.js 2025-08-09 2025-08-09`);
    }

    // Show hourly breakdown if we have data
    if (allOrders.length > 0) {
      console.log("\n📈 Today's Activity:");
      const hourlyRevenue = {};

      allOrders.forEach((order) => {
        if (order.openedDate) {
          const hour = new Date(order.openedDate).getHours();
          const hourKey = `${hour}:00`;
          if (!hourlyRevenue[hourKey]) hourlyRevenue[hourKey] = 0;

          if (order.checks) {
            order.checks.forEach((check) => {
              if (check.totalAmount) {
                hourlyRevenue[hourKey] += check.totalAmount;
              }
            });
          }
        }
      });

      Object.entries(hourlyRevenue)
        .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
        .forEach(([hour, revenue]) => {
          if (revenue > 0) {
            console.log(`   ${hour.padStart(5)} - $${revenue.toFixed(2)}`);
          }
        });
    }
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Run check
checkAug9Revenue();
