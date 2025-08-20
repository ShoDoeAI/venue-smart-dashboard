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

async function testDifferentFormats() {
  const accessToken = await getToastToken();
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Toast-Restaurant-External-ID': TOAST_LOCATION_ID
  };

  console.log('🔍 Testing different date formats and parameters...\n');

  // Different date format tests
  const tests = [
    {
      name: 'ISO UTC (July 11, 2025)',
      params: {
        restaurantGuid: TOAST_LOCATION_ID,
        startDate: '2025-07-11T00:00:00.000Z',
        endDate: '2025-07-11T23:59:59.999Z'
      }
    },
    {
      name: 'ISO Eastern Time (July 11, 2025)',
      params: {
        restaurantGuid: TOAST_LOCATION_ID,
        startDate: '2025-07-11T00:00:00.000-04:00',
        endDate: '2025-07-11T23:59:59.999-04:00'
      }
    },
    {
      name: 'Business Date Integer',
      params: {
        restaurantGuid: TOAST_LOCATION_ID,
        businessDate: 20250711
      }
    },
    {
      name: 'Business Date String',
      params: {
        restaurantGuid: TOAST_LOCATION_ID,
        businessDate: '20250711'
      }
    },
    {
      name: 'Date strings without time',
      params: {
        restaurantGuid: TOAST_LOCATION_ID,
        startDate: '2025-07-11',
        endDate: '2025-07-11'
      }
    },
    {
      name: 'Modified Business Date (current date in YYYYMMDD)',
      params: {
        restaurantGuid: TOAST_LOCATION_ID,
        modifiedBusinessDate: 20250711
      }
    },
    {
      name: 'Created Date Range',
      params: {
        restaurantGuid: TOAST_LOCATION_ID,
        createdStartDate: '2025-07-11T00:00:00.000Z',
        createdEndDate: '2025-07-11T23:59:59.999Z'
      }
    }
  ];

  for (const test of tests) {
    console.log(`\nTesting: ${test.name}`);
    console.log(`Params:`, test.params);
    
    try {
      const response = await axios.get(`${TOAST_BASE_URL}/orders/v2/orders`, {
        headers,
        params: {
          ...test.params,
          pageSize: 5
        }
      });
      
      const orders = response.data.orders || [];
      console.log(`✅ Success! Found ${orders.length} orders`);
      
      if (orders.length > 0) {
        const firstOrder = orders[0];
        console.log(`   First order: ${firstOrder.displayNumber || firstOrder.guid}`);
        console.log(`   Business Date: ${firstOrder.businessDate}`);
        console.log(`   Created: ${firstOrder.createdDate}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.response?.status} ${error.response?.statusText}`);
      if (error.response?.status === 400) {
        console.log(`   Message: ${JSON.stringify(error.response.data).substring(0, 100)}...`);
      }
    }
  }

  // Test pagination
  console.log('\n\n📄 Testing with different pagination...');
  try {
    const response = await axios.get(`${TOAST_BASE_URL}/orders/v2/orders`, {
      headers,
      params: {
        restaurantGuid: TOAST_LOCATION_ID,
        pageSize: 1
      }
    });
    
    console.log(`Found ${response.data.orders?.length || 0} orders (pageSize=1)`);
    if (response.data.orders?.length > 0) {
      console.log('Order date:', response.data.orders[0].createdDate);
    }
  } catch (error) {
    console.log('Pagination test failed:', error.response?.status);
  }
}

testDifferentFormats().catch(console.error);