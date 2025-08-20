const axios = require('axios');
require('dotenv').config();

const TOAST_CLIENT_ID = process.env.TOAST_CLIENT_ID || 'mT5Nsj9fT2XhQ9p0OvaONnqpt1IPkrh7';
const TOAST_CLIENT_SECRET = process.env.TOAST_CLIENT_SECRET || '-PvyQasB-AopTOeL1ogLmQ5s5ZH1AbvwKdv2Shbe0NghzbmPvWyQ5O56akh6VNn4';
const TOAST_LOCATION_ID = 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c';
const TOAST_BASE_URL = 'https://ws-api.toasttab.com';

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

async function scanAllMonths() {
  const accessToken = await getToastToken();
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Toast-Restaurant-External-ID': TOAST_LOCATION_ID
  };

  console.log('🔍 Scanning all months from Sep 2023 to Aug 2025...\n');

  const results = [];
  
  // Test from Sep 2023 to Aug 2025
  for (let year = 2023; year <= 2025; year++) {
    for (let month = 1; month <= 12; month++) {
      // Skip months outside our range
      if (year === 2023 && month < 9) continue;
      if (year === 2025 && month > 8) continue;
      
      // Test first, middle, and last day of each month
      const testDays = [1, 15, 28];
      let monthHasData = false;
      let monthTotal = 0;
      let monthOrders = 0;
      
      for (const day of testDays) {
        const dateStr = `${year}${month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}`;
        
        try {
          const response = await axios.get(
            `${TOAST_BASE_URL}/orders/v2/ordersBulk?businessDate=${dateStr}&page=1&pageSize=100`,
            { headers, timeout: 10000 }
          );
          
          const orders = response.data || [];
          if (orders.length > 0) {
            monthHasData = true;
            monthOrders += orders.length;
            
            // Calculate revenue
            orders.forEach(order => {
              if (order.checks && Array.isArray(order.checks)) {
                order.checks.forEach(check => {
                  if (!check.deleted && !check.voided) {
                    monthTotal += check.totalAmount || 0;
                  }
                });
              }
            });
          }
        } catch (error) {
          // Silent fail, continue
        }
      }
      
      const monthName = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      if (monthHasData) {
        console.log(`✅ ${monthName}: Found data! (${monthOrders}+ orders, $${monthTotal.toFixed(2)}+ revenue from sample days)`);
        results.push({ year, month, hasData: true });
      } else {
        console.log(`❌ ${monthName}: No data`);
        results.push({ year, month, hasData: false });
      }
    }
  }
  
  // Summary
  console.log('\n📊 SUMMARY:');
  const monthsWithData = results.filter(r => r.hasData).length;
  const totalMonths = results.length;
  console.log(`Months with data: ${monthsWithData} out of ${totalMonths}`);
  
  // Find the earliest month with data
  const firstMonth = results.find(r => r.hasData);
  if (firstMonth) {
    console.log(`\nEarliest data: ${new Date(firstMonth.year, firstMonth.month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`);
  }
}

scanAllMonths().catch(console.error);