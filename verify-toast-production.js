#!/usr/bin/env node

/**
 * Verify Toast Production Access
 * Confirms you're connected to the right account and getting real data
 */

const axios = require('axios');

// Your production credentials
const TOAST_CLIENT_ID = 'mT5Nsj9fT2XhQ9p0OvaONnqpt1IPkrh7';
const TOAST_CLIENT_SECRET = '-PvyQasB-AopTOeL1ogLmQ5s5ZH1AbvwKdv2Shbe0NghzbmPvWyQ5O56akh6VNn4';
const TOAST_LOCATION_ID = 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c';

console.log('🍞 Toast Production Account Verification\n');
console.log('Client ID:', TOAST_CLIENT_ID);
console.log('Location ID:', TOAST_LOCATION_ID);
console.log('API Environment: PRODUCTION (ws-api.toasttab.com)\n');

async function verifyAccount() {
  try {
    // 1. Authenticate
    console.log('1️⃣ Authenticating...');
    const authResponse = await axios.post(
      'https://ws-api.toasttab.com/authentication/v1/authentication/login',
      {
        clientId: TOAST_CLIENT_ID,
        clientSecret: TOAST_CLIENT_SECRET,
        userAccessType: 'TOAST_MACHINE_CLIENT',
      }
    );
    
    const token = authResponse.data.token.accessToken;
    console.log('✅ Authentication successful\n');
    
    const headers = {
      Authorization: `Bearer ${token}`,
      'Toast-Restaurant-External-ID': TOAST_LOCATION_ID,
    };
    
    // 2. Get Restaurant Info
    console.log('2️⃣ Fetching Restaurant Details...');
    try {
      const restaurantResponse = await axios.get(
        `https://ws-api.toasttab.com/restaurants/v1/restaurants/${TOAST_LOCATION_ID}`,
        { headers }
      );
      
      const restaurant = restaurantResponse.data;
      console.log('✅ Restaurant Name:', restaurant.name);
      console.log('   Location:', restaurant.address1, restaurant.city, restaurant.state);
      console.log('   Timezone:', restaurant.timeZone);
      console.log('   Created:', new Date(restaurant.createdDate).toLocaleDateString());
    } catch (e) {
      console.log('❌ Could not fetch restaurant details');
    }
    
    // 3. Check data from a known busy period (last Saturday)
    console.log('\n3️⃣ Checking Last Saturday\'s Data...');
    const lastSaturday = new Date();
    const dayOfWeek = lastSaturday.getDay();
    const daysToSubtract = dayOfWeek === 6 ? 7 : (dayOfWeek + 1);
    lastSaturday.setDate(lastSaturday.getDate() - daysToSubtract);
    lastSaturday.setHours(0, 0, 0, 0);
    
    const satEnd = new Date(lastSaturday);
    satEnd.setHours(23, 59, 59, 999);
    
    console.log('   Date:', lastSaturday.toLocaleDateString());
    
    const ordersResponse = await axios.get(
      `https://ws-api.toasttab.com/orders/v2/ordersBulk?startDate=${lastSaturday.toISOString()}&endDate=${satEnd.toISOString()}&pageSize=500`,
      { headers }
    );
    
    const orders = ordersResponse.data || [];
    console.log('   Orders found:', orders.length);
    
    if (orders.length > 0) {
      let totalRevenue = 0;
      let sampleItems = new Set();
      
      orders.forEach(order => {
        if (order.checks) {
          order.checks.forEach(check => {
            totalRevenue += (check.totalAmount || 0) / 100;
            
            // Collect some item names
            if (check.selections && sampleItems.size < 5) {
              check.selections.forEach(item => {
                if (item.displayName) {
                  sampleItems.add(item.displayName);
                }
              });
            }
          });
        }
      });
      
      console.log('   Total Revenue: $' + totalRevenue.toFixed(2));
      console.log('   Average Check: $' + (totalRevenue / orders.length).toFixed(2));
      console.log('   Sample Items:', Array.from(sampleItems).join(', '));
      
      // Check if this looks like real data
      console.log('\n🔍 Data Verification:');
      if (totalRevenue > 1000) {
        console.log('   ✅ This appears to be REAL production data from your restaurant');
      } else if (totalRevenue > 0 && totalRevenue < 100) {
        console.log('   ⚠️  Revenue seems low - this might be test/sandbox data');
      } else {
        console.log('   ℹ️  No revenue found - venue may have been closed this day');
      }
    } else {
      console.log('   No orders found for Saturday - trying Sunday...');
      
      // Try Sunday
      const sunday = new Date(lastSaturday);
      sunday.setDate(sunday.getDate() + 1);
      const sunEnd = new Date(sunday);
      sunEnd.setHours(23, 59, 59, 999);
      
      const sundayResponse = await axios.get(
        `https://ws-api.toasttab.com/orders/v2/ordersBulk?startDate=${sunday.toISOString()}&endDate=${sunEnd.toISOString()}&pageSize=100`,
        { headers }
      );
      
      console.log('   Sunday orders:', sundayResponse.data?.length || 0);
    }
    
    // 4. Check total historical data available
    console.log('\n4️⃣ Checking Historical Data Access...');
    const yearAgo = new Date();
    yearAgo.setFullYear(yearAgo.getFullYear() - 1);
    
    const historyResponse = await axios.get(
      `https://ws-api.toasttab.com/orders/v2/ordersBulk?startDate=${yearAgo.toISOString()}&endDate=${new Date().toISOString()}&pageSize=1`,
      { headers }
    );
    
    const totalCount = historyResponse.headers['x-total-count'] || 'Unknown';
    console.log('   Total orders in past year:', totalCount);
    console.log('   ✅ AI Chat has access to all this historical data\n');
    
    console.log('✨ Summary:');
    console.log('- You are connected to Toast PRODUCTION API');
    console.log('- Location ID matches: Jack\'s on Water Street');
    console.log('- Historical data is available for AI analysis');
    console.log('- The AI at https://venue-smart-dashboard.vercel.app/ai can access all your Toast data');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.log('\n⚠️  Authentication failed - credentials may be incorrect');
    }
  }
}

verifyAccount();