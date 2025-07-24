const https = require('https');

// Your Toast credentials
const CLIENT_ID = 'mT5Nsj9fT2XhQ9p0OvaONnqpt1IPkrh7';
const CLIENT_SECRET = '-PvyQasB-AopTOeL1ogLmQ5s5ZH1AbvwKdv2Shbe0NghzbmPvWyQ5O56akh6VNn4';
const LOCATION_ID = 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c';

console.log('Testing Toast API with native HTTPS...\n');

// Step 1: Authenticate
const authData = JSON.stringify({
  clientId: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
  userAccessType: 'TOAST_MACHINE_CLIENT'
});

const authOptions = {
  hostname: 'ws-api.toasttab.com',
  path: '/authentication/v1/authentication/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': authData.length
  }
};

const authReq = https.request(authOptions, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200) {
      const response = JSON.parse(data);
      console.log('✅ Authentication successful!');
      
      const token = response.token.accessToken;
      
      // Step 2: Get restaurant info
      const restaurantOptions = {
        hostname: 'ws-api.toasttab.com',
        path: `/restaurants/v1/restaurants/${LOCATION_ID}`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Toast-Restaurant-External-ID': LOCATION_ID
        }
      };

      https.get(restaurantOptions, (res2) => {
        let restaurantData = '';
        
        res2.on('data', (chunk) => {
          restaurantData += chunk;
        });
        
        res2.on('end', () => {
          if (res2.statusCode === 200) {
            const restaurant = JSON.parse(restaurantData);
            console.log('\n📍 Restaurant Details:');
            console.log(`Name: ${restaurant.name}`);
            console.log(`Address: ${restaurant.address1}, ${restaurant.city}, ${restaurant.state}`);
            console.log(`Phone: ${restaurant.phone || 'N/A'}`);
          }
          
          // Step 3: Get recent orders
          const today = new Date();
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          
          const ordersPath = `/orders/v2/ordersBulk?startDate=${weekAgo.toISOString()}&endDate=${today.toISOString()}&pageSize=500`;
          
          const ordersOptions = {
            hostname: 'ws-api.toasttab.com',
            path: ordersPath,
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Toast-Restaurant-External-ID': LOCATION_ID
            }
          };
          
          console.log('\n📊 Fetching last 7 days of orders...');
          
          https.get(ordersOptions, (res3) => {
            let ordersData = '';
            
            res3.on('data', (chunk) => {
              ordersData += chunk;
            });
            
            res3.on('end', () => {
              if (res3.statusCode === 200) {
                const orders = JSON.parse(ordersData);
                console.log(`Found ${orders.length} orders\n`);
                
                // Analyze orders
                const dailyRevenue = {};
                const menuItems = new Set();
                
                orders.forEach(order => {
                  const date = new Date(order.createdDate).toLocaleDateString();
                  
                  if (!dailyRevenue[date]) {
                    dailyRevenue[date] = 0;
                  }
                  
                  if (order.checks) {
                    order.checks.forEach(check => {
                      dailyRevenue[date] += (check.totalAmount || 0) / 100;
                      
                      if (check.selections) {
                        check.selections.forEach(item => {
                          if (item.displayName) {
                            menuItems.add(item.displayName);
                          }
                        });
                      }
                    });
                  }
                });
                
                console.log('Daily Revenue:');
                Object.entries(dailyRevenue)
                  .sort((a, b) => new Date(a[0]) - new Date(b[0]))
                  .forEach(([date, revenue]) => {
                    console.log(`${date}: $${revenue.toFixed(2)}`);
                  });
                
                console.log('\nSample Menu Items:');
                Array.from(menuItems).slice(0, 10).forEach(item => {
                  console.log(`• ${item}`);
                });
                
                const totalRevenue = Object.values(dailyRevenue).reduce((a, b) => a + b, 0);
                console.log(`\nTotal 7-day revenue: $${totalRevenue.toFixed(2)}`);
                
                if (totalRevenue > 100 && menuItems.size > 5) {
                  console.log('\n✅ This appears to be REAL PRODUCTION DATA!');
                } else {
                  console.log('\n⚠️ Please verify if the menu items match your restaurant');
                }
              } else {
                console.log('Error fetching orders:', res3.statusCode);
              }
            });
          });
        });
      });
    } else {
      console.log('❌ Authentication failed:', res.statusCode);
      console.log('Response:', data);
    }
  });
});

authReq.on('error', (error) => {
  console.error('Error:', error);
});

authReq.write(authData);
authReq.end();