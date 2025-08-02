require('dotenv').config({ path: '.env.local' });
const axios = require('axios');

async function countJuly19Orders() {
  try {
    // Get Toast token
    const authResponse = await axios.post(
      'https://ws-api.toasttab.com/authentication/v1/authentication/login',
      {
        clientId: process.env.TOAST_CLIENT_ID,
        clientSecret: process.env.TOAST_CLIENT_SECRET,
        userAccessType: 'TOAST_MACHINE_CLIENT',
      }
    );
    
    const token = authResponse.data.token.accessToken;
    
    // Count orders for July 19
    const response = await axios.get('https://ws-api.toasttab.com/orders/v2/ordersBulk', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Toast-Restaurant-External-ID': process.env.TOAST_LOCATION_ID,
      },
      params: {
        startDate: '2025-07-19T00:00:00.000Z',
        endDate: '2025-07-19T23:59:59.999Z',
        pageSize: 1,
        page: 1,
      },
    });
    
    // Toast doesn't return total count directly, so fetch first page to see
    const firstPageOrders = response.data || [];
    console.log(`First page has ${firstPageOrders.length} orders`);
    
    // Fetch a few more pages to estimate
    let totalOrders = firstPageOrders.length;
    let page = 2;
    
    while (page <= 5) { // Check first 5 pages
      const pageResponse = await axios.get('https://ws-api.toasttab.com/orders/v2/ordersBulk', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Toast-Restaurant-External-ID': process.env.TOAST_LOCATION_ID,
        },
        params: {
          startDate: '2025-07-19T00:00:00.000Z',
          endDate: '2025-07-19T23:59:59.999Z',
          pageSize: 100,
          page,
        },
      });
      
      const pageOrders = pageResponse.data || [];
      if (pageOrders.length === 0) break;
      
      totalOrders += pageOrders.length;
      console.log(`Page ${page}: ${pageOrders.length} orders (running total: ${totalOrders})`);
      
      if (pageOrders.length < 100) break; // Last page
      page++;
    }
    
    console.log(`\nJuly 19, 2025 has at least ${totalOrders} orders${page > 5 ? ' (more pages exist)' : ''}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

countJuly19Orders();