const axios = require('axios');

const TOAST_CLIENT_ID = 'mT5Nsj9fT2XhQ9p0OvaONnqpt1IPkrh7';
const TOAST_CLIENT_SECRET = '-PvyQasB-AopTOeL1ogLmQ5s5ZH1AbvwKdv2Shbe0NghzbmPvWyQ5O56akh6VNn4';
const TOAST_LOCATION_ID = 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c';
const TOAST_BASE_URL = 'https://ws-api.toasttab.com';

async function getToastToken() {
  const response = await axios.post(
    `${TOAST_BASE_URL}/authentication/v1/authentication/login`,
    { clientId: TOAST_CLIENT_ID, clientSecret: TOAST_CLIENT_SECRET, userAccessType: 'TOAST_MACHINE_CLIENT' }
  );
  return response.data.token.accessToken;
}

async function checkFeb14() {
  console.log('Checking February 14, 2025 in Toast POS...\n');
  
  const accessToken = await getToastToken();
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Toast-Restaurant-External-ID': TOAST_LOCATION_ID
  };
  
  // Check specific date
  const businessDate = '20250214';
  
  try {
    const response = await axios.get(
      `${TOAST_BASE_URL}/orders/v2/ordersBulk?businessDate=${businessDate}&page=1&pageSize=100`,
      { headers, timeout: 10000 }
    );
    
    const orders = response.data || [];
    let totalRevenue = 0;
    let totalChecks = 0;
    
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
    
    console.log(`February 14, 2025 (Valentine's Day):`);
    console.log(`- Orders found: ${orders.length}`);
    console.log(`- Total revenue: $${totalRevenue.toFixed(2)}`);
    console.log(`- Total checks: ${totalChecks}`);
    
    if (orders.length === 0) {
      console.log('\n❌ No orders found - venue was likely closed on Valentine\'s Day 2025');
    }
    
    // Also check the whole month
    console.log('\nChecking all of February 2025...');
    
    let monthRevenue = 0;
    let daysWithRevenue = 0;
    
    for (let day = 1; day <= 28; day++) {
      const dateStr = `202502${day.toString().padStart(2, '0')}`;
      
      try {
        const dayResponse = await axios.get(
          `${TOAST_BASE_URL}/orders/v2/ordersBulk?businessDate=${dateStr}&page=1&pageSize=10`,
          { headers, timeout: 5000 }
        );
        
        if (dayResponse.data && dayResponse.data.length > 0) {
          daysWithRevenue++;
          console.log(`  Feb ${day}: Found ${dayResponse.data.length}+ orders`);
        }
      } catch (error) {
        // Silent
      }
    }
    
    console.log(`\nDays with revenue in February 2025: ${daysWithRevenue}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkFeb14().catch(console.error);