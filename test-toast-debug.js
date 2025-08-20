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

async function debugToastAPI() {
  const accessToken = await getToastToken();
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Toast-Restaurant-External-ID': TOAST_LOCATION_ID
  };

  console.log('🔍 Testing Toast API with known good date (July 11, 2025)...\n');

  // Test a specific hour we know has data
  const testDate = '2025-07-11T20:00:00.000Z'; // 8 PM on July 11
  const endDate = '2025-07-11T21:00:00.000Z';

  try {
    // First, get orders
    console.log('1️⃣ Fetching orders...');
    const ordersResponse = await axios.get(`${TOAST_BASE_URL}/orders/v2/orders`, {
      headers,
      params: {
        restaurantGuid: TOAST_LOCATION_ID,
        startDate: testDate,
        endDate: endDate,
        pageSize: 100
      }
    });

    const orders = ordersResponse.data.orders || [];
    console.log(`   Found ${orders.length} orders`);
    
    if (orders.length > 0) {
      console.log('\n📋 First order structure:');
      const firstOrder = orders[0];
      console.log(`   Order GUID: ${firstOrder.guid}`);
      console.log(`   Business Date: ${firstOrder.businessDate}`);
      console.log(`   Has checks property: ${firstOrder.checks ? 'Yes' : 'No'}`);
      console.log(`   Number of checks: ${firstOrder.checks?.length || 0}`);
      
      if (firstOrder.checks && firstOrder.checks.length > 0) {
        console.log('\n💳 First check details:');
        const firstCheck = firstOrder.checks[0];
        console.log(`   Check GUID: ${firstCheck.guid}`);
        console.log(`   Total Amount: ${firstCheck.totalAmount}`);
        console.log(`   Deleted: ${firstCheck.deleted}`);
        console.log(`   Void Date: ${firstCheck.voidDate || 'Not voided'}`);
        console.log(`   Paid Date: ${firstCheck.paidDate || 'Not paid'}`);
      } else {
        console.log('\n⚠️  No checks in order response. Fetching checks separately...');
        
        // Try to fetch checks separately
        const checksResponse = await axios.get(`${TOAST_BASE_URL}/orders/v2/orders/${firstOrder.guid}/checks`, {
          headers
        });
        
        console.log(`   Checks API response: ${checksResponse.data.checks?.length || 0} checks`);
      }
    }

    // Test with businessDate parameter
    console.log('\n\n2️⃣ Testing with businessDate parameter...');
    const businessDateResponse = await axios.get(`${TOAST_BASE_URL}/orders/v2/orders`, {
      headers,
      params: {
        restaurantGuid: TOAST_LOCATION_ID,
        businessDate: 20250711,
        pageSize: 5
      }
    });
    
    console.log(`   Found ${businessDateResponse.data.orders?.length || 0} orders using businessDate`);

  } catch (error) {
    console.error('Error:', error.response?.status, error.response?.statusText);
    if (error.response?.data) {
      console.error('Details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

debugToastAPI().catch(console.error);