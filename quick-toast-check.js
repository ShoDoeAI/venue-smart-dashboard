const axios = require('axios');

// Your Toast production credentials
const config = {
  clientId: 'mT5Nsj9fT2XhQ9p0OvaONnqpt1IPkrh7',
  clientSecret: '-PvyQasB-AopTOeL1ogLmQ5s5ZH1AbvwKdv2Shbe0NghzbmPvWyQ5O56akh6VNn4',
  locationId: 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c',
  apiHost: 'https://ws-api.toasttab.com',
  userAccessType: 'TOAST_MACHINE_CLIENT'
};

async function quickCheck() {
  console.log('🍞 Quick Toast Account Check\n');
  
  try {
    // 1. Login
    console.log('Logging in...');
    const authResponse = await axios.post(
      `${config.apiHost}/authentication/v1/authentication/login`,
      {
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        userAccessType: config.userAccessType,
      }
    );
    
    const token = authResponse.data.token.accessToken;
    console.log('✅ Logged in successfully\n');
    
    // 2. Get last 30 days of data
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    console.log('Fetching last 30 days of orders...');
    const ordersResponse = await axios.get(
      `${config.apiHost}/orders/v2/ordersBulk?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&pageSize=1000`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Toast-Restaurant-External-ID': config.locationId,
        }
      }
    );
    
    const orders = ordersResponse.data || [];
    console.log(`✅ Found ${orders.length} orders in the last 30 days\n`);
    
    // 3. Calculate weekend vs weekday revenue
    let weekendRevenue = 0;
    let weekdayRevenue = 0;
    let weekendOrders = 0;
    let weekdayOrders = 0;
    
    orders.forEach(order => {
      const orderDate = new Date(order.createdDate);
      const dayOfWeek = orderDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6; // Fri, Sat, Sun
      
      if (order.checks) {
        const orderTotal = order.checks.reduce((sum, check) => sum + (check.totalAmount || 0), 0) / 100;
        
        if (isWeekend) {
          weekendRevenue += orderTotal;
          weekendOrders++;
        } else {
          weekdayRevenue += orderTotal;
          weekdayOrders++;
        }
      }
    });
    
    console.log('📊 30-Day Summary:');
    console.log(`   Weekend Revenue (Fri-Sun): $${weekendRevenue.toFixed(2)} (${weekendOrders} orders)`);
    console.log(`   Weekday Revenue (Mon-Thu): $${weekdayRevenue.toFixed(2)} (${weekdayOrders} orders)`);
    console.log(`   Total Revenue: $${(weekendRevenue + weekdayRevenue).toFixed(2)}`);
    
    // 4. Show some actual menu items to verify it's your restaurant
    console.log('\n🍔 Sample Menu Items from Recent Orders:');
    const itemNames = new Set();
    
    orders.slice(0, 20).forEach(order => {
      if (order.checks) {
        order.checks.forEach(check => {
          if (check.selections) {
            check.selections.forEach(item => {
              if (item.displayName && itemNames.size < 10) {
                itemNames.add(item.displayName);
              }
            });
          }
        });
      }
    });
    
    Array.from(itemNames).forEach(name => {
      console.log(`   • ${name}`);
    });
    
    console.log('\n✅ SUCCESS: You are connected to your Toast production account!');
    console.log('   The AI chat has access to all this data.');
    console.log('   Visit: https://venue-smart-dashboard.vercel.app/ai');
    
  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
  }
}

quickCheck();