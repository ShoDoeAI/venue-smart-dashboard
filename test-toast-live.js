#!/usr/bin/env node

/**
 * Toast API Live Data Test
 * This script helps diagnose Toast API data accuracy issues
 */

const axios = require('axios');

// Your Toast credentials
const TOAST_CLIENT_ID = process.env.TOAST_CLIENT_ID || 'mT5Nsj9fT2XhQ9p0OvaONnqpt1IPkrh7';
const TOAST_CLIENT_SECRET = process.env.TOAST_CLIENT_SECRET || '-PvyQasB-AopTOeL1ogLmQ5s5ZH1AbvwKdv2Shbe0NghzbmPvWyQ5O56akh6VNn4';
const TOAST_LOCATION_ID = process.env.TOAST_LOCATION_ID || 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c';

// Check if using sandbox or production
const IS_SANDBOX = TOAST_CLIENT_ID.includes('sandbox') || process.env.TOAST_ENV === 'sandbox';
const API_BASE = IS_SANDBOX ? 'https://ws-sandbox-api.toasttab.com' : 'https://ws-api.toasttab.com';

console.log('🍞 Toast API Live Data Test\n');
console.log('Configuration:');
console.log('- Environment:', IS_SANDBOX ? 'SANDBOX' : 'PRODUCTION');
console.log('- API Base:', API_BASE);
console.log('- Location ID:', TOAST_LOCATION_ID);
console.log('- Client ID:', TOAST_CLIENT_ID.substring(0, 10) + '...');
console.log('');

async function getToken() {
  try {
    console.log('🔐 Authenticating with Toast...');
    const response = await axios.post(
      `${API_BASE}/authentication/v1/authentication/login`,
      {
        clientId: TOAST_CLIENT_ID,
        clientSecret: TOAST_CLIENT_SECRET,
        userAccessType: 'TOAST_MACHINE_CLIENT',
      }
    );
    console.log('✅ Authentication successful');
    return response.data.token.accessToken;
  } catch (error) {
    console.error('❌ Authentication failed:', error.response?.data || error.message);
    return null;
  }
}

async function testToastData(token) {
  const headers = {
    Authorization: `Bearer ${token}`,
    'Toast-Restaurant-External-ID': TOAST_LOCATION_ID,
  };

  // Test 1: Get Restaurant Info
  console.log('\n📍 Fetching Restaurant Info...');
  try {
    const restaurantResponse = await axios.get(
      `${API_BASE}/restaurants/v1/restaurants/${TOAST_LOCATION_ID}`,
      { headers }
    );
    const restaurant = restaurantResponse.data;
    console.log('✅ Restaurant:', restaurant.name || 'Unknown');
    console.log('   Timezone:', restaurant.timeZone || 'Not specified');
    console.log('   Management Group:', restaurant.managementGroupGuid || 'None');
  } catch (error) {
    console.error('❌ Restaurant fetch failed:', error.response?.data || error.message);
  }

  // Test 2: Get Today's Orders
  console.log('\n📊 Fetching Today\'s Orders...');
  
  // Get current date in restaurant timezone (assuming Eastern)
  const now = new Date();
  const today = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
  today.setHours(0, 0, 0, 0);
  
  const endTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
  
  const startDate = today.toISOString();
  const endDate = endTime.toISOString();
  
  console.log('   Date Range:', startDate, 'to', endDate);
  
  try {
    const ordersResponse = await axios.get(
      `${API_BASE}/orders/v2/ordersBulk?startDate=${startDate}&endDate=${endDate}&pageSize=100`,
      { headers }
    );
    
    const orders = ordersResponse.data || [];
    console.log(`✅ Found ${orders.length} orders today`);
    
    if (orders.length > 0) {
      // Calculate totals
      let totalRevenue = 0;
      let totalChecks = 0;
      const hourlyData = {};
      
      orders.forEach(order => {
        if (order.checks && Array.isArray(order.checks)) {
          order.checks.forEach(check => {
            totalChecks++;
            const amount = (check.totalAmount || 0) / 100; // Convert cents to dollars
            totalRevenue += amount;
            
            // Track hourly
            const orderTime = new Date(order.createdDate);
            const hour = orderTime.getHours();
            if (!hourlyData[hour]) {
              hourlyData[hour] = { count: 0, revenue: 0 };
            }
            hourlyData[hour].count++;
            hourlyData[hour].revenue += amount;
          });
        }
      });
      
      console.log(`\n💰 Today's Summary:`);
      console.log(`   Total Revenue: $${totalRevenue.toFixed(2)}`);
      console.log(`   Total Checks: ${totalChecks}`);
      console.log(`   Average Check: $${(totalRevenue / totalChecks).toFixed(2)}`);
      
      console.log(`\n⏰ Hourly Breakdown:`);
      Object.keys(hourlyData).sort((a, b) => parseInt(a) - parseInt(b)).forEach(hour => {
        const hourData = hourlyData[hour];
        console.log(`   ${hour.padStart(2, '0')}:00 - ${hourData.count} orders, $${hourData.revenue.toFixed(2)}`);
      });
      
      // Show recent orders
      console.log(`\n📝 Recent Orders (last 5):`);
      orders.slice(-5).forEach(order => {
        const orderTime = new Date(order.createdDate).toLocaleTimeString();
        const amount = order.checks?.reduce((sum, check) => sum + (check.totalAmount || 0), 0) / 100 || 0;
        console.log(`   ${orderTime} - Order ${order.guid.substring(0, 8)}... - $${amount.toFixed(2)}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Orders fetch failed:', error.response?.data || error.message);
  }

  // Test 3: Get Yesterday's Orders for comparison
  console.log('\n📊 Fetching Yesterday\'s Orders for Comparison...');
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayEnd = new Date(yesterday);
  yesterdayEnd.setHours(23, 59, 59, 999);
  
  try {
    const yesterdayResponse = await axios.get(
      `${API_BASE}/orders/v2/ordersBulk?startDate=${yesterday.toISOString()}&endDate=${yesterdayEnd.toISOString()}&pageSize=100`,
      { headers }
    );
    
    const yesterdayOrders = yesterdayResponse.data || [];
    console.log(`✅ Found ${yesterdayOrders.length} orders yesterday`);
    
    if (yesterdayOrders.length > 0) {
      let yesterdayRevenue = 0;
      yesterdayOrders.forEach(order => {
        if (order.checks) {
          order.checks.forEach(check => {
            yesterdayRevenue += (check.totalAmount || 0) / 100;
          });
        }
      });
      console.log(`   Yesterday's Revenue: $${yesterdayRevenue.toFixed(2)}`);
    }
  } catch (error) {
    console.error('❌ Yesterday fetch failed:', error.response?.data || error.message);
  }

  // Test 4: Check for any configuration issues
  console.log('\n🔍 Diagnostics:');
  console.log('   API Environment:', IS_SANDBOX ? 'SANDBOX (test data only)' : 'PRODUCTION (live data)');
  console.log('   Current Time:', new Date().toLocaleString());
  console.log('   Restaurant Time (EST):', new Date().toLocaleString("en-US", {timeZone: "America/New_York"}));
  
  if (IS_SANDBOX) {
    console.log('\n⚠️  WARNING: You are using SANDBOX credentials!');
    console.log('   Sandbox data is test data only and won\'t match your live restaurant.');
    console.log('   To get real data, you need production API credentials.');
  }
}

// Run the test
async function main() {
  const token = await getToken();
  if (token) {
    await testToastData(token);
  } else {
    console.error('\n❌ Failed to authenticate. Please check your credentials.');
  }
}

main().catch(console.error);