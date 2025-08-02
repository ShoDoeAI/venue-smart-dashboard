#!/usr/bin/env node

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Import the sync function
const syncHistorical = require('./api/sync-toast-historical.js');

// Helper to call the sync for a specific month
async function syncMonth(yearMonth) {
  return new Promise((resolve, reject) => {
    const mockReq = {
      method: 'POST',
      body: {
        specificMonth: yearMonth,
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

    syncHistorical(mockReq, mockRes).catch(reject);
  });
}

async function syncAllMonths() {
  console.log('Starting month-by-month Toast sync for 2 years of data...');
  console.log('=======================================================\n');

  const results = [];
  const endDate = new Date();
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 2); // 2 years ago

  // Generate list of months to sync (from newest to oldest)
  const months = [];
  const current = new Date(endDate);
  
  while (current >= startDate) {
    const yearMonth = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
    months.push(yearMonth);
    current.setMonth(current.getMonth() - 1);
  }

  console.log(`Will sync ${months.length} months from ${months[months.length - 1]} to ${months[0]}\n`);

  // Process each month
  for (let i = 0; i < months.length; i++) {
    const month = months[i];
    console.log(`\n[${i + 1}/${months.length}] Syncing ${month}...`);
    
    try {
      const startTime = Date.now();
      const result = await syncMonth(month);
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      
      if (result.monthlyBreakdown && result.monthlyBreakdown[0]) {
        const monthData = result.monthlyBreakdown[0];
        console.log(`  ✓ Success: ${monthData.ordersFound} orders, $${monthData.totalRevenue} revenue (${duration}s)`);
        results.push({
          month,
          success: true,
          orders: monthData.ordersFound,
          revenue: monthData.totalRevenue,
          duration
        });
      } else {
        console.log(`  ✓ No data found for ${month} (${duration}s)`);
        results.push({
          month,
          success: true,
          orders: 0,
          revenue: '0.00',
          duration
        });
      }
      
      // Small delay between months to avoid rate limits
      if (i < months.length - 1) {
        console.log('  Waiting 2 seconds before next month...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
    } catch (error) {
      console.error(`  ✗ Error syncing ${month}:`, error.message);
      results.push({
        month,
        success: false,
        error: error.message
      });
      
      // Continue with next month even if one fails
      continue;
    }
  }

  // Summary
  console.log('\n\nSYNC SUMMARY');
  console.log('============');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const totalOrders = successful.reduce((sum, r) => sum + (r.orders || 0), 0);
  const totalRevenue = successful.reduce((sum, r) => sum + parseFloat(r.revenue || 0), 0);
  
  console.log(`Total months processed: ${results.length}`);
  console.log(`Successful: ${successful.length}`);
  console.log(`Failed: ${failed.length}`);
  console.log(`Total orders synced: ${totalOrders.toLocaleString()}`);
  console.log(`Total revenue: $${totalRevenue.toFixed(2)}`);
  
  if (failed.length > 0) {
    console.log('\nFailed months:');
    failed.forEach(f => console.log(`  - ${f.month}: ${f.error}`));
  }

  // Show months with data
  const monthsWithData = successful.filter(r => r.orders > 0);
  if (monthsWithData.length > 0) {
    console.log('\nMonths with data:');
    monthsWithData
      .sort((a, b) => b.month.localeCompare(a.month))
      .forEach(m => console.log(`  ${m.month}: ${m.orders} orders, $${m.revenue}`));
  }

  // Check specific dates
  console.log('\nChecking specific dates...');
  
  // Check July 25, 2025
  const { data: july25Data } = await supabase
    .from('toast_checks')
    .select('total_amount')
    .gte('created_date', '2025-07-25T00:00:00')
    .lt('created_date', '2025-07-26T00:00:00');
  
  const july25Revenue = july25Data?.reduce((sum, check) => sum + (check.total_amount || 0), 0) || 0;
  console.log(`July 25, 2025 revenue: $${july25Revenue.toFixed(2)} (${july25Data?.length || 0} checks)`);

  // Save results to file
  const fs = require('fs');
  fs.writeFileSync('toast-sync-results.json', JSON.stringify({
    syncDate: new Date().toISOString(),
    results,
    summary: {
      totalMonths: results.length,
      successful: successful.length,
      failed: failed.length,
      totalOrders,
      totalRevenue: totalRevenue.toFixed(2),
      monthsWithData: monthsWithData.length
    }
  }, null, 2));
  
  console.log('\nResults saved to toast-sync-results.json');
}

// Run the sync
syncAllMonths().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});