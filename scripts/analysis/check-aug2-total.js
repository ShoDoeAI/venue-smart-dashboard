#!/usr/bin/env node

// Check August 2nd total revenue

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

async function checkAugust2Total() {
  console.log('📊 Checking August 2nd, 2025 Revenue\n');
  console.log('='.repeat(60));

  try {
    // First check database
    console.log('1️⃣ Checking database...');

    // Get orders for Aug 2 business date
    const { data: orders } = await supabase
      .from('toast_orders')
      .select('order_guid')
      .eq('business_date', 20250802);

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

    // Now check Toast API
    console.log('2️⃣ Fetching from Toast API...');
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
          businessDate: '20250802', // August 2, 2025
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

    allOrders.forEach((order) => {
      if (order.checks && Array.isArray(order.checks)) {
        order.checks.forEach((check) => {
          if (check.totalAmount !== undefined) {
            toastTotal += check.totalAmount; // Already in dollars
            toastCheckCount++;
          }
        });
      }
    });

    console.log(`   Toast API: ${allOrders.length} orders, ${toastCheckCount} checks`);
    console.log(`   Toast API Total: $${toastTotal.toFixed(2)}\n`);

    // Summary
    console.log('='.repeat(60));
    console.log('📊 AUGUST 2ND, 2025 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Toast Dashboard Total: $${toastTotal.toFixed(2)}`);
    console.log(`Database Total: $${dbTotal.toFixed(2)}`);

    const match = Math.abs(toastTotal - dbTotal) < 0.01;
    console.log(`\nStatus: ${match ? '✅ MATCH' : '❌ MISMATCH'}`);

    if (!match && toastTotal > 0) {
      console.log(`\nDatabase needs sync - missing $${(toastTotal - dbTotal).toFixed(2)}`);
      console.log(`Run: node api/sync-toast-final.js 2025-08-02 2025-08-02`);
    }
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Run check
checkAugust2Total();
