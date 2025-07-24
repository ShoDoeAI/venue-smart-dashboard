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
    menus: [],
    orders: [],
    revenue: 0,
    transactions: 0,
    hourlyRevenue: {},
    topItems: {},
    paymentTypes: {},
  };

  try {
    // Get TODAY's date range in Eastern Time
    const now = new Date();
    
    // Get current date in Eastern timezone
    const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    
    // Set to start of today in Eastern Time
    const startOfToday = new Date(easternTime);
    startOfToday.setHours(0, 0, 0, 0);
    
    // Current time is the end time
    const endTime = new Date();
    
    const startDate = startOfToday.toISOString();
    const endDate = endTime.toISOString();
    
    console.log('Fetching Toast data for:', startDate, 'to', endDate);

    // Fetch today's orders
    try {
      const ordersResponse = await axios.get(
        `https://ws-api.toasttab.com/orders/v2/ordersBulk?startDate=${startDate}&endDate=${endDate}&pageSize=500`,
        { headers },
      );

      if (ordersResponse.data && Array.isArray(ordersResponse.data)) {
        data.orders = ordersResponse.data;
        console.log(`Found ${data.orders.length} orders today`);

        // Calculate revenue and analytics
        data.orders.forEach((order) => {
          if (order.checks && Array.isArray(order.checks)) {
            order.checks.forEach((check) => {
              // Revenue (convert cents to dollars)
              const amount = (check.totalAmount || 0) / 100;
              data.revenue += amount;
              data.transactions++;

              // Track hourly revenue
              const orderDate = new Date(order.createdDate);
              const hour = orderDate.getHours();
              if (!data.hourlyRevenue[hour]) {
                data.hourlyRevenue[hour] = { revenue: 0, transactions: 0 };
              }
              data.hourlyRevenue[hour].revenue += amount;
              data.hourlyRevenue[hour].transactions++;

              // Track payment types
              if (check.payments && Array.isArray(check.payments)) {
                check.payments.forEach(payment => {
                  const type = payment.type || 'UNKNOWN';
                  if (!data.paymentTypes[type]) {
                    data.paymentTypes[type] = { count: 0, amount: 0 };
                  }
                  data.paymentTypes[type].count++;
                  data.paymentTypes[type].amount += (payment.amount || 0) / 100;
                });
              }

              // Track top items
              if (check.selections && Array.isArray(check.selections)) {
                check.selections.forEach(selection => {
                  const itemName = selection.displayName || 'Unknown Item';
                  if (!data.topItems[itemName]) {
                    data.topItems[itemName] = { count: 0, revenue: 0 };
                  }
                  data.topItems[itemName].count += selection.quantity || 1;
                  data.topItems[itemName].revenue += (selection.price || 0) / 100;
                });
              }
            });
          }
        });

        // Sort top items by revenue
        data.topItemsList = Object.entries(data.topItems)
          .sort((a, b) => b[1].revenue - a[1].revenue)
          .slice(0, 10)
          .map(([name, stats]) => ({
            name,
            count: stats.count,
            revenue: stats.revenue
          }));
      }
    } catch (orderError) {
      console.error('Orders fetch error:', orderError.response?.data || orderError.message);
    }
  } catch (error) {
    console.error('Toast data fetch error:', error.message);
  }

  return data;
}

// Main handler
module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Get Toast token
    const token = await getToastToken();
    if (!token) {
      throw new Error('Failed to authenticate with Toast');
    }

    // Fetch Toast data
    const toastData = await fetchToastData(token);

    // Create dashboard response
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        overview: {
          revenue: toastData.revenue,
          transactions: toastData.transactions,
          avgTransaction: toastData.transactions > 0 ? toastData.revenue / toastData.transactions : 0,
          ordersCount: toastData.orders.length,
        },
        hourlyRevenue: toastData.hourlyRevenue,
        topItems: toastData.topItemsList || [],
        paymentTypes: toastData.paymentTypes,
        recentOrders: toastData.orders.slice(-10).map(order => ({
          id: order.guid,
          time: order.createdDate,
          amount: order.checks?.reduce((sum, check) => sum + (check.totalAmount || 0), 0) / 100 || 0,
          items: order.checks?.flatMap(check => 
            check.selections?.map(s => s.displayName) || []
          ) || []
        })),
      },
      debug: {
        environment: process.env.TOAST_ENV || 'production',
        locationId: TOAST_LOCATION_ID,
        ordersFetched: toastData.orders.length,
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