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

async function checkEndpoints(token) {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Toast-Restaurant-External-ID': TOAST_LOCATION_ID
  };

  // Try to fetch restaurant info first
  console.log('\n1. Checking restaurant info...');
  try {
    const restaurantResponse = await axios.get(
      'https://ws-api.toasttab.com/config/v2/restaurantInfo',
      { headers }
    );
    console.log('Restaurant:', restaurantResponse.data.name);
    console.log('Time Zone:', restaurantResponse.data.timeZone);
  } catch (error) {
    console.error('Restaurant info error:', error.response?.status);
  }

  // Check orders with pagination
  console.log('\n2. Checking orders with pagination...');
  const startDate = '2025-07-18T00:00:00.000Z';
  const endDate = '2025-07-19T23:59:59.999Z';
  
  try {
    // First page
    const ordersUrl = `https://ws-api.toasttab.com/orders/v2/ordersBulk?startDate=${startDate}&endDate=${endDate}&pageSize=50`;
    console.log('Fetching:', ordersUrl);
    
    const ordersResponse = await axios.get(ordersUrl, { headers });
    
    console.log('Response headers:', {
      hasMore: ordersResponse.headers['toast-has-more-results'],
      nextPage: ordersResponse.headers['toast-next-page-token']
    });
    
    if (ordersResponse.data && Array.isArray(ordersResponse.data)) {
      console.log(`Orders returned: ${ordersResponse.data.length}`);
      
      // Calculate real totals
      let totalRevenue = 0;
      let totalChecks = 0;
      
      ordersResponse.data.forEach(order => {
        if (order.checks && Array.isArray(order.checks)) {
          order.checks.forEach(check => {
            totalRevenue += check.totalAmount || 0;
            totalChecks++;
          });
        }
      });
      
      console.log(`Page 1 Revenue: $${(totalRevenue/100).toFixed(2)}`);
      console.log(`Page 1 Checks: ${totalChecks}`);
      
      // Check if there are more pages
      if (ordersResponse.headers['toast-has-more-results'] === 'true') {
        console.log('\nMore results available! Need to paginate...');
      }
    }
  } catch (error) {
    console.error('Orders error:', error.response?.status, error.response?.statusText);
  }

  // Try different date format
  console.log('\n3. Trying with businessDate parameter...');
  try {
    const businessDate = '20250718';
    const businessUrl = `https://ws-api.toasttab.com/orders/v2/ordersBulk?businessDate=${businessDate}`;
    console.log('Fetching:', businessUrl);
    
    const businessResponse = await axios.get(businessUrl, { headers });
    
    if (businessResponse.data && Array.isArray(businessResponse.data)) {
      console.log(`Orders for business date ${businessDate}: ${businessResponse.data.length}`);
      
      // Show a real order
      if (businessResponse.data.length > 0) {
        const sampleOrder = businessResponse.data.find(o => o.checks?.[0]?.totalAmount > 1000);
        if (sampleOrder) {
          console.log('\nSample real order:');
          console.log('Order ID:', sampleOrder.guid);
          console.log('Created:', new Date(sampleOrder.createdDate).toLocaleString());
          console.log('Check amount:', `$${(sampleOrder.checks[0].totalAmount/100).toFixed(2)}`);
        }
      }
    }
  } catch (error) {
    console.error('Business date error:', error.response?.status);
  }
}

async function main() {
  console.log('Toast API Endpoint Verification');
  
  const token = await getToastToken();
  if (!token) {
    console.error('Failed to authenticate');
    return;
  }
  
  await checkEndpoints(token);
}

main();