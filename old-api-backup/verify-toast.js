const axios = require('axios');

// Production Toast credentials
const TOAST_CLIENT_ID = process.env.TOAST_CLIENT_ID || 'mT5Nsj9fT2XhQ9p0OvaONnqpt1IPkrh7';
const TOAST_CLIENT_SECRET = process.env.TOAST_CLIENT_SECRET || '-PvyQasB-AopTOeL1ogLmQ5s5ZH1AbvwKdv2Shbe0NghzbmPvWyQ5O56akh6VNn4';
const TOAST_LOCATION_ID = process.env.TOAST_LOCATION_ID || 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c';

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  console.log('Verifying Toast API connection...');
  
  try {
    // Step 1: Authenticate
    const authResponse = await axios.post(
      'https://ws-api.toasttab.com/authentication/v1/authentication/login',
      {
        clientId: TOAST_CLIENT_ID,
        clientSecret: TOAST_CLIENT_SECRET,
        userAccessType: 'TOAST_MACHINE_CLIENT',
      }
    );
    
    const token = authResponse.data.token.accessToken;
    const headers = {
      Authorization: `Bearer ${token}`,
      'Toast-Restaurant-External-ID': TOAST_LOCATION_ID,
    };
    
    // Step 2: Get restaurant info
    let restaurantInfo = null;
    try {
      const restaurantResponse = await axios.get(
        `https://ws-api.toasttab.com/restaurants/v1/restaurants/${TOAST_LOCATION_ID}`,
        { headers }
      );
      restaurantInfo = {
        name: restaurantResponse.data.name,
        address: restaurantResponse.data.address1,
        city: restaurantResponse.data.city,
        state: restaurantResponse.data.state,
      };
    } catch (e) {
      console.log('Could not fetch restaurant details');
    }
    
    // Step 3: Get last weekend's data
    const today = new Date();
    const dayOfWeek = today.getDay();
    
    // Find last Saturday
    const lastSaturday = new Date(today);
    const daysToSaturday = dayOfWeek === 6 ? 7 : (dayOfWeek + 1);
    lastSaturday.setDate(lastSaturday.getDate() - daysToSaturday);
    lastSaturday.setHours(0, 0, 0, 0);
    
    // Saturday + Sunday range
    const sunday = new Date(lastSaturday);
    sunday.setDate(sunday.getDate() + 1);
    const monday = new Date(sunday);
    monday.setDate(monday.getDate() + 1);
    
    // Fetch weekend orders
    const weekendOrdersResponse = await axios.get(
      `https://ws-api.toasttab.com/orders/v2/ordersBulk?startDate=${lastSaturday.toISOString()}&endDate=${monday.toISOString()}&pageSize=1000`,
      { headers }
    );
    
    const weekendOrders = weekendOrdersResponse.data || [];
    let weekendRevenue = 0;
    let saturdayRevenue = 0;
    let sundayRevenue = 0;
    const menuItems = new Set();
    
    weekendOrders.forEach(order => {
      const orderDate = new Date(order.createdDate);
      const isSaturday = orderDate.getDay() === 6;
      
      if (order.checks) {
        order.checks.forEach(check => {
          const amount = (check.totalAmount || 0) / 100;
          weekendRevenue += amount;
          
          if (isSaturday) {
            saturdayRevenue += amount;
          } else {
            sundayRevenue += amount;
          }
          
          // Collect menu items
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
    
    // Step 4: Get today's data
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    
    const todayOrdersResponse = await axios.get(
      `https://ws-api.toasttab.com/orders/v2/ordersBulk?startDate=${todayStart.toISOString()}&endDate=${todayEnd.toISOString()}&pageSize=100`,
      { headers }
    );
    
    const todayOrders = todayOrdersResponse.data || [];
    let todayRevenue = 0;
    
    todayOrders.forEach(order => {
      if (order.checks) {
        order.checks.forEach(check => {
          todayRevenue += (check.totalAmount || 0) / 100;
        });
      }
    });
    
    // Step 5: Get historical data count
    const yearAgo = new Date();
    yearAgo.setFullYear(yearAgo.getFullYear() - 1);
    
    const historyResponse = await axios.get(
      `https://ws-api.toasttab.com/orders/v2/ordersBulk?startDate=${yearAgo.toISOString()}&endDate=${today.toISOString()}&pageSize=1`,
      { headers }
    );
    
    const totalHistoricalOrders = historyResponse.headers['x-total-count'] || 'Unknown';
    
    // Return comprehensive verification data
    res.status(200).json({
      success: true,
      verification: {
        authentication: 'SUCCESS',
        apiEnvironment: 'PRODUCTION',
        credentials: {
          clientId: TOAST_CLIENT_ID,
          locationId: TOAST_LOCATION_ID,
          accessType: 'TOAST_MACHINE_CLIENT'
        },
        restaurant: restaurantInfo,
        dataAccess: {
          historicalOrdersCount: totalHistoricalOrders,
          dataRangeAvailable: '1+ year'
        },
        lastWeekend: {
          dates: {
            saturday: lastSaturday.toLocaleDateString(),
            sunday: sunday.toLocaleDateString()
          },
          totalOrders: weekendOrders.length,
          saturdayRevenue: saturdayRevenue.toFixed(2),
          sundayRevenue: sundayRevenue.toFixed(2),
          totalRevenue: weekendRevenue.toFixed(2),
          sampleMenuItems: Array.from(menuItems).slice(0, 10)
        },
        today: {
          date: todayStart.toLocaleDateString(),
          dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][todayStart.getDay()],
          orders: todayOrders.length,
          revenue: todayRevenue.toFixed(2),
          status: todayRevenue > 0 ? 'OPEN' : 'CLOSED/NO_SALES'
        },
        dataQuality: {
          isProduction: weekendRevenue > 100,
          hasMenuItems: menuItems.size > 0,
          hasHistoricalData: totalHistoricalOrders !== 'Unknown' && parseInt(totalHistoricalOrders) > 0
        }
      }
    });
    
  } catch (error) {
    console.error('Verification error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data || null
    });
  }
};