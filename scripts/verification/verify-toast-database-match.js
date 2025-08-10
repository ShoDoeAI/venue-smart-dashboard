#!/usr/bin/env node

// Verify Toast dashboard revenue matches our database
// Based on the working revenue-by-date.js endpoint

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
  try {
    const response = await axios.post(
      `${TOAST_CONFIG.baseURL}/authentication/v1/authentication/login`,
      {
        clientId: TOAST_CONFIG.clientId,
        clientSecret: TOAST_CONFIG.clientSecret,
        userAccessType: 'TOAST_MACHINE_CLIENT',
      },
    );
    return response.data.token.accessToken;
  } catch (error) {
    console.error('❌ Failed to get Toast token:', error.response?.data || error.message);
    throw error;
  }
}

// Get revenue from database (matching revenue-by-date.js logic)
async function getDatabaseRevenue(date) {
  // Create date range for the day
  const startDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);

  // Get checks from that date based on created_date
  const { data: checksByCreated, error: createdError } = await supabase
    .from('toast_checks')
    .select('check_guid, total_amount, created_date, closed_date')
    .gte('created_date', startDate.toISOString())
    .lte('created_date', endDate.toISOString());

  // Also check by closed_date (when payment was actually processed)
  const { data: checksByClosed, error: closedError } = await supabase
    .from('toast_checks')
    .select('check_guid, total_amount, created_date, closed_date')
    .gte('closed_date', startDate.toISOString())
    .lte('closed_date', endDate.toISOString());

  // Also check by business_date in orders
  const businessDate = parseInt(date.replace(/-/g, ''));
  const { data: ordersByBusinessDate } = await supabase
    .from('toast_orders')
    .select('order_guid, business_date')
    .eq('business_date', businessDate);

  // Get checks for those orders
  let checksByBusinessDate = [];
  if (ordersByBusinessDate && ordersByBusinessDate.length > 0) {
    const orderGuids = ordersByBusinessDate.map((o) => o.order_guid);
    const { data } = await supabase
      .from('toast_checks')
      .select('check_guid, total_amount, created_date, closed_date, order_guid')
      .in('order_guid', orderGuids);
    checksByBusinessDate = data || [];
  }

  // Calculate revenues (amounts are already in dollars)
  const revenueByCreated = (checksByCreated || []).reduce(
    (sum, check) => sum + (check.total_amount || 0),
    0,
  );
  const revenueByClosed = (checksByClosed || []).reduce(
    (sum, check) => sum + (check.total_amount || 0),
    0,
  );
  const revenueByBusinessDate = checksByBusinessDate.reduce(
    (sum, check) => sum + (check.total_amount || 0),
    0,
  );

  return {
    byCreatedDate: revenueByCreated,
    byClosedDate: revenueByClosed,
    byBusinessDate: revenueByBusinessDate,
    checkCounts: {
      created: checksByCreated?.length || 0,
      closed: checksByClosed?.length || 0,
      business: checksByBusinessDate.length,
    },
  };
}

// Get revenue from Toast API with pagination
async function getToastRevenue(token, date) {
  // Convert date to Toast format (yyyyMMdd)
  const dateObj = new Date(date);
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const businessDate = `${year}${month}${day}`;

  try {
    let allOrders = [];
    let page = 1;
    let hasMore = true;

    // Fetch all pages
    while (hasMore && page <= 20) {
      // Limit to 20 pages for safety
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

    // Calculate total from checks - Toast returns amounts in DOLLARS
    let totalRevenue = 0;
    let checkCount = 0;

    allOrders.forEach((order) => {
      if (order.checks && Array.isArray(order.checks)) {
        order.checks.forEach((check) => {
          if (check.totalAmount !== undefined) {
            totalRevenue += check.totalAmount; // Already in dollars
            checkCount++;
          }
        });
      }
    });

    return {
      revenue: totalRevenue,
      orderCount: allOrders.length,
      checkCount: checkCount,
      pagesRetrieved: page - 1,
    };
  } catch (error) {
    console.error('❌ Error fetching Toast data:', error.response?.data || error.message);
    throw error;
  }
}

async function verifyRevenue() {
  console.log('🔍 Verifying Toast Revenue vs Database\n');
  console.log('='.repeat(60));

  try {
    // Get Toast token
    console.log('🔐 Authenticating with Toast API...');
    const token = await getToastToken();
    console.log('✅ Authentication successful\n');

    // Test dates
    const testDates = ['2025-08-01', '2025-07-27', '2025-07-26', '2025-07-25'];

    console.log('Date       | Toast API  | DB (created) | DB (closed) | DB (business) | Match?');
    console.log('-'.repeat(80));

    for (const date of testDates) {
      try {
        // Get data from both sources
        const toastData = await getToastRevenue(token, date);
        const dbData = await getDatabaseRevenue(date);

        // Check which database method matches Toast
        const createdMatch = Math.abs(toastData.revenue - dbData.byCreatedDate) < 0.01;
        const closedMatch = Math.abs(toastData.revenue - dbData.byClosedDate) < 0.01;
        const businessMatch = Math.abs(toastData.revenue - dbData.byBusinessDate) < 0.01;

        const anyMatch = createdMatch || closedMatch || businessMatch;

        console.log(
          `${date} | $${toastData.revenue.toFixed(2).padStart(9)} | $${dbData.byCreatedDate.toFixed(2).padStart(11)} | $${dbData.byClosedDate.toFixed(2).padStart(10)} | $${dbData.byBusinessDate.toFixed(2).padStart(13)} | ${anyMatch ? '✅' : '❌'}`,
        );

        // Show additional details
        if (!anyMatch || toastData.pagesRetrieved > 1) {
          console.log(
            `         Toast: ${toastData.checkCount} checks, ${toastData.orderCount} orders (${toastData.pagesRetrieved} pages) | DB: ${dbData.checkCounts.created}/${dbData.checkCounts.closed}/${dbData.checkCounts.business} checks`,
          );
        }
      } catch (error) {
        console.log(`${date} | Error      | Error        | Error       | Error         | ❌`);
      }
    }

    console.log('\n📊 Summary:');
    console.log('- Toast API returns amounts in dollars (not cents)');
    console.log('- Database stores amounts in dollars');
    console.log('- Business date method typically matches Toast dashboard\n');

    // Check last sync
    const { data: lastOrder } = await supabase
      .from('toast_orders')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1);

    if (lastOrder && lastOrder.length > 0) {
      const lastSyncDate = new Date(lastOrder[0].created_at);
      const hoursSinceSync = (Date.now() - lastSyncDate.getTime()) / (1000 * 60 * 60);
      console.log(
        `⏰ Last sync: ${lastSyncDate.toLocaleString()} (${hoursSinceSync.toFixed(1)} hours ago)`,
      );

      if (hoursSinceSync > 24) {
        console.log('⚠️  Data is stale - consider running a sync');
      }
    }
  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
  }
}

// Run verification
verifyRevenue();
