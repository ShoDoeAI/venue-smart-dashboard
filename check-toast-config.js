const axios = require('axios');

const TOAST_CLIENT_ID = 'mT5Nsj9fT2XhQ9p0OvaONnqpt1IPkrh7';
const TOAST_CLIENT_SECRET = '-PvyQasB-AopTOeL1ogLmQ5s5ZH1AbvwKdv2Shbe0NghzbmPvWyQ5O56akh6VNn4';
const TOAST_LOCATION_ID = 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c';

async function getToastToken() {
  try {
    // Try production endpoint
    console.log('Attempting to authenticate...');
    const response = await axios.post(
      'https://ws-api.toasttab.com/authentication/v1/authentication/login',
      {
        clientId: TOAST_CLIENT_ID,
        clientSecret: TOAST_CLIENT_SECRET,
        userAccessType: 'TOAST_MACHINE_CLIENT'
      }
    );
    console.log('✓ Authentication successful');
    console.log('Token type:', response.data.token.tokenType);
    return response.data.token.accessToken;
  } catch (error) {
    console.error('✗ Authentication failed:', error.response?.status, error.response?.statusText);
    return null;
  }
}

async function checkConfiguration(token) {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Toast-Restaurant-External-ID': TOAST_LOCATION_ID
  };

  // 1. Check restaurant configuration
  console.log('\n1. Checking restaurant configuration...');
  try {
    const configUrl = 'https://ws-api.toasttab.com/restaurants/v1/restaurants';
    const configResponse = await axios.get(configUrl, { headers });
    console.log('Restaurant config:', JSON.stringify(configResponse.data, null, 2));
  } catch (error) {
    console.log('Config endpoint error:', error.response?.status);
  }

  // 2. Check location details
  console.log('\n2. Checking location details...');
  try {
    const locationUrl = `https://ws-api.toasttab.com/restaurants/v1/restaurants/${TOAST_LOCATION_ID}`;
    const locationResponse = await axios.get(locationUrl, { headers });
    if (locationResponse.data) {
      console.log('Location name:', locationResponse.data.name);
      console.log('Location type:', locationResponse.data.locationType);
    }
  } catch (error) {
    console.log('Location endpoint error:', error.response?.status);
  }

  // 3. Check payments endpoint (real transactions)
  console.log('\n3. Checking payments data...');
  try {
    const paymentsUrl = `https://ws-api.toasttab.com/payments/v2/payments?businessDate=20250718`;
    const paymentsResponse = await axios.get(paymentsUrl, { headers });
    console.log('Payments found:', paymentsResponse.data?.length || 0);
    
    if (paymentsResponse.data && paymentsResponse.data.length > 0) {
      const sample = paymentsResponse.data[0];
      console.log('Sample payment amount:', sample.amount);
      console.log('Sample payment type:', sample.type);
    }
  } catch (error) {
    console.log('Payments endpoint error:', error.response?.status);
  }

  // 4. Check cash management endpoint
  console.log('\n4. Checking cash management data...');
  try {
    const cashUrl = `https://ws-api.toasttab.com/cash/v1/cashEntries?businessDate=20250718`;
    const cashResponse = await axios.get(cashUrl, { headers });
    console.log('Cash entries found:', cashResponse.data?.length || 0);
  } catch (error) {
    console.log('Cash endpoint error:', error.response?.status);
  }

  // 5. Try orders with different parameters
  console.log('\n5. Testing order endpoints...');
  
  // Try with paging=false to get all results
  try {
    const ordersUrl = `https://ws-api.toasttab.com/orders/v2/ordersBulk?businessDate=20250718&paging=false`;
    console.log('Fetching with paging=false...');
    const ordersResponse = await axios.get(ordersUrl, { headers });
    console.log('Orders returned:', ordersResponse.data?.length || 0);
    
    if (ordersResponse.data && ordersResponse.data.length > 0) {
      // Find orders with real amounts
      const realOrders = ordersResponse.data.filter(order => {
        const total = order.checks?.reduce((sum, check) => sum + (check.totalAmount || 0), 0) || 0;
        return total > 500; // Over $5
      });
      console.log('Orders over $5:', realOrders.length);
      
      if (realOrders.length > 0) {
        const sample = realOrders[0];
        const sampleTotal = sample.checks.reduce((sum, check) => sum + check.totalAmount, 0);
        console.log('Sample real order total:', `$${(sampleTotal/100).toFixed(2)}`);
      }
    }
  } catch (error) {
    console.log('Orders with paging=false error:', error.response?.status);
  }
}

async function main() {
  console.log('Toast API Configuration Check');
  console.log('Location ID:', TOAST_LOCATION_ID);
  
  const token = await getToastToken();
  if (!token) {
    console.error('Cannot proceed without authentication');
    return;
  }
  
  await checkConfiguration(token);
  
  console.log('\n\nDIAGNOSIS:');
  console.log('If you\'re seeing test data with small amounts, possible causes:');
  console.log('1. The API credentials might be for a sandbox/test environment');
  console.log('2. The location ID might be for a test restaurant');
  console.log('3. You may need different API scopes or permissions');
  console.log('\nContact Toast support to verify these are production credentials.');
}

main();