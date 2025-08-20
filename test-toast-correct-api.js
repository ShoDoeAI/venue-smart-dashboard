const axios = require('axios');
require('dotenv').config();

const TOAST_CLIENT_ID = process.env.TOAST_CLIENT_ID || 'mT5Nsj9fT2XhQ9p0OvaONnqpt1IPkrh7';
const TOAST_CLIENT_SECRET = process.env.TOAST_CLIENT_SECRET || '-PvyQasB-AopTOeL1ogLmQ5s5ZH1AbvwKdv2Shbe0NghzbmPvWyQ5O56akh6VNn4';
const TOAST_LOCATION_ID = process.env.TOAST_LOCATION_ID || 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c';
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

async function testCorrectAPI() {
  const accessToken = await getToastToken();
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Toast-Restaurant-External-ID': TOAST_LOCATION_ID
  };

  console.log('🔍 Testing correct Toast API format with pagination...\n');

  // Test dates
  const testDates = [
    { label: 'December 2024', businessDate: '20241201' },
    { label: 'January 2024', businessDate: '20240115' },
    { label: 'July 2024', businessDate: '20240715' },
    { label: 'September 2023', businessDate: '20230915' },
    { label: 'July 2025 (known good)', businessDate: '20250711' }
  ];

  for (const test of testDates) {
    console.log(`\n📅 Testing ${test.label} (${test.businessDate})...`);
    
    try {
      // Use page and pageSize parameters like the working script
      const url = `${TOAST_BASE_URL}/orders/v2/ordersBulk?businessDate=${test.businessDate}&page=1&pageSize=100`;
      console.log(`URL: ${url}`);
      
      const response = await axios.get(url, {
        headers,
        timeout: 30000
      });
      
      const orders = response.data || [];
      console.log(`✅ Success! Found ${Array.isArray(orders) ? orders.length : 0} orders`);
      
      if (orders.length > 0) {
        let totalRevenue = 0;
        let checkCount = 0;
        
        orders.forEach(order => {
          if (order.checks && Array.isArray(order.checks)) {
            order.checks.forEach(check => {
              if (!check.deleted && !check.voided) {
                totalRevenue += check.totalAmount || 0;
                checkCount++;
              }
            });
          }
        });
        
        console.log(`   Revenue: $${totalRevenue.toFixed(2)}`);
        console.log(`   Checks: ${checkCount}`);
        console.log(`   First order created: ${orders[0].createdDate}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.response?.status} ${error.response?.statusText}`);
      if (error.response?.data) {
        console.log(`   Details:`, JSON.stringify(error.response.data).substring(0, 200));
      }
    }
  }

  // Test without Toast-Restaurant-External-ID header
  console.log('\n\n🔍 Testing without Toast-Restaurant-External-ID header...');
  try {
    const response = await axios.get(
      `${TOAST_BASE_URL}/orders/v2/ordersBulk?businessDate=20240715&page=1&pageSize=10`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
          // Removed Toast-Restaurant-External-ID
        }
      }
    );
    console.log('Response:', response.data?.length || 0, 'orders');
  } catch (error) {
    console.log('Error:', error.response?.status);
  }
}

testCorrectAPI().catch(console.error);