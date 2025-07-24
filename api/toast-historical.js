const axios = require('axios');

// Toast API credentials for Jack's on Water Street
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
      }
    );
    return response.data.token.accessToken;
  } catch (error) {
    console.error('Toast auth error:', error.response?.data || error.message);
    throw new Error('Failed to authenticate with Toast');
  }
}

async function fetchHistoricalData(startDate, endDate) {
  const token = await getToastToken();
  const headers = {
    Authorization: `Bearer ${token}`,
    'Toast-Restaurant-External-ID': TOAST_LOCATION_ID,
  };

  // Toast API limits to 10,000 records per request
  const pageSize = 10000;
  let allOrders = [];
  let hasMore = true;
  let page = 1;

  while (hasMore) {
    try {
      const response = await axios.get(
        `https://ws-api.toasttab.com/orders/v2/ordersBulk`, 
        {
          headers,
          params: {
            startDate: startDate,
            endDate: endDate,
            pageSize: pageSize,
            page: page
          }
        }
      );

      const orders = response.data || [];
      allOrders = allOrders.concat(orders);
      
      // Check if there are more pages
      hasMore = orders.length === pageSize;
      page++;
      
      console.log(`Fetched ${orders.length} orders from page ${page - 1}`);
    } catch (error) {
      console.error(`Error fetching page ${page}:`, error.message);
      hasMore = false;
    }
  }

  return allOrders;
}

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let startDate, endDate;

    if (req.method === 'GET') {
      // GET request - use query parameters
      startDate = req.query.startDate;
      endDate = req.query.endDate;
    } else if (req.method === 'POST') {
      // POST request - use body parameters
      const { startDate: bodyStart, endDate: bodyEnd } = req.body;
      startDate = bodyStart;
      endDate = bodyEnd;
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Validate dates
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        error: 'Start date and end date are required',
        example: '?startDate=2024-01-01&endDate=2024-01-31'
      });
    }

    // Convert to Date objects and validate
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    if (start > end) {
      return res.status(400).json({ error: 'Start date must be before end date' });
    }

    // Fetch data from Toast
    console.log(`Fetching Toast data from ${startDate} to ${endDate}`);
    const orders = await fetchHistoricalData(start.toISOString(), end.toISOString());

    // Analyze the data
    const analysis = {
      dateRange: {
        start: startDate,
        end: endDate
      },
      totalOrders: orders.length,
      totalRevenue: 0,
      totalTransactions: 0,
      dailyBreakdown: {},
      hourlyBreakdown: {},
      topItems: {},
      paymentBreakdown: {},
      orderDetails: []
    };

    // Process each order
    orders.forEach(order => {
      const orderDate = new Date(order.createdDate);
      const dateKey = orderDate.toISOString().split('T')[0];
      const hour = orderDate.getHours();
      
      // Initialize daily breakdown
      if (!analysis.dailyBreakdown[dateKey]) {
        analysis.dailyBreakdown[dateKey] = {
          date: dateKey,
          dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][orderDate.getDay()],
          revenue: 0,
          orders: 0,
          transactions: 0,
          avgCheck: 0
        };
      }

      // Initialize hourly breakdown
      if (!analysis.hourlyBreakdown[hour]) {
        analysis.hourlyBreakdown[hour] = {
          hour: hour,
          revenue: 0,
          orders: 0
        };
      }

      let orderRevenue = 0;
      let orderItems = [];

      if (order.checks && Array.isArray(order.checks)) {
        order.checks.forEach(check => {
          const checkAmount = (check.totalAmount || 0) / 100;
          orderRevenue += checkAmount;
          analysis.totalRevenue += checkAmount;
          analysis.totalTransactions++;

          // Track items
          if (check.selections) {
            check.selections.forEach(item => {
              const itemName = item.displayName || 'Unknown Item';
              const itemPrice = (item.price || 0) / 100;
              const quantity = item.quantity || 1;

              orderItems.push({
                name: itemName,
                quantity: quantity,
                price: itemPrice
              });

              if (!analysis.topItems[itemName]) {
                analysis.topItems[itemName] = {
                  name: itemName,
                  quantity: 0,
                  revenue: 0,
                  orders: 0
                };
              }
              
              analysis.topItems[itemName].quantity += quantity;
              analysis.topItems[itemName].revenue += itemPrice * quantity;
              analysis.topItems[itemName].orders++;
            });
          }

          // Track payment methods
          if (check.payments) {
            check.payments.forEach(payment => {
              const method = payment.type || 'Unknown';
              if (!analysis.paymentBreakdown[method]) {
                analysis.paymentBreakdown[method] = {
                  method: method,
                  count: 0,
                  amount: 0
                };
              }
              analysis.paymentBreakdown[method].count++;
              analysis.paymentBreakdown[method].amount += (payment.amount || 0) / 100;
            });
          }
        });
      }

      // Update daily breakdown
      analysis.dailyBreakdown[dateKey].revenue += orderRevenue;
      analysis.dailyBreakdown[dateKey].orders++;
      analysis.dailyBreakdown[dateKey].transactions += order.checks ? order.checks.length : 0;

      // Update hourly breakdown
      analysis.hourlyBreakdown[hour].revenue += orderRevenue;
      analysis.hourlyBreakdown[hour].orders++;

      // Add order details
      analysis.orderDetails.push({
        orderId: order.guid,
        date: order.createdDate,
        revenue: orderRevenue,
        items: orderItems,
        checkCount: order.checks ? order.checks.length : 0
      });
    });

    // Calculate averages
    Object.values(analysis.dailyBreakdown).forEach(day => {
      day.avgCheck = day.transactions > 0 ? day.revenue / day.transactions : 0;
    });

    // Sort top items by revenue
    analysis.topItems = Object.values(analysis.topItems)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 20);

    // Convert objects to arrays for easier consumption
    analysis.dailyBreakdown = Object.values(analysis.dailyBreakdown)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    analysis.hourlyBreakdown = Object.values(analysis.hourlyBreakdown)
      .sort((a, b) => a.hour - b.hour);
    
    analysis.paymentBreakdown = Object.values(analysis.paymentBreakdown)
      .sort((a, b) => b.amount - a.amount);

    // Add summary statistics
    analysis.summary = {
      avgDailyRevenue: analysis.totalRevenue / analysis.dailyBreakdown.length,
      avgOrderValue: analysis.totalRevenue / analysis.totalOrders,
      avgTransactionValue: analysis.totalRevenue / analysis.totalTransactions,
      peakDay: analysis.dailyBreakdown.reduce((max, day) => 
        day.revenue > (max?.revenue || 0) ? day : max, null),
      peakHour: analysis.hourlyBreakdown.reduce((max, hour) => 
        hour.revenue > (max?.revenue || 0) ? hour : max, null)
    };

    res.status(200).json({
      success: true,
      restaurant: {
        name: "Jack's on Water Street",
        locationId: TOAST_LOCATION_ID
      },
      data: analysis
    });

  } catch (error) {
    console.error('Historical data error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};