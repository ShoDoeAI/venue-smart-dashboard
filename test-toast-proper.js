const axios = require('axios');

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

async function fetchWithBusinessDate(token, businessDate, dayName) {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Toast-Restaurant-External-ID': TOAST_LOCATION_ID
  };

  console.log(`\n============ ${dayName} ============`);
  console.log(`Using businessDate: ${businessDate}`);
  
  try {
    // Use businessDate parameter which is more reliable
    const url = `https://ws-api.toasttab.com/orders/v2/ordersBulk?businessDate=${businessDate}`;
    console.log('URL:', url);
    
    const response = await axios.get(url, { headers });
    
    let totalRevenue = 0;
    let totalChecks = 0;
    let orderCount = 0;
    
    if (response.data && Array.isArray(response.data)) {
      orderCount = response.data.length;
      console.log(`Orders found: ${orderCount}`);
      
      // Process all orders
      response.data.forEach(order => {
        if (order.checks && Array.isArray(order.checks)) {
          order.checks.forEach(check => {
            totalRevenue += check.totalAmount || 0;
            totalChecks++;
          });
        }
      });
      
      // Show some sample orders with real amounts
      const significantOrders = response.data
        .filter(o => {
          const total = o.checks?.reduce((sum, c) => sum + (c.totalAmount || 0), 0) || 0;
          return total > 1000; // Over $10
        })
        .slice(0, 3);
      
      if (significantOrders.length > 0) {
        console.log('\nSample significant orders:');
        significantOrders.forEach(order => {
          const total = order.checks.reduce((sum, c) => sum + (c.totalAmount || 0), 0);
          console.log(`- $${(total/100).toFixed(2)} at ${new Date(order.createdDate).toLocaleTimeString()}`);
        });
      }
    }
    
    console.log(`\nTotals:`);
    console.log(`Revenue: $${(totalRevenue/100).toFixed(2)}`);
    console.log(`Checks: ${totalChecks}`);
    console.log(`Average: $${totalChecks > 0 ? (totalRevenue/totalChecks/100).toFixed(2) : '0.00'}`);
    
    return { revenue: totalRevenue/100, checks: totalChecks, orders: orderCount };
  } catch (error) {
    console.error('Error:', error.response?.status, error.response?.statusText);
    if (error.response?.data) {
      console.error('Details:', JSON.stringify(error.response.data, null, 2));
    }
    return { revenue: 0, checks: 0, orders: 0 };
  }
}

async function fetchWithDateRange(token, startDate, endDate, dayName) {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Toast-Restaurant-External-ID': TOAST_LOCATION_ID
  };

  console.log(`\n============ ${dayName} (Date Range) ============`);
  console.log(`Start: ${startDate}`);
  console.log(`End: ${endDate}`);
  
  try {
    const url = `https://ws-api.toasttab.com/orders/v2/ordersBulk?startDate=${startDate}&endDate=${endDate}`;
    
    const response = await axios.get(url, { headers });
    
    let totalRevenue = 0;
    let totalChecks = 0;
    let orderCount = 0;
    
    if (response.data && Array.isArray(response.data)) {
      orderCount = response.data.length;
      console.log(`Orders found: ${orderCount}`);
      
      response.data.forEach(order => {
        if (order.checks && Array.isArray(order.checks)) {
          order.checks.forEach(check => {
            totalRevenue += check.totalAmount || 0;
            totalChecks++;
          });
        }
      });
    }
    
    console.log(`Revenue: $${(totalRevenue/100).toFixed(2)}`);
    console.log(`Checks: ${totalChecks}`);
    
    return { revenue: totalRevenue/100, checks: totalChecks, orders: orderCount };
  } catch (error) {
    console.error('Error:', error.response?.status);
    return { revenue: 0, checks: 0, orders: 0 };
  }
}

async function main() {
  console.log('Toast API Test - Multiple Methods');
  console.log('Today is Monday, July 21, 2025 (EDT)');
  
  const token = await getToastToken();
  if (!token) {
    console.error('Failed to authenticate');
    return;
  }
  
  // Method 1: Using businessDate (Toast's internal date)
  console.log('\n=== METHOD 1: Business Date ===');
  const friday1 = await fetchWithBusinessDate(token, '20250718', 'Friday July 18');
  const saturday1 = await fetchWithBusinessDate(token, '20250719', 'Saturday July 19');
  
  // Method 2: Using date range with proper EDT times
  console.log('\n\n=== METHOD 2: Date Range (EDT) ===');
  // Friday midnight to Saturday midnight EDT (UTC-4)
  const friday2 = await fetchWithDateRange(
    token,
    '2025-07-18T04:00:00.000Z', // Friday 12:00 AM EDT
    '2025-07-19T03:59:59.999Z', // Friday 11:59 PM EDT
    'Friday July 18'
  );
  
  const saturday2 = await fetchWithDateRange(
    token,
    '2025-07-19T04:00:00.000Z', // Saturday 12:00 AM EDT
    '2025-07-20T03:59:59.999Z', // Saturday 11:59 PM EDT
    'Saturday July 19'
  );
  
  console.log('\n\n========== COMPARISON ==========');
  console.log('Method 1 (businessDate):');
  console.log(`  Friday: $${friday1.revenue.toFixed(2)} (${friday1.orders} orders)`);
  console.log(`  Saturday: $${saturday1.revenue.toFixed(2)} (${saturday1.orders} orders)`);
  console.log(`  Total: $${(friday1.revenue + saturday1.revenue).toFixed(2)}`);
  
  console.log('\nMethod 2 (date range):');
  console.log(`  Friday: $${friday2.revenue.toFixed(2)} (${friday2.orders} orders)`);
  console.log(`  Saturday: $${saturday2.revenue.toFixed(2)} (${saturday2.orders} orders)`);
  console.log(`  Total: $${(friday2.revenue + saturday2.revenue).toFixed(2)}`);
}

main();