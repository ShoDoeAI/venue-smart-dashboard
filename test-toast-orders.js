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

async function fetchTodaysOrders() {
  const token = await getToastToken();
  if (!token) {
    console.log('❌ Failed to get Toast token');
    return;
  }
  
  console.log('✅ Got Toast token');
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Toast-Restaurant-External-ID': TOAST_LOCATION_ID
  };
  
  // Get today's date range
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  
  const startDate = startOfDay.toISOString();
  const endDate = endOfDay.toISOString();
  
  console.log(`\n📅 Fetching orders from ${startDate} to ${endDate}`);
  
  try {
    const response = await axios.get(
      `https://ws-api.toasttab.com/orders/v2/ordersBulk?startDate=${startDate}&endDate=${endDate}`,
      { headers }
    );
    
    console.log(`\n📊 Response status: ${response.status}`);
    console.log(`📦 Orders found: ${response.data?.length || 0}`);
    
    if (response.data && Array.isArray(response.data)) {
      let totalRevenue = 0;
      let totalTransactions = 0;
      const hourlyRevenue = {};
      
      response.data.forEach(order => {
        if (order.checks && Array.isArray(order.checks)) {
          order.checks.forEach(check => {
            const amount = check.totalAmount || 0;
            totalRevenue += amount;
            totalTransactions++;
            
            // Track hourly revenue
            const orderDate = new Date(order.createdDate);
            const hour = orderDate.getHours();
            if (!hourlyRevenue[hour]) {
              hourlyRevenue[hour] = { revenue: 0, transactions: 0 };
            }
            hourlyRevenue[hour].revenue += amount;
            hourlyRevenue[hour].transactions++;
          });
        }
      });
      
      console.log(`\n💰 Today's Total Revenue: $${totalRevenue.toFixed(2)}`);
      console.log(`📈 Total Transactions: ${totalTransactions}`);
      console.log(`💵 Average Transaction: $${(totalRevenue / totalTransactions || 0).toFixed(2)}`);
      
      console.log('\n⏰ Hourly Breakdown:');
      for (let i = 0; i < 24; i++) {
        if (hourlyRevenue[i]) {
          console.log(`  ${i}:00 - Revenue: $${hourlyRevenue[i].revenue.toFixed(2)}, Transactions: ${hourlyRevenue[i].transactions}`);
        }
      }
      
      // Show sample order
      if (response.data.length > 0) {
        console.log('\n📝 Sample Order:');
        console.log(JSON.stringify(response.data[0], null, 2));
      }
    }
  } catch (error) {
    console.error('\n❌ Orders fetch error:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
    console.error('Headers:', error.response?.headers);
  }
}

// Run the test
console.log('🚀 Testing Toast Orders API...\n');
fetchTodaysOrders();