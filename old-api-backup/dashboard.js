const axios = require('axios');

// Toast API credentials
const TOAST_CLIENT_ID = process.env.TOAST_CLIENT_ID || 'mT5Nsj9fT2XhQ9p0OvaONnqpt1IPkrh7';
const TOAST_CLIENT_SECRET = process.env.TOAST_CLIENT_SECRET || '-PvyQasB-AopTOeL1ogLmQ5s5ZH1AbvwKdv2Shbe0NghzbmPvWyQ5O56akh6VNn4';
const TOAST_LOCATION_ID = process.env.TOAST_LOCATION_ID || 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c';

async function getToastToken() {
  try {
    const response = await axios.post(
      'https://ws-api.toasttab.com/authentication/v1/authentication/login',
      {
        clientId: TOAST_CLIENT_ID,
        clientSecret: TOAST_CLIENT_SECRET,
        userAccessType: 'TOAST_MACHINE_CLIENT',
      },
    );
    return response.data.token.accessToken;
  } catch (error) {
    console.error('Toast auth error:', error.response?.data || error.message);
    return null;
  }
}

async function fetchToastData(token) {
  const headers = {
    Authorization: `Bearer ${token}`,
    'Toast-Restaurant-External-ID': TOAST_LOCATION_ID,
  };

  const data = {
    today: { revenue: 0, transactions: 0, orders: [] },
    yesterday: { revenue: 0, transactions: 0, orders: [] },
    lastWeekend: { revenue: 0, transactions: 0, orders: [] },
    last7Days: { revenue: 0, transactions: 0, orders: [] },
    restaurantInfo: null,
    menuItems: [],
    hourlyRevenue: {},
  };

  try {
    // Get restaurant info
    try {
      const restaurantResponse = await axios.get(
        `https://ws-api.toasttab.com/restaurants/v1/restaurants/${TOAST_LOCATION_ID}`,
        { headers }
      );
      data.restaurantInfo = {
        name: restaurantResponse.data.name,
        address: restaurantResponse.data.address1,
        city: restaurantResponse.data.city,
        state: restaurantResponse.data.state,
      };
    } catch (e) {
      console.log('Could not fetch restaurant info');
    }

    // Get today's data
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    
    const todayResponse = await axios.get(
      `https://ws-api.toasttab.com/orders/v2/ordersBulk?startDate=${todayStart.toISOString()}&endDate=${now.toISOString()}&pageSize=1000`,
      { headers }
    );
    
    processTodayOrders(todayResponse.data || [], data.today, data);

    // Get yesterday's data
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(23, 59, 59, 999);
    
    const yesterdayResponse = await axios.get(
      `https://ws-api.toasttab.com/orders/v2/ordersBulk?startDate=${yesterday.toISOString()}&endDate=${yesterdayEnd.toISOString()}&pageSize=1000`,
      { headers }
    );
    
    processOrders(yesterdayResponse.data || [], data.yesterday, data);

    // Get last 7 days
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const weekResponse = await axios.get(
      `https://ws-api.toasttab.com/orders/v2/ordersBulk?startDate=${weekAgo.toISOString()}&endDate=${now.toISOString()}&pageSize=1000`,
      { headers }
    );
    
    const weekOrders = weekResponse.data || [];
    processOrders(weekOrders, data.last7Days, data);

    // Get last weekend data
    const lastSaturday = new Date(now);
    const dayOfWeek = lastSaturday.getDay();
    const daysToSaturday = dayOfWeek === 6 ? 7 : (dayOfWeek + 1);
    lastSaturday.setDate(lastSaturday.getDate() - daysToSaturday);
    lastSaturday.setHours(0, 0, 0, 0);
    
    const monday = new Date(lastSaturday);
    monday.setDate(monday.getDate() + 2);
    
    const weekendOrders = weekOrders.filter(order => {
      const orderDate = new Date(order.createdDate);
      return orderDate >= lastSaturday && orderDate < monday;
    });
    
    processOrders(weekendOrders, data.lastWeekend, data);

  } catch (error) {
    console.error('Toast data fetch error:', error.message);
  }

  return data;
}

function processTodayOrders(orders, summary, data) {
  orders.forEach((order) => {
    summary.orders.push(order);
    if (order.checks && Array.isArray(order.checks)) {
      order.checks.forEach((check) => {
        const amount = (check.totalAmount || 0) / 100;
        summary.revenue += amount;
        summary.transactions++;

        // Track hourly revenue for today
        const orderDate = new Date(order.createdDate);
        const hour = orderDate.getHours();
        if (!data.hourlyRevenue[hour]) {
          data.hourlyRevenue[hour] = { revenue: 0, transactions: 0 };
        }
        data.hourlyRevenue[hour].revenue += amount;
        data.hourlyRevenue[hour].transactions++;

        // Collect menu items
        if (check.selections) {
          check.selections.forEach(item => {
            if (item.displayName && !data.menuItems.includes(item.displayName)) {
              data.menuItems.push(item.displayName);
            }
          });
        }
      });
    }
  });
}

function processOrders(orders, summary, data) {
  orders.forEach((order) => {
    summary.orders.push(order);
    if (order.checks && Array.isArray(order.checks)) {
      order.checks.forEach((check) => {
        const amount = (check.totalAmount || 0) / 100;
        summary.revenue += amount;
        summary.transactions++;

        // Collect menu items
        if (check.selections) {
          check.selections.forEach(item => {
            if (item.displayName && !data.menuItems.includes(item.displayName)) {
              data.menuItems.push(item.displayName);
            }
          });
        }
      });
    }
  });
}

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = await getToastToken();
    if (!token) {
      throw new Error('Failed to authenticate with Toast');
    }

    const toastData = await fetchToastData(token);

    // Format response
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      restaurant: toastData.restaurantInfo,
      data: {
        overview: {
          revenue: toastData.today.revenue,
          transactions: toastData.today.transactions,
          orders: toastData.today.orders.length,
          averageCheck: toastData.today.transactions > 0 
            ? toastData.today.revenue / toastData.today.transactions 
            : 0,
        },
        today: {
          revenue: toastData.today.revenue,
          transactions: toastData.today.transactions,
          orders: toastData.today.orders.length,
        },
        yesterday: {
          revenue: toastData.yesterday.revenue,
          transactions: toastData.yesterday.transactions,
          orders: toastData.yesterday.orders.length,
        },
        lastWeekend: {
          revenue: toastData.lastWeekend.revenue,
          transactions: toastData.lastWeekend.transactions,
          orders: toastData.lastWeekend.orders.length,
        },
        last7Days: {
          revenue: toastData.last7Days.revenue,
          transactions: toastData.last7Days.transactions,
          orders: toastData.last7Days.orders.length,
        },
        hourlyRevenue: toastData.hourlyRevenue,
        sampleMenuItems: toastData.menuItems.slice(0, 10),
        totalMenuItems: toastData.menuItems.length,
      },
      debug: {
        clientId: TOAST_CLIENT_ID,
        locationId: TOAST_LOCATION_ID,
        apiEnvironment: 'PRODUCTION',
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};