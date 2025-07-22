const axios = require('axios');

// Toast API credentials
const TOAST_CLIENT_ID = 'mT5Nsj9fT2XhQ9p0OvaONnqpt1IPkrh7';
const TOAST_CLIENT_SECRET = '-PvyQasB-AopTOeL1ogLmQ5s5ZH1AbvwKdv2Shbe0NghzbmPvWyQ5O56akh6VNn4';
const TOAST_LOCATION_ID = 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c';

async function getToastToken() {
  try {
    const response = await axios.post(
      'https://ws-api.toasttab.com/authentication/v1/authentication/login',
      {
        clientId: TOAST_CLIENT_ID,
        clientSecret: TOAST_CLIENT_SECRET,
        userAccessType: 'TOAST_MACHINE_CLIENT'
      }
    );
    return response.data.token.accessToken;
  } catch (error) {
    console.error('Toast auth error:', error.response?.data || error.message);
    return null;
  }
}

async function fetchDayDetailed(token, date, dayName) {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Toast-Restaurant-External-ID': TOAST_LOCATION_ID
  };

  // Set date range for EDT (UTC-4)
  const startDate = new Date(date + 'T04:00:00.000Z');
  const endDate = new Date(date + 'T03:59:59.999Z');
  endDate.setDate(endDate.getDate() + 1);

  console.log(`\n============ ${dayName} ============`);
  console.log(`Fetching from: ${startDate.toISOString()}`);
  console.log(`Fetching to: ${endDate.toISOString()}`);

  try {
    const ordersResponse = await axios.get(
      `https://ws-api.toasttab.com/orders/v2/ordersBulk?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
      { headers }
    );
    
    let totalRevenue = 0;
    let totalChecks = 0;
    let totalOrders = 0;
    
    if (ordersResponse.data && Array.isArray(ordersResponse.data)) {
      totalOrders = ordersResponse.data.length;
      console.log(`\nTotal orders found: ${totalOrders}`);
      
      // Show first 5 orders in detail
      console.log('\nFirst 5 orders:');
      ordersResponse.data.slice(0, 5).forEach((order, idx) => {
        console.log(`\nOrder ${idx + 1}:`);
        console.log(`  Order ID: ${order.guid}`);
        console.log(`  Created: ${new Date(order.createdDate).toLocaleString('en-US', {timeZone: 'America/New_York'})}`);
        console.log(`  Business Date: ${order.businessDate}`);
        
        if (order.checks && Array.isArray(order.checks)) {
          console.log(`  Checks: ${order.checks.length}`);
          order.checks.forEach((check, checkIdx) => {
            console.log(`    Check ${checkIdx + 1}: $${(check.totalAmount/100).toFixed(2)} (${check.totalAmount} cents)`);
            totalRevenue += check.totalAmount;
            totalChecks++;
          });
        }
      });
      
      // Process all orders for totals
      ordersResponse.data.forEach(order => {
        if (order.checks && Array.isArray(order.checks)) {
          order.checks.forEach(check => {
            if (!totalChecks < 5) { // Already counted first 5
              totalRevenue += check.totalAmount || 0;
              totalChecks++;
            }
          });
        }
      });
    }
    
    console.log(`\n${dayName} TOTALS:`);
    console.log(`Total Revenue: $${(totalRevenue/100).toFixed(2)}`);
    console.log(`Total Checks: ${totalChecks}`);
    console.log(`Total Orders: ${totalOrders}`);
    console.log(`Average per Check: $${totalChecks > 0 ? (totalRevenue/totalChecks/100).toFixed(2) : '0.00'}`);
    
    return { revenue: totalRevenue/100, checks: totalChecks, orders: totalOrders };
  } catch (error) {
    console.error('\nAPI Error:', error.response?.status, error.response?.statusText);
    if (error.response?.data) {
      console.error('Error details:', JSON.stringify(error.response.data, null, 2));
    }
    return { revenue: 0, checks: 0, orders: 0 };
  }
}

async function main() {
  console.log('Toast API Verification - Detailed');
  console.log('Location: Jack\'s on Water Street');
  console.log(`Location ID: ${TOAST_LOCATION_ID}`);
  
  const token = await getToastToken();
  if (!token) {
    console.error('Failed to authenticate with Toast');
    return;
  }
  console.log('✓ Authentication successful');

  // Fetch Friday and Saturday data
  const friday = await fetchDayDetailed(token, '2025-07-18', 'Friday, July 18th, 2025');
  const saturday = await fetchDayDetailed(token, '2025-07-19', 'Saturday, July 19th, 2025');

  console.log('\n========== WEEKEND SUMMARY ==========');
  console.log(`Friday Revenue: $${friday.revenue.toFixed(2)}`);
  console.log(`Saturday Revenue: $${saturday.revenue.toFixed(2)}`);
  console.log(`Weekend Total: $${(friday.revenue + saturday.revenue).toFixed(2)}`);
  console.log(`Total Checks: ${friday.checks + saturday.checks}`);
  console.log(`Total Orders: ${friday.orders + saturday.orders}`);
}

main();