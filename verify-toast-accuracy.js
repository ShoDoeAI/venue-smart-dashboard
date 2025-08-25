const axios = require('axios');
require('dotenv').config();

const TOAST_CLIENT_ID = process.env.TOAST_CLIENT_ID || 'mT5Nsj9fT2XhQ9p0OvaONnqpt1IPkrh7';
const TOAST_CLIENT_SECRET = process.env.TOAST_CLIENT_SECRET || '-PvyQasB-AopTOeL1ogLmQ5s5ZH1AbvwKdv2Shbe0NghzbmPvWyQ5O56akh6VNn4';
const TOAST_LOCATION_ID = 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c';
const TOAST_BASE_URL = 'https://ws-api.toasttab.com';

// Supabase
const SUPABASE_URL = 'https://bmhplnojfuznflbyqqze.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtaHBsbm9qZnV6bmZsYnlxcXplIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjI4NTkxNywiZXhwIjoyMDY3ODYxOTE3fQ.PSUDBof_kgUQ0fnzhW0IGaCTfNUAHMh27f4q4CGWnoY';

async function getToastToken() {
  const response = await axios.post(
    `${TOAST_BASE_URL}/authentication/v1/authentication/login`,
    {
      clientId: TOAST_CLIENT_ID,
      clientSecret: TOAST_CLIENT_SECRET,
      userAccessType: 'TOAST_MACHINE_CLIENT'
    }
  );
  return response.data.token.accessToken;
}

async function getToastRevenueForDate(accessToken, businessDate) {
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Toast-Restaurant-External-ID': TOAST_LOCATION_ID
  };

  let totalRevenue = 0;
  let totalChecks = 0;
  let page = 1;
  let hasMorePages = true;

  while (hasMorePages) {
    try {
      const response = await axios.get(
        `${TOAST_BASE_URL}/orders/v2/ordersBulk?businessDate=${businessDate}&page=${page}&pageSize=100`,
        { headers, timeout: 10000 }
      );

      const orders = response.data || [];
      
      if (orders.length === 0) {
        hasMorePages = false;
      } else {
        // Process each order
        orders.forEach(order => {
          if (order.checks && Array.isArray(order.checks)) {
            order.checks.forEach(check => {
              if (!check.deleted && !check.voided && check.paidDate) {
                totalRevenue += check.totalAmount || 0;
                totalChecks++;
              }
            });
          }
        });

        if (orders.length < 100) {
          hasMorePages = false;
        } else {
          page++;
        }
      }
    } catch (error) {
      console.error(`Error fetching page ${page} for ${businessDate}:`, error.message);
      hasMorePages = false;
    }
  }

  return { revenue: totalRevenue, checks: totalChecks };
}

async function getDatabaseRevenue() {
  try {
    const response = await axios.get(
      `${SUPABASE_URL}/rest/v1/revenue_overrides?select=date,actual_revenue,check_count&order=date`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        }
      }
    );
    return response.data || [];
  } catch (error) {
    console.error('Error fetching database records:', error.message);
    return [];
  }
}

async function verifyAllData() {
  console.log('🔍 Toast POS Data Accuracy Verification');
  console.log('=====================================\n');
  
  // Get Toast token
  const accessToken = await getToastToken();
  console.log('✅ Authenticated with Toast API\n');

  // Get all database records
  const dbRecords = await getDatabaseRevenue();
  console.log(`📊 Found ${dbRecords.length} records in database\n`);

  let mismatches = [];
  let perfectMatches = 0;
  let totalDbRevenue = 0;
  let totalToastRevenue = 0;

  console.log('Verifying each date...\n');

  for (const record of dbRecords) {
    const businessDate = record.date.replace(/-/g, '');
    
    process.stdout.write(`Checking ${record.date}... `);
    
    // Get actual Toast data
    const toastData = await getToastRevenueForDate(accessToken, businessDate);
    
    // Compare
    const dbRevenue = parseFloat(record.actual_revenue);
    const toastRevenue = parseFloat(toastData.revenue.toFixed(2));
    const difference = Math.abs(dbRevenue - toastRevenue);
    
    totalDbRevenue += dbRevenue;
    totalToastRevenue += toastRevenue;
    
    if (difference > 0.01) { // Allow 1 cent tolerance for rounding
      console.log(`❌ MISMATCH!`);
      console.log(`  Database: $${dbRevenue.toFixed(2)} (${record.check_count} checks)`);
      console.log(`  Toast API: $${toastRevenue.toFixed(2)} (${toastData.checks} checks)`);
      console.log(`  Difference: $${difference.toFixed(2)}\n`);
      
      mismatches.push({
        date: record.date,
        dbRevenue,
        toastRevenue,
        difference,
        dbChecks: record.check_count,
        toastChecks: toastData.checks
      });
    } else {
      console.log(`✅ Match ($${dbRevenue.toFixed(2)})`);
      perfectMatches++;
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary
  console.log('\n\n📈 VERIFICATION SUMMARY');
  console.log('======================');
  console.log(`Total Records: ${dbRecords.length}`);
  console.log(`Perfect Matches: ${perfectMatches}`);
  console.log(`Mismatches: ${mismatches.length}`);
  console.log(`Accuracy: ${((perfectMatches / dbRecords.length) * 100).toFixed(1)}%`);
  console.log(`\nTotal Revenue:`);
  console.log(`  Database: $${totalDbRevenue.toFixed(2)}`);
  console.log(`  Toast API: $${totalToastRevenue.toFixed(2)}`);
  console.log(`  Difference: $${Math.abs(totalDbRevenue - totalToastRevenue).toFixed(2)}`);

  if (mismatches.length > 0) {
    console.log('\n\n❌ MISMATCHES REQUIRING CORRECTION:');
    console.log('===================================');
    
    // Generate fix SQL
    console.log('\nSQL to fix mismatches:\n');
    mismatches.forEach(m => {
      console.log(`UPDATE revenue_overrides SET actual_revenue = ${m.toastRevenue.toFixed(2)}, check_count = ${m.toastChecks} WHERE date = '${m.date}';`);
    });
    
    // Save mismatches to file
    const fs = require('fs');
    fs.writeFileSync('toast-mismatches.json', JSON.stringify(mismatches, null, 2));
    console.log('\n📄 Mismatches saved to toast-mismatches.json');
  } else {
    console.log('\n\n✅ ALL DATA IS 100% ACCURATE!');
  }
}

verifyAllData().catch(console.error);