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

async function testWorkingQuery() {
  const accessToken = await getToastToken();
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Toast-Restaurant-External-ID': TOAST_LOCATION_ID
  };

  console.log('🔍 Testing with exact parameters from successful sync...\n');

  // Test with a 1-hour window on July 11, 2025
  const testHour = new Date('2025-07-11T20:00:00.000Z');
  const endHour = new Date('2025-07-11T20:59:59.999Z');

  console.log('Testing 1-hour window:');
  console.log(`Start: ${testHour.toISOString()}`);
  console.log(`End: ${endHour.toISOString()}`);

  try {
    const response = await axios.get(`${TOAST_BASE_URL}/orders/v2/orders`, {
      headers,
      params: {
        restaurantGuid: TOAST_LOCATION_ID,
        startDate: testHour.toISOString(),
        endDate: endHour.toISOString(),
        pageSize: 100
      }
    });
    
    console.log(`\n✅ Success! Response status: ${response.status}`);
    console.log(`Total orders found: ${response.data.orders?.length || 0}`);
    console.log(`Has pageToken: ${response.data.pageToken ? 'Yes' : 'No'}`);
    
    if (response.data.orders && response.data.orders.length > 0) {
      const order = response.data.orders[0];
      console.log('\n📋 First order details:');
      console.log(`  GUID: ${order.guid}`);
      console.log(`  Business Date: ${order.businessDate}`);
      console.log(`  Created: ${order.createdDate}`);
      console.log(`  Display Number: ${order.displayNumber}`);
      console.log(`  Has checks: ${order.checks ? 'Yes' : 'No'}`);
    }
    
    // Now test fetching checks if orders don't include them
    if (response.data.orders?.length > 0 && !response.data.orders[0].checks) {
      console.log('\n🔍 Fetching checks separately...');
      const orderGuid = response.data.orders[0].guid;
      
      try {
        const checksUrl = `${TOAST_BASE_URL}/orders/v2/orders/${orderGuid}/checks`;
        console.log(`URL: ${checksUrl}`);
        
        const checksResponse = await axios.get(checksUrl, { headers });
        console.log(`Checks found: ${checksResponse.data.checks?.length || 0}`);
        
        if (checksResponse.data.checks?.length > 0) {
          const check = checksResponse.data.checks[0];
          console.log('\n💳 First check:');
          console.log(`  GUID: ${check.guid}`);
          console.log(`  Total: $${(check.totalAmount || 0) / 100}`);
          console.log(`  Paid: ${check.paidDate ? 'Yes' : 'No'}`);
        }
      } catch (checkError) {
        console.log('❌ Checks fetch failed:', checkError.response?.status);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.status, error.response?.statusText);
    if (error.response?.data) {
      console.error('Details:', error.response.data);
    }
  }

  // Test other endpoints
  console.log('\n\n🔍 Testing other Toast endpoints...');
  
  // Test if we can get restaurant info
  try {
    const restaurantResponse = await axios.get(`${TOAST_BASE_URL}/config/v2/restaurants/${TOAST_LOCATION_ID}`, {
      headers
    });
    console.log('✅ Restaurant endpoint works');
    console.log(`   Name: ${restaurantResponse.data.name || 'Unknown'}`);
  } catch (error) {
    console.log('❌ Restaurant endpoint failed:', error.response?.status);
  }

  // Test business date endpoint
  console.log('\n🔍 Testing orders by business date (different endpoint)...');
  try {
    const bdResponse = await axios.get(`${TOAST_BASE_URL}/orders/v2/ordersBulk`, {
      headers,
      params: {
        restaurantGuid: TOAST_LOCATION_ID,
        businessDate: 20250711
      }
    });
    console.log('Orders bulk endpoint:', bdResponse.data);
  } catch (error) {
    console.log('❌ Orders bulk failed:', error.response?.status);
  }
}

testWorkingQuery().catch(console.error);