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

  console.log(`\nFetching ${dayName} data...`);
  console.log(`Start: ${startDate}`);
  console.log(`End: ${endDate.toISOString()}`);

  try {
    const ordersResponse = await axios.get(
      `https://ws-api.toasttab.com/orders/v2/ordersBulk?startDate=${startDate}&endDate=${endDate.toISOString()}`,
      { headers }
    );
    
    let revenue = 0;
    let transactions = 0;
    let orderCount = 0;
    
    if (ordersResponse.data && Array.isArray(ordersResponse.data)) {
      orderCount = ordersResponse.data.length;
      console.log(`Found ${orderCount} orders`);
      
      ordersResponse.data.forEach(order => {
        if (order.checks && Array.isArray(order.checks)) {
          order.checks.forEach(check => {
            const amount = check.totalAmount || 0;
            revenue += amount;
            transactions++;
            
            // Debug first few amounts
            if (transactions <= 5) {
              console.log(`  Check amount: ${amount} (${amount/100} dollars)`);
            }
          });
        }
      });
    }
    
    console.log(`\n${dayName} (${date}):`);
    console.log(`Revenue: $${revenue.toFixed(2)} (raw amount from API)`);
    console.log(`Revenue: $${(revenue / 100).toFixed(2)} (if amounts are in cents)`);
    console.log(`Transactions: ${transactions}`);
    console.log(`Average: $${transactions > 0 ? (revenue / transactions).toFixed(2) : '0.00'} (raw)`);
    console.log(`Average: $${transactions > 0 ? (revenue / transactions / 100).toFixed(2) : '0.00'} (if cents)`);
    
    return { revenue, transactions, orderCount };
  } catch (error) {
    console.error('Orders fetch error:', error.response?.data || error.message);
    return { revenue: 0, transactions: 0, orderCount: 0 };
  }
}

async function main() {
  console.log('Fetching weekend totals from Toast API...');
  console.log('Today is Monday, July 21st, 2025');
  
  const token = await getToastToken();
  if (!token) {
    console.error('Failed to authenticate with Toast');
    return;
  }

  // Correct dates for last Friday and Saturday in July 2025
  const friday = await fetchDayData(token, '2025-07-18', 'Friday, July 18th');
  const saturday = await fetchDayData(token, '2025-07-19', 'Saturday, July 19th');

  console.log('\n====================');
  console.log('WEEKEND TOTALS:');
  console.log(`Total Revenue: $${(friday.revenue + saturday.revenue).toFixed(2)} (raw)`);
  console.log(`Total Revenue: $${((friday.revenue + saturday.revenue) / 100).toFixed(2)} (if cents)`);
  console.log(`Total Transactions: ${friday.transactions + saturday.transactions}`);
  console.log(`Total Orders: ${friday.orderCount + saturday.orderCount}`);
}

main();