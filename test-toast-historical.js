const axios = require('axios');
require('dotenv').config();

// Toast API credentials
const TOAST_CLIENT_ID = process.env.TOAST_CLIENT_ID || 'mT5Nsj9fT2XhQ9p0OvaONnqpt1IPkrh7';
const TOAST_CLIENT_SECRET = process.env.TOAST_CLIENT_SECRET || '-PvyQasB-AopTOeL1ogLmQ5s5ZH1AbvwKdv2Shbe0NghzbmPvWyQ5O56akh6VNn4';
const TOAST_LOCATION_ID = 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c';
const TOAST_BASE_URL = 'https://ws-api.toasttab.com';

async function getToastToken() {
  try {
    console.log('🔐 Authenticating with Toast API...');
    const response = await axios.post(
      `${TOAST_BASE_URL}/authentication/v1/authentication/login`,
      {
        clientId: TOAST_CLIENT_ID,
        clientSecret: TOAST_CLIENT_SECRET,
        userAccessType: 'TOAST_MACHINE_CLIENT'
      }
    );
    
    console.log('✅ Authentication successful!');
    return response.data.token.accessToken;
  } catch (error) {
    console.error('❌ Authentication failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testHistoricalData(accessToken) {
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Toast-Restaurant-External-ID': TOAST_LOCATION_ID
  };

  console.log('\n📊 Testing Historical Data Access\n');

  // Test different date ranges
  const testDates = [
    { label: 'Today (Aug 19, 2025)', start: '2025-08-19T00:00:00.000Z', end: '2025-08-19T01:00:00.000Z' },
    { label: 'July 2025', start: '2025-07-01T00:00:00.000Z', end: '2025-07-01T01:00:00.000Z' },
    { label: 'January 2025', start: '2025-01-01T00:00:00.000Z', end: '2025-01-01T01:00:00.000Z' },
    { label: 'December 2024', start: '2024-12-01T00:00:00.000Z', end: '2024-12-01T01:00:00.000Z' },
    { label: 'August 2024', start: '2024-08-01T00:00:00.000Z', end: '2024-08-01T01:00:00.000Z' },
    { label: 'January 2024', start: '2024-01-01T00:00:00.000Z', end: '2024-01-01T01:00:00.000Z' },
    { label: 'September 2023', start: '2023-09-01T00:00:00.000Z', end: '2023-09-01T01:00:00.000Z' },
  ];

  for (const test of testDates) {
    console.log(`\n🔍 Testing ${test.label}...`);
    
    try {
      const ordersUrl = `${TOAST_BASE_URL}/orders/v2/orders`;
      console.log(`   URL: ${ordersUrl}`);
      console.log(`   Params: restaurantGuid=${TOAST_LOCATION_ID}`);
      console.log(`           startDate=${test.start}`);
      console.log(`           endDate=${test.end}`);
      
      const response = await axios.get(ordersUrl, {
        headers,
        params: {
          restaurantGuid: TOAST_LOCATION_ID,
          startDate: test.start,
          endDate: test.end,
          pageSize: 5
        }
      });
      
      const orders = response.data.orders || [];
      console.log(`   ✅ Success! Found ${orders.length} orders`);
      
      if (orders.length > 0) {
        console.log(`   First order: ${orders[0].displayNumber} - ${new Date(orders[0].createdDate).toLocaleString()}`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.response?.status} ${error.response?.statusText}`);
      if (error.response?.data) {
        console.log(`   Details:`, JSON.stringify(error.response.data).substring(0, 200));
      }
    }
  }

  // Test what happens with businessDate parameter
  console.log('\n\n🔍 Testing businessDate parameter...');
  try {
    const response = await axios.get(`${TOAST_BASE_URL}/orders/v2/orders`, {
      headers,
      params: {
        restaurantGuid: TOAST_LOCATION_ID,
        businessDate: 20250801,
        pageSize: 5
      }
    });
    
    console.log('   ✅ businessDate parameter works!');
    console.log(`   Found ${response.data.orders?.length || 0} orders`);
  } catch (error) {
    console.log(`   ❌ businessDate parameter failed: ${error.response?.status}`);
  }
}

async function main() {
  try {
    const accessToken = await getToastToken();
    await testHistoricalData(accessToken);
  } catch (error) {
    console.error('Test failed:', error);
  }
}

main();