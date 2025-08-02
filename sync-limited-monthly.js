#!/usr/bin/env node

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Import the sync function with modifications
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Modified sync function that limits orders per month
async function syncMonthLimited(yearMonth, maxOrders = 1000) {
  const { syncToastHistorical } = require('./api/sync-toast-1500.js');
  
  // Use the existing sync logic but with date range
  const [year, month] = yearMonth.split('-').map(Number);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  return new Promise((resolve, reject) => {
    const mockReq = {
      method: 'POST',
      body: {
        limit: maxOrders,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    };

    const mockRes = {
      setHeader: () => {},
      status: (code) => ({
        json: (data) => {
          if (code === 200) {
            resolve(data);
          } else {
            reject(new Error(data.error || 'Sync failed'));
          }
        },
        end: () => {
          resolve({ success: true });
        },
      }),
    };

    require('./api/sync-toast-1500.js')(mockReq, mockRes).catch(reject);
  });
}

async function quickMonthlySync() {
  console.log('Quick monthly sync - Limited to 500 orders per month');
  console.log('===================================================\n');

  // Focus on recent months first
  const targetMonths = [
    '2025-07', // July 2025
    '2025-06', // June 2025
    '2025-05', // May 2025
    '2025-04', // April 2025
    '2025-03', // March 2025
    '2025-02', // February 2025
    '2025-01', // January 2025
    '2024-12', // December 2024
    '2024-11', // November 2024
    '2024-10', // October 2024
  ];

  const results = [];

  for (let i = 0; i < targetMonths.length; i++) {
    const month = targetMonths[i];
    console.log(`\n[${i + 1}/${targetMonths.length}] Processing ${month}...`);
    
    try {
      const startTime = Date.now();
      
      // Check if we already have data for this month
      const { count } = await supabase
        .from('toast_checks')
        .select('*', { count: 'exact', head: true })
        .gte('created_date', `${month}-01`)
        .lt('created_date', `${month}-32`);
      
      if (count > 0) {
        console.log(`  → Already have ${count} checks for ${month}, skipping...`);
        results.push({ month, skipped: true, existing: count });
        continue;
      }

      // Run limited sync
      const result = await syncMonthLimited(month, 500);
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      
      console.log(`  ✓ Synced in ${duration}s`);
      results.push({ month, success: true, result });
      
      // Small delay between months
      if (i < targetMonths.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
    } catch (error) {
      console.error(`  ✗ Error: ${error.message}`);
      results.push({ month, success: false, error: error.message });
    }
  }

  // Check July 25 specifically
  console.log('\n\nChecking July 25, 2025...');
  const { data: july25Data } = await supabase
    .from('toast_checks')
    .select('total_amount, created_date')
    .gte('created_date', '2025-07-25T00:00:00')
    .lt('created_date', '2025-07-26T00:00:00');
  
  const july25Revenue = july25Data?.reduce((sum, check) => sum + (check.total_amount || 0), 0) || 0;
  console.log(`July 25, 2025: $${july25Revenue.toFixed(2)} (${july25Data?.length || 0} checks)`);

  // Summary of all data
  const { data: monthlyTotals } = await supabase.rpc('get_monthly_toast_revenue').catch(() => ({ data: null }));
  
  if (!monthlyTotals) {
    // Manual calculation
    const { data: allChecks } = await supabase
      .from('toast_checks')
      .select('created_date, total_amount');
    
    const monthlyRevenue = {};
    allChecks?.forEach(check => {
      const month = check.created_date?.substring(0, 7);
      if (month) {
        monthlyRevenue[month] = (monthlyRevenue[month] || 0) + (check.total_amount || 0);
      }
    });

    console.log('\nMonthly Revenue Summary:');
    Object.entries(monthlyRevenue)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .forEach(([month, revenue]) => {
        console.log(`  ${month}: $${revenue.toFixed(2)}`);
      });
  }
}

// Run the quick sync
quickMonthlySync().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});