#!/usr/bin/env node

const axios = require('axios');

// Your production Toast credentials
const config = {
  clientId: 'mT5Nsj9fT2XhQ9p0OvaONnqpt1IPkrh7',
  clientSecret: '-PvyQasB-AopTOeL1ogLmQ5s5ZH1AbvwKdv2Shbe0NghzbmPvWyQ5O56akh6VNn4',
  locationId: 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c',
  apiHost: 'https://ws-api.toasttab.com'
};

console.log('🍞 Testing Toast API - Real Data Verification\n');
console.log('Using credentials:');
console.log(`Client ID: ${config.clientId}`);
console.log(`Location ID: ${config.locationId}`);
console.log(`API Host: ${config.apiHost} (PRODUCTION)\n`);

async function verifyRealData() {
  try {
    // Step 1: Authenticate
    console.log('1️⃣  Authenticating with Toast...');
    const authResponse = await axios.post(
      `${config.apiHost}/authentication/v1/authentication/login`,
      {
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        userAccessType: 'TOAST_MACHINE_CLIENT',
      }
    );
    
    const token = authResponse.data.token.accessToken;
    console.log('✅ Authentication successful!\n');
    
    const headers = {
      Authorization: `Bearer ${token}`,
      'Toast-Restaurant-External-ID': config.locationId,
    };
    
    // Step 2: Get Restaurant Info
    console.log('2️⃣  Fetching restaurant details...');
    try {
      const restaurantResponse = await axios.get(
        `${config.apiHost}/restaurants/v1/restaurants/${config.locationId}`,
        { headers }
      );
      
      const restaurant = restaurantResponse.data;
      console.log('✅ Restaurant found!');
      console.log(`   Name: ${restaurant.name}`);
      console.log(`   Address: ${restaurant.address1}, ${restaurant.city}, ${restaurant.state}`);
      console.log(`   Phone: ${restaurant.phone}`);
      console.log(`   Timezone: ${restaurant.timeZone}`);
      console.log(`   Created: ${new Date(restaurant.createdDate).toLocaleDateString()}\n`);
    } catch (e) {
      console.log('❌ Could not fetch restaurant details\n');
    }
    
    // Step 3: Get last 7 days of orders to find weekend data
    console.log('3️⃣  Fetching last 7 days of orders...');
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    const ordersResponse = await axios.get(
      `${config.apiHost}/orders/v2/ordersBulk?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&pageSize=1000`,
      { headers }
    );
    
    const orders = ordersResponse.data || [];
    console.log(`✅ Found ${orders.length} orders in the last 7 days\n`);
    
    // Step 4: Analyze orders by day
    console.log('4️⃣  Analyzing order data by day...');
    const ordersByDay = {};
    const menuItems = new Set();
    
    orders.forEach(order => {
      const orderDate = new Date(order.createdDate);
      const dateKey = orderDate.toLocaleDateString();
      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][orderDate.getDay()];
      
      if (!ordersByDay[dateKey]) {
        ordersByDay[dateKey] = {
          date: dateKey,
          dayName: dayName,
          orders: 0,
          revenue: 0,
          items: []
        };
      }
      
      ordersByDay[dateKey].orders++;
      
      if (order.checks) {
        order.checks.forEach(check => {
          ordersByDay[dateKey].revenue += (check.totalAmount || 0) / 100;
          
          // Collect menu items
          if (check.selections) {
            check.selections.forEach(item => {
              if (item.displayName) {
                menuItems.add(item.displayName);
                ordersByDay[dateKey].items.push(item.displayName);
              }
            });
          }
        });
      }
    });
    
    // Display daily breakdown
    console.log('Daily Revenue Breakdown:');
    console.log('------------------------');
    Object.values(ordersByDay)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .forEach(day => {
        console.log(`${day.dayName.padEnd(10)} ${day.date}: $${day.revenue.toFixed(2).padStart(8)} (${day.orders} orders)`);
      });
    
    // Step 5: Show menu items to verify it's your restaurant
    console.log('\n5️⃣  Sample Menu Items (to verify this is your restaurant):');
    console.log('--------------------------------------------------------');
    const itemArray = Array.from(menuItems);
    itemArray.slice(0, 15).forEach(item => {
      console.log(`   • ${item}`);
    });
    
    if (itemArray.length > 15) {
      console.log(`   ... and ${itemArray.length - 15} more items`);
    }
    
    // Step 6: Data quality check
    console.log('\n6️⃣  Data Quality Check:');
    console.log('----------------------');
    const totalRevenue = Object.values(ordersByDay).reduce((sum, day) => sum + day.revenue, 0);
    const hasWeekendData = Object.values(ordersByDay).some(day => 
      (day.dayName === 'Friday' || day.dayName === 'Saturday' || day.dayName === 'Sunday') && day.revenue > 0
    );
    
    console.log(`Total 7-day revenue: $${totalRevenue.toFixed(2)}`);
    console.log(`Unique menu items: ${menuItems.size}`);
    console.log(`Has weekend data: ${hasWeekendData ? 'YES' : 'NO'}`);
    
    // Determine if this is real production data
    const isRealData = totalRevenue > 100 && menuItems.size > 5;
    
    console.log('\n🔍 VERIFICATION RESULT:');
    console.log('======================');
    if (isRealData) {
      console.log('✅ This appears to be REAL PRODUCTION DATA from your restaurant!');
      console.log('   - Significant revenue recorded');
      console.log('   - Multiple menu items found');
      console.log('   - Data looks authentic');
    } else if (totalRevenue === 0) {
      console.log('⚠️  No revenue found in the last 7 days');
      console.log('   - This could be normal if you were closed');
      console.log('   - Check the menu items above - do they look familiar?');
    } else {
      console.log('❓ Unable to confirm if this is production data');
      console.log('   - Low revenue might indicate test data');
      console.log('   - Please verify the menu items match your restaurant');
    }
    
    // Step 7: Check for older data
    console.log('\n7️⃣  Checking for historical data (30 days)...');
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const historyResponse = await axios.get(
      `${config.apiHost}/orders/v2/ordersBulk?startDate=${thirtyDaysAgo.toISOString()}&endDate=${endDate.toISOString()}&pageSize=1`,
      { headers }
    );
    
    const totalOrders = historyResponse.headers['x-total-count'] || '0';
    console.log(`Total orders in last 30 days: ${totalOrders}`);
    
    console.log('\n✨ TEST COMPLETE!');
    console.log('================');
    console.log('Please verify:');
    console.log('1. Is the restaurant name correct?');
    console.log('2. Do the menu items match your restaurant?');
    console.log('3. Does the revenue data look accurate for your typical week?');
    
  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n⚠️  Authentication failed - credentials may be incorrect');
    } else if (error.response?.status === 404) {
      console.log('\n⚠️  API endpoint not found - Toast API may have changed');
    }
  }
}

verifyRealData();