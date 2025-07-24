require('dotenv').config({ path: '.env.local' });
const axios = require('axios');

console.log('\n🍞 Testing Jack\'s on Water Street Data\n');

async function testJacksData() {
  try {
    // Authenticate
    const authResponse = await axios.post(
      'https://ws-api.toasttab.com/authentication/v1/authentication/login',
      {
        clientId: process.env.TOAST_CLIENT_ID,
        clientSecret: process.env.TOAST_CLIENT_SECRET,
        userAccessType: 'TOAST_MACHINE_CLIENT',
      }
    );
    
    const token = authResponse.data.token.accessToken;
    const headers = {
      Authorization: `Bearer ${token}`,
      'Toast-Restaurant-External-ID': process.env.TOAST_LOCATION_ID,
    };
    
    console.log('✅ Connected to Jack\'s on Water Street\n');
    
    // Get today's data
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    
    console.log('📅 TODAY (' + now.toLocaleDateString() + ' - ' + ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][now.getDay()] + '):');
    
    const todayResponse = await axios.get(
      `https://ws-api.toasttab.com/orders/v2/ordersBulk?startDate=${todayStart.toISOString()}&endDate=${now.toISOString()}&pageSize=100`,
      { headers }
    );
    
    const todayOrders = todayResponse.data || [];
    let todayRevenue = 0;
    
    todayOrders.forEach(order => {
      if (order.checks) {
        order.checks.forEach(check => {
          todayRevenue += (check.totalAmount || 0) / 100;
        });
      }
    });
    
    console.log(`Orders: ${todayOrders.length}`);
    console.log(`Revenue: $${todayRevenue.toFixed(2)}`);
    console.log(todayRevenue === 0 ? '(Closed or no sales yet today)' : '');
    
    // Get last weekend (Friday-Sunday)
    console.log('\n📅 LAST WEEKEND:');
    const lastSaturday = new Date(now);
    const dayOfWeek = lastSaturday.getDay();
    const daysToSaturday = dayOfWeek === 6 ? 7 : (dayOfWeek + 1);
    lastSaturday.setDate(lastSaturday.getDate() - daysToSaturday);
    
    // Friday through Sunday
    const friday = new Date(lastSaturday);
    friday.setDate(friday.getDate() - 1);
    friday.setHours(0, 0, 0, 0);
    
    const monday = new Date(lastSaturday);
    monday.setDate(monday.getDate() + 2);
    
    const weekendResponse = await axios.get(
      `https://ws-api.toasttab.com/orders/v2/ordersBulk?startDate=${friday.toISOString()}&endDate=${monday.toISOString()}&pageSize=1000`,
      { headers }
    );
    
    const weekendOrders = weekendResponse.data || [];
    let fridayRevenue = 0, saturdayRevenue = 0, sundayRevenue = 0;
    let menuItems = new Set();
    
    weekendOrders.forEach(order => {
      const orderDate = new Date(order.createdDate);
      const dayOfWeek = orderDate.getDay();
      
      if (order.checks) {
        order.checks.forEach(check => {
          const amount = (check.totalAmount || 0) / 100;
          
          if (dayOfWeek === 5) fridayRevenue += amount;
          else if (dayOfWeek === 6) saturdayRevenue += amount;
          else if (dayOfWeek === 0) sundayRevenue += amount;
          
          // Collect menu items
          if (check.selections) {
            check.selections.forEach(item => {
              if (item.displayName) menuItems.add(item.displayName);
            });
          }
        });
      }
    });
    
    console.log(`Friday (${friday.toLocaleDateString()}): $${fridayRevenue.toFixed(2)}`);
    console.log(`Saturday (${new Date(friday.getTime() + 86400000).toLocaleDateString()}): $${saturdayRevenue.toFixed(2)}`);
    console.log(`Sunday (${new Date(friday.getTime() + 172800000).toLocaleDateString()}): $${sundayRevenue.toFixed(2)}`);
    console.log(`Total Weekend Revenue: $${(fridayRevenue + saturdayRevenue + sundayRevenue).toFixed(2)}`);
    console.log(`Weekend Orders: ${weekendOrders.length}`);
    
    // Show some menu items
    console.log('\n🍔 SAMPLE MENU ITEMS:');
    Array.from(menuItems).slice(0, 10).forEach(item => {
      console.log(`  • ${item}`);
    });
    
    // Check what the current dashboard.js would show (yesterday's data)
    console.log('\n⚠️  WHAT YOUR CURRENT DASHBOARD SHOWS:');
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(23, 59, 59, 999);
    
    const yesterdayResponse = await axios.get(
      `https://ws-api.toasttab.com/orders/v2/ordersBulk?startDate=${yesterday.toISOString()}&endDate=${yesterdayEnd.toISOString()}&pageSize=100`,
      { headers }
    );
    
    const yesterdayOrders = yesterdayResponse.data || [];
    let yesterdayRevenue = 0;
    
    yesterdayOrders.forEach(order => {
      if (order.checks) {
        order.checks.forEach(check => {
          yesterdayRevenue += (check.totalAmount || 0) / 100;
        });
      }
    });
    
    console.log(`Yesterday (${yesterday.toLocaleDateString()} - ${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][yesterday.getDay()]}): $${yesterdayRevenue.toFixed(2)}`);
    console.log('(Your current dashboard.js shows yesterday\'s data, not today\'s!)');
    
    // Data quality check
    console.log('\n✅ DATA VERIFICATION:');
    const totalWeekendRevenue = fridayRevenue + saturdayRevenue + sundayRevenue;
    if (totalWeekendRevenue > 100) {
      console.log('This is REAL PRODUCTION DATA from Jack\'s on Water Street');
    } else {
      console.log('Low/no weekend revenue - are you sure you were open?');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testJacksData();