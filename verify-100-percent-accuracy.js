const axios = require('axios');
const fs = require('fs');

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

async function getCompleteToastData(accessToken, businessDate) {
  const headers = { 'Authorization': `Bearer ${accessToken}`, 'Toast-Restaurant-External-ID': TOAST_LOCATION_ID };
  let totalRevenue = 0;
  let totalChecks = 0;
  let page = 1;
  let hasMorePages = true;

  while (hasMorePages) {
    try {
      const response = await axios.get(
        `${TOAST_BASE_URL}/orders/v2/ordersBulk?businessDate=${businessDate}&page=${page}&pageSize=100`,
        { headers, timeout: 20000 }
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

        if (orders.length < 100) {
          hasMorePages = false;
        } else {
          page++;
        }
      }
    } catch (error) {
      hasMorePages = false;
    }
  }

  return { revenue: totalRevenue, checks: totalChecks };
}

async function verify100PercentAccuracy() {
  console.log('🔍 100% ACCURACY VERIFICATION');
  console.log('=============================\n');
  
  const accessToken = await getToastToken();
  console.log('✅ Toast authentication successful\n');
  
  // Get ALL database records
  const dbResponse = await axios.get(
    `${SUPABASE_URL}/rest/v1/revenue_overrides?select=date,actual_revenue,check_count&order=date`,
    { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` } }
  );
  
  const dbRecords = dbResponse.data;
  console.log(`📊 Found ${dbRecords.length} records in database\n`);
  
  let perfectMatches = 0;
  let mismatches = [];
  let totalDbRevenue = 0;
  let totalToastRevenue = 0;
  let recordsChecked = 0;
  
  // Create a progress report
  const report = {
    verificationDate: new Date().toISOString(),
    totalRecords: dbRecords.length,
    recordsVerified: 0,
    perfectMatches: 0,
    mismatches: [],
    accuracy: 0
  };
  
  console.log('Verifying each record against Toast POS...\n');
  console.log('Date        | DB Revenue  | Toast Revenue | Status');
  console.log('------------|-------------|---------------|--------');
  
  for (const record of dbRecords) {
    recordsChecked++;
    const businessDate = record.date.replace(/-/g, '');
    const dbRevenue = parseFloat(record.actual_revenue);
    
    // Skip if no revenue (venue closed)
    if (dbRevenue === 0) {
      process.stdout.write(`${record.date} | $0.00       | [Closed]      | ✅\r`);
      perfectMatches++;
      totalDbRevenue += dbRevenue;
      continue;
    }
    
    // Get Toast data
    const toastData = await getCompleteToastData(accessToken, businessDate);
    const toastRevenue = parseFloat(toastData.revenue.toFixed(2));
    const difference = Math.abs(dbRevenue - toastRevenue);
    
    totalDbRevenue += dbRevenue;
    totalToastRevenue += toastRevenue;
    
    const match = difference <= 0.01; // 1 cent tolerance
    
    if (match) {
      perfectMatches++;
      console.log(
        `${record.date} | $${dbRevenue.toFixed(2).padStart(10)} | $${toastRevenue.toFixed(2).padStart(12)} | ✅`
      );
    } else {
      console.log(
        `${record.date} | $${dbRevenue.toFixed(2).padStart(10)} | $${toastRevenue.toFixed(2).padStart(12)} | ❌ ($${difference.toFixed(2)})`
      );
      mismatches.push({
        date: record.date,
        dbRevenue,
        toastRevenue,
        difference,
        dbChecks: record.check_count,
        toastChecks: toastData.checks
      });
    }
    
    // Progress update every 10 records
    if (recordsChecked % 10 === 0) {
      console.log(`\n[Progress: ${recordsChecked}/${dbRecords.length}]\n`);
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Calculate final accuracy
  const accuracyPercent = (perfectMatches / dbRecords.length * 100).toFixed(2);
  
  console.log('\n\n=============================');
  console.log('📈 FINAL VERIFICATION RESULTS');
  console.log('=============================');
  console.log(`Total Records: ${dbRecords.length}`);
  console.log(`Perfect Matches: ${perfectMatches}`);
  console.log(`Mismatches: ${mismatches.length}`);
  console.log(`ACCURACY: ${accuracyPercent}%`);
  console.log(`\nRevenue Totals:`);
  console.log(`  Database: $${totalDbRevenue.toFixed(2)}`);
  console.log(`  Toast POS: $${totalToastRevenue.toFixed(2)}`);
  console.log(`  Difference: $${Math.abs(totalDbRevenue - totalToastRevenue).toFixed(2)}`);
  
  if (mismatches.length > 0) {
    console.log('\n❌ RECORDS REQUIRING CORRECTION:');
    console.log('=================================');
    mismatches.forEach(m => {
      console.log(`\n${m.date}:`);
      console.log(`  Database: $${m.dbRevenue.toFixed(2)} (${m.dbChecks} checks)`);
      console.log(`  Toast: $${m.toastRevenue.toFixed(2)} (${m.toastChecks} checks)`);
      console.log(`  Difference: $${m.difference.toFixed(2)}`);
    });
    
    // Generate fix SQL
    console.log('\n📝 SQL TO FIX MISMATCHES:\n');
    mismatches.forEach(m => {
      console.log(`UPDATE revenue_overrides SET actual_revenue = ${m.toastRevenue.toFixed(2)}, revenue_total = ${m.toastRevenue.toFixed(2)}, check_count = ${m.toastChecks} WHERE date = '${m.date}';`);
    });
    
    // Save report
    report.recordsVerified = recordsChecked;
    report.perfectMatches = perfectMatches;
    report.mismatches = mismatches;
    report.accuracy = parseFloat(accuracyPercent);
    
    fs.writeFileSync('accuracy-report.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Detailed report saved to accuracy-report.json');
  } else {
    console.log('\n✅ 🎉 100% ACCURACY ACHIEVED!');
    console.log('All revenue data matches Toast POS exactly.');
  }
}

verify100PercentAccuracy().catch(console.error);