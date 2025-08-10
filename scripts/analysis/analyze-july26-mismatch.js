#!/usr/bin/env node

// Analyze the July 26th revenue mismatch in detail

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

async function analyzeJuly26() {
  console.log('🔍 Analyzing July 26, 2025 Revenue Mismatch\n');
  console.log('='.repeat(60));

  const targetDate = '2025-07-26';

  try {
    // 1. Get all checks from database for this date
    const startDate = new Date(targetDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(targetDate);
    endDate.setHours(23, 59, 59, 999);

    const { data: dbChecks } = await supabase
      .from('toast_checks')
      .select('check_guid, total_amount, created_date, order_guid')
      .gte('created_date', startDate.toISOString())
      .lte('created_date', endDate.toISOString())
      .order('total_amount', { ascending: false });

    console.log(`\n📊 Database Analysis:`);
    console.log(`Found ${dbChecks?.length || 0} checks in database`);

    if (dbChecks && dbChecks.length > 0) {
      const dbTotal = dbChecks.reduce((sum, check) => sum + (check.total_amount || 0), 0);
      console.log(`Total revenue: $${dbTotal.toFixed(2)}`);

      // Show top 5 checks
      console.log(`\nTop 5 checks by amount:`);
      dbChecks.slice(0, 5).forEach((check) => {
        console.log(`  - ${check.check_guid}: $${check.total_amount.toFixed(2)}`);
      });

      // Check for duplicates
      const checkGuids = dbChecks.map((c) => c.check_guid);
      const uniqueGuids = [...new Set(checkGuids)];
      if (checkGuids.length !== uniqueGuids.length) {
        console.log(`\n⚠️  Found ${checkGuids.length - uniqueGuids.length} duplicate check GUIDs!`);
      }
    }

    // 2. Get data from Toast API
    console.log(`\n\n📊 Toast API Analysis:`);
    const token = await getToastToken();

    let allOrders = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 20) {
      try {
        console.log(`  Fetching page ${page}...`);
        const response = await axios.get(`${TOAST_CONFIG.baseURL}/orders/v2/ordersBulk`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Toast-Restaurant-External-ID': TOAST_CONFIG.restaurantGuid,
          },
          params: {
            businessDate: '20250726',
            pageSize: 100,
            page: page,
          },
        });

        // Debug response
        if (page === 1) {
          console.log(`  Response status: ${response.status}`);
          console.log(
            `  Response data type: ${Array.isArray(response.data) ? 'array' : typeof response.data}`,
          );
          if (!Array.isArray(response.data) && response.data) {
            console.log(`  Response structure:`, Object.keys(response.data));
          }
        }

        const pageOrders = Array.isArray(response.data) ? response.data : [];
        if (pageOrders.length === 0) {
          hasMore = false;
          console.log(`  No more orders found`);
        } else {
          allOrders = allOrders.concat(pageOrders);
          console.log(`  Page ${page}: ${pageOrders.length} orders`);
          page++;
        }
      } catch (error) {
        console.error(`  Error on page ${page}:`, error.response?.data || error.message);
        hasMore = false;
      }
    }

    // Extract all checks from orders
    const toastChecks = [];
    allOrders.forEach((order) => {
      if (order.checks && Array.isArray(order.checks)) {
        order.checks.forEach((check) => {
          toastChecks.push({
            checkGuid: check.guid,
            orderGuid: order.guid,
            totalAmount: check.totalAmount || 0,
            openedDate: check.openedDate,
          });
        });
      }
    });

    const toastTotal = toastChecks.reduce((sum, check) => sum + check.totalAmount, 0);
    console.log(`\nFound ${toastChecks.length} checks in Toast API`);
    console.log(`Total revenue: $${toastTotal.toFixed(2)}`);

    // Show top 5 checks
    console.log(`\nTop 5 checks by amount:`);
    toastChecks
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 5)
      .forEach((check) => {
        console.log(`  - ${check.checkGuid}: $${check.totalAmount.toFixed(2)}`);
      });

    // 3. Compare the data
    console.log(`\n\n📊 Comparison:`);
    console.log(
      `Database: ${dbChecks?.length || 0} checks, $${dbChecks?.reduce((sum, c) => sum + c.total_amount, 0).toFixed(2) || '0.00'}`,
    );
    console.log(`Toast API: ${toastChecks.length} checks, $${toastTotal.toFixed(2)}`);
    console.log(
      `Difference: ${(dbChecks?.length || 0) - toastChecks.length} checks, $${((dbChecks?.reduce((sum, c) => sum + c.total_amount, 0) || 0) - toastTotal).toFixed(2)}`,
    );

    // Find missing checks
    if (dbChecks && toastChecks.length > 0) {
      const toastCheckGuids = new Set(toastChecks.map((c) => c.checkGuid));
      const dbCheckGuids = new Set(dbChecks.map((c) => c.check_guid));

      const inDbNotInToast = [...dbCheckGuids].filter((guid) => !toastCheckGuids.has(guid));
      const inToastNotInDb = [...toastCheckGuids].filter((guid) => !dbCheckGuids.has(guid));

      console.log(`\nChecks in DB but not in Toast API: ${inDbNotInToast.length}`);
      if (inDbNotInToast.length > 0 && inDbNotInToast.length <= 10) {
        inDbNotInToast.forEach((guid) => {
          const check = dbChecks.find((c) => c.check_guid === guid);
          console.log(`  - ${guid}: $${check?.total_amount.toFixed(2)}`);
        });
      }

      console.log(`\nChecks in Toast API but not in DB: ${inToastNotInDb.length}`);
      if (inToastNotInDb.length > 0 && inToastNotInDb.length <= 10) {
        inToastNotInDb.forEach((guid) => {
          const check = toastChecks.find((c) => c.checkGuid === guid);
          console.log(`  - ${guid}: $${check?.totalAmount.toFixed(2)}`);
        });
      }
    }
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
  }
}

// Run analysis
analyzeJuly26();
