#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function syncCurrentToastData() {
  console.log('Toast Data Sync - Current Status');
  console.log('================================');
  console.log(`Today's Date: July 31, 2025\n`);

  try {
    // Get Toast token
    const authResponse = await axios.post(
      'https://ws-api.toasttab.com/authentication/v1/authentication/login',
      {
        clientId: process.env.TOAST_CLIENT_ID,
        clientSecret: process.env.TOAST_CLIENT_SECRET,
        userAccessType: 'TOAST_MACHINE_CLIENT',
      }
    );
    
    const token = authResponse.data.token.accessToken;
    const headers = {
      Authorization: `Bearer ${token}`,
      'Toast-Restaurant-External-ID': process.env.TOAST_LOCATION_ID,
    };

    // Define date ranges to sync
    const datesToSync = [
      { date: '2025-07-31', label: 'Today (July 31)' },
      { date: '2025-07-30', label: 'Yesterday (July 30)' },
      { date: '2025-07-29', label: 'July 29' },
      { date: '2025-07-28', label: 'July 28' },
      { date: '2025-07-27', label: 'July 27' },
      { date: '2025-07-26', label: 'July 26' }
    ];

    console.log('Fetching recent Toast data...\n');

    for (const { date, label } of datesToSync) {
      console.log(`\nChecking ${label}:`);
      console.log('-'.repeat(40));

      // Check if we already have data for this date
      const { count: existingCount } = await supabase
        .from('toast_checks')
        .select('*', { count: 'exact', head: true })
        .gte('created_date', `${date}T00:00:00`)
        .lt('created_date', `${date}T23:59:59.999`);

      console.log(`  Existing records: ${existingCount || 0}`);

      // Fetch from Toast API
      let totalOrders = 0;
      let page = 1;
      const pageSize = 100;
      let hasMore = true;

      while (hasMore && page <= 10) { // Limit to 10 pages per day
        const response = await axios.get('https://ws-api.toasttab.com/orders/v2/ordersBulk', {
          headers,
          params: {
            startDate: `${date}T00:00:00.000Z`,
            endDate: `${date}T23:59:59.999Z`,
            pageSize,
            page,
          },
        });

        const orders = response.data || [];
        if (orders.length === 0) {
          hasMore = false;
          break;
        }

        totalOrders += orders.length;
        
        if (orders.length < pageSize) {
          hasMore = false;
        }
        
        page++;
      }

      console.log(`  Toast API shows: ${totalOrders} orders`);

      if (totalOrders > existingCount) {
        console.log(`  ⚠️  Missing ${totalOrders - existingCount} orders - syncing now...`);
        
        // Run sync for this specific date
        await syncSpecificDate(date, headers);
      } else if (totalOrders === existingCount) {
        console.log(`  ✅ Data is up to date`);
      } else {
        console.log(`  ℹ️  Database has more records than API (might include test data)`);
      }
    }

    // Generate current totals report
    await generateCurrentTotalsReport();

  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function syncSpecificDate(date, headers) {
  const syncScript = require('./api/sync-toast-1500.js');
  
  return new Promise((resolve, reject) => {
    const mockReq = {
      method: 'POST',
      body: {
        limit: 1000,
        startDate: `${date}T00:00:00Z`,
        endDate: `${date}T23:59:59.999Z`,
      },
    };

    const mockRes = {
      setHeader: () => {},
      status: (code) => ({
        json: (data) => {
          if (code === 200) {
            console.log(`     ✅ Synced ${data.summary.totalOrdersProcessed} orders`);
            resolve(data);
          } else {
            reject(new Error(data.error || 'Sync failed'));
          }
        },
        end: () => resolve({ success: true }),
      }),
    };

    syncScript(mockReq, mockRes).catch(reject);
  });
}

async function generateCurrentTotalsReport() {
  console.log('\n\nCurrent Data Summary (Last 7 Days):');
  console.log('===================================\n');

  const last7Days = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date('2025-07-31');
    date.setDate(date.getDate() - i);
    last7Days.push(date.toISOString().split('T')[0]);
  }

  let grandTotal = 0;
  let totalChecks = 0;

  for (const date of last7Days) {
    const { data: checksData } = await supabase
      .from('toast_checks')
      .select('total_amount, amount, tax_amount, tip_amount')
      .gte('created_date', `${date}T00:00:00`)
      .lt('created_date', `${date}T23:59:59.999`);

    const dayTotal = checksData?.reduce((sum, check) => sum + (check.total_amount || 0), 0) || 0;
    const dayChecks = checksData?.length || 0;
    
    grandTotal += dayTotal;
    totalChecks += dayChecks;

    console.log(`${date}: $${dayTotal.toFixed(2)} (${dayChecks} checks)`);
  }

  console.log('\n7-Day Total: $' + grandTotal.toFixed(2) + ' (' + totalChecks + ' checks)');

  // Month-to-date for July
  const { data: julyData } = await supabase
    .from('toast_checks')
    .select('total_amount')
    .gte('created_date', '2025-07-01T00:00:00')
    .lt('created_date', '2025-08-01T00:00:00');

  const julyTotal = julyData?.reduce((sum, check) => sum + (check.total_amount || 0), 0) || 0;
  
  console.log('\nJuly 2025 Month-to-Date:');
  console.log(`Total Revenue: $${julyTotal.toFixed(2)}`);
  console.log(`Total Checks: ${julyData?.length || 0}`);
  console.log(`Average Check: $${julyData?.length ? (julyTotal / julyData.length).toFixed(2) : '0.00'}`);

  console.log('\n\nTo verify in Toast Dashboard:');
  console.log('============================');
  console.log('1. Log into Toast');
  console.log('2. Go to Reports → Sales Summary');
  console.log('3. Set date range to "Last 7 Days"');
  console.log('4. Compare the daily totals above');
  console.log('5. For July month-to-date:');
  console.log('   - Set date range to July 1-31, 2025');
  console.log('   - Check "Total Sales" amount');
}

// Run the sync
syncCurrentToastData().catch(console.error);