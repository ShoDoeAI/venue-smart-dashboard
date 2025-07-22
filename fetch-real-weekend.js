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

async function fetchAllOrdersForDay(token, businessDate, dayName) {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Toast-Restaurant-External-ID': TOAST_LOCATION_ID
  };

  console.log(`\n============ ${dayName} (Business Date: ${businessDate}) ============`);
  
  let allOrders = [];
  let pageToken = null;
  let pageCount = 0;
  
  do {
    pageCount++;
    let url = `https://ws-api.toasttab.com/orders/v2/ordersBulk?businessDate=${businessDate}&pageSize=100`;
    if (pageToken) {
      url += `&pageToken=${pageToken}`;
    }
    
    try {
      const response = await axios.get(url, { headers });
      
      if (response.data && Array.isArray(response.data)) {
        allOrders = allOrders.concat(response.data);
        console.log(`Page ${pageCount}: ${response.data.length} orders`);
      }
      
      // Check for more pages
      pageToken = response.headers['toast-next-page-token'];
      const hasMore = response.headers['toast-has-more-results'] === 'true';
      
      if (!hasMore) {
        pageToken = null;
      }
    } catch (error) {
      console.error('Error fetching page:', error.response?.status);
      break;
    }
  } while (pageToken);
  
  // Calculate totals
  let totalRevenue = 0;
  let totalChecks = 0;
  let realOrders = 0;
  
  allOrders.forEach(order => {
    let orderTotal = 0;
    if (order.checks && Array.isArray(order.checks)) {
      order.checks.forEach(check => {
        const amount = check.totalAmount || 0;
        totalRevenue += amount;
        totalChecks++;
        orderTotal += amount;
      });
    }
    // Count orders with real amounts (> $1)
    if (orderTotal > 100) { // 100 cents = $1
      realOrders++;
    }
  });
  
  console.log(`\nTotal orders fetched: ${allOrders.length}`);
  console.log(`Orders with amount > $1: ${realOrders}`);
  console.log(`Total checks: ${totalChecks}`);
  console.log(`Total revenue: $${(totalRevenue/100).toFixed(2)}`);
  console.log(`Average per check: $${totalChecks > 0 ? (totalRevenue/totalChecks/100).toFixed(2) : '0.00'}`);
  
  // Show some real orders
  console.log('\nSample orders with significant amounts:');
  const significantOrders = allOrders
    .filter(o => o.checks?.some(c => c.totalAmount > 1000)) // > $10
    .slice(0, 5);
    
  significantOrders.forEach((order, idx) => {
    const orderTotal = order.checks.reduce((sum, check) => sum + (check.totalAmount || 0), 0);
    console.log(`${idx + 1}. Order ${order.guid.slice(0, 8)}... - $${(orderTotal/100).toFixed(2)} - ${new Date(order.createdDate).toLocaleTimeString()}`);
  });
  
  return { revenue: totalRevenue/100, checks: totalChecks, orders: allOrders.length };
}

async function main() {
  console.log('Toast API - Real Weekend Data Fetch');
  console.log('Location: Jack\'s on Water Street');
  
  const token = await getToastToken();
  if (!token) {
    console.error('Failed to authenticate');
    return;
  }
  
  // Fetch data using business dates
  const friday = await fetchAllOrdersForDay(token, '20250718', 'Friday, July 18th');
  const saturday = await fetchAllOrdersForDay(token, '20250719', 'Saturday, July 19th');
  
  console.log('\n\n========== WEEKEND TOTALS ==========');
  console.log(`Friday: $${friday.revenue.toFixed(2)} (${friday.checks} checks, ${friday.orders} orders)`);
  console.log(`Saturday: $${saturday.revenue.toFixed(2)} (${saturday.checks} checks, ${saturday.orders} orders)`);
  console.log(`\nWeekend Total: $${(friday.revenue + saturday.revenue).toFixed(2)}`);
  console.log(`Total Checks: ${friday.checks + saturday.checks}`);
}

main();