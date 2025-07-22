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

async function fetchDayData(token, date, dayName) {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Toast-Restaurant-External-ID': TOAST_LOCATION_ID
  };

  // Set date range for EDT (UTC-4)
  const startDate = new Date(date + 'T04:00:00.000Z').toISOString();
  const endDate = new Date(date + 'T03:59:59.999Z');
  endDate.setDate(endDate.getDate() + 1);

  try {
    const ordersResponse = await axios.get(
      `https://ws-api.toasttab.com/orders/v2/ordersBulk?startDate=${startDate}&endDate=${endDate.toISOString()}`,
      { headers }
    );
    
    let revenue = 0;
    let transactions = 0;
    
    if (ordersResponse.data && Array.isArray(ordersResponse.data)) {
      ordersResponse.data.forEach(order => {
        if (order.checks && Array.isArray(order.checks)) {
          order.checks.forEach(check => {
            const amount = check.totalAmount || 0;
            revenue += amount;
            transactions++;
          });
        }
      });
    }
    
    console.log(`\n${dayName} (${date}):`);
    console.log(`Revenue: $${revenue.toFixed(2)}`);
    console.log(`Transactions: ${transactions}`);
    console.log(`Average: $${transactions > 0 ? (revenue / transactions).toFixed(2) : '0.00'}`);
    
    return { revenue: revenue, transactions };
  } catch (error) {
    console.error('Orders fetch error:', error.response?.data || error.message);
    return { revenue: 0, transactions: 0 };
  }
}

async function main() {
  console.log('Fetching weekend totals from Toast API...');
  
  const token = await getToastToken();
  if (!token) {
    console.error('Failed to authenticate with Toast');
    return;
  }

  // Fetch Friday and Saturday data (July 18-19, 2025)
  const friday = await fetchDayData(token, '2025-07-18', 'Friday');
  const saturday = await fetchDayData(token, '2025-07-19', 'Saturday');

  console.log('\n====================');
  console.log('WEEKEND TOTALS:');
  console.log(`Total Revenue: $${(friday.revenue + saturday.revenue).toFixed(2)}`);
  console.log(`Total Transactions: ${friday.transactions + saturday.transactions}`);
}

main();