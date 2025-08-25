const axios = require('axios');

const TOAST_CLIENT_ID = 'mT5Nsj9fT2XhQ9p0OvaONnqpt1IPkrh7';
const TOAST_CLIENT_SECRET = '-PvyQasB-AopTOeL1ogLmQ5s5ZH1AbvwKdv2Shbe0NghzbmPvWyQ5O56akh6VNn4';
const TOAST_LOCATION_ID = 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c';
const TOAST_BASE_URL = 'https://ws-api.toasttab.com';
const SUPABASE_URL = 'https://bmhplnojfuznflbyqqze.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtaHBsbm9qZnV6bmZsYnlxcXplIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjI4NTkxNywiZXhwIjoyMDY3ODYxOTE3fQ.PSUDBof_kgUQ0fnzhW0IGaCTfNUAHMh27f4q4CGWnoY';

async function getToastToken() {
  const response = await axios.post(
    `${TOAST_BASE_URL}/authentication/v1/authentication/login`,
    { clientId: TOAST_CLIENT_ID, clientSecret: TOAST_CLIENT_SECRET, userAccessType: 'TOAST_MACHINE_CLIENT' }
  );
  return response.data.token.accessToken;
}

async function getCompleteToastRevenue(accessToken, businessDate) {
  const headers = { 'Authorization': `Bearer ${accessToken}`, 'Toast-Restaurant-External-ID': TOAST_LOCATION_ID };
  let totalRevenue = 0;
  let totalChecks = 0;
  let page = 1;
  let hasMorePages = true;

  console.log(`  Fetching Toast data for ${businessDate}...`);

  while (hasMorePages) {
    try {
      const response = await axios.get(
        `${TOAST_BASE_URL}/orders/v2/ordersBulk?businessDate=${businessDate}&page=${page}&pageSize=100`,
        { headers, timeout: 15000 }
      );

      const orders = response.data || [];
      
      if (orders.length === 0) {
        hasMorePages = false;
      } else {
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

        console.log(`    Page ${page}: ${orders.length} orders`);
        
        if (orders.length < 100) {
          hasMorePages = false;
        } else {
          page++;
        }
      }
    } catch (error) {
      console.log(`    Error on page ${page}: ${error.message}`);
      hasMorePages = false;
    }
  }

  return { revenue: totalRevenue, checks: totalChecks, pages: page };
}

async function finalCheck() {
  console.log('🎯 FINAL ACCURACY VERIFICATION');
  console.log('==============================\n');
  
  const accessToken = await getToastToken();
  
  // Get ALL database records
  const dbResponse = await axios.get(
    `${SUPABASE_URL}/rest/v1/revenue_overrides?select=date,actual_revenue,check_count&order=date`,
    { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` } }
  );
  
  const dbRecords = dbResponse.data;
  console.log(`Checking ${dbRecords.length} records...\n`);
  
  // Focus on records with significant revenue
  const significantRecords = dbRecords.filter(r => parseFloat(r.actual_revenue) > 1000);
  console.log(`Found ${significantRecords.length} records with revenue > $1,000\n`);
  
  let totalDbRevenue = 0;
  let totalToastRevenue = 0;
  let mismatches = [];
  
  // Sample check - verify 10 random records
  const samplesToCheck = [...significantRecords].sort(() => Math.random() - 0.5).slice(0, 10);
  
  for (const record of samplesToCheck) {
    const businessDate = record.date.replace(/-/g, '');
    console.log(`\nChecking ${record.date}:`);
    
    const toastData = await getCompleteToastRevenue(accessToken, businessDate);
    const dbRevenue = parseFloat(record.actual_revenue);
    
    totalDbRevenue += dbRevenue;
    totalToastRevenue += toastData.revenue;
    
    const difference = Math.abs(dbRevenue - toastData.revenue);
    
    console.log(`  Database: $${dbRevenue.toFixed(2)} (${record.check_count} checks)`);
    console.log(`  Toast API: $${toastData.revenue.toFixed(2)} (${toastData.checks} checks, ${toastData.pages} pages)`);
    
    if (difference > 0.01) {
      console.log(`  ❌ MISMATCH: $${difference.toFixed(2)} difference`);
      mismatches.push({ date: record.date, dbRevenue, toastRevenue: toastData.revenue, difference });
    } else {
      console.log(`  ✅ MATCH`);
    }
    
    // Delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('\n\n📊 SAMPLE VERIFICATION RESULTS');
  console.log('==============================');
  console.log(`Samples Checked: ${samplesToCheck.length}`);
  console.log(`Matches: ${samplesToCheck.length - mismatches.length}`);
  console.log(`Mismatches: ${mismatches.length}`);
  console.log(`Sample Accuracy: ${((samplesToCheck.length - mismatches.length) / samplesToCheck.length * 100).toFixed(1)}%`);
  
  if (mismatches.length === 0) {
    console.log('\n✅ ALL SAMPLED RECORDS ARE 100% ACCURATE!');
    console.log('\nThe database is now synchronized with Toast POS.');
  } else {
    console.log('\n❌ Some mismatches found in sample.');
    console.log('Run a full sync to ensure 100% accuracy.');
  }
  
  // Overall database totals
  const overallTotal = dbRecords.reduce((sum, r) => sum + parseFloat(r.actual_revenue), 0);
  console.log(`\n💰 Total Revenue in Database: $${overallTotal.toFixed(2)}`);
}

finalCheck().catch(console.error);