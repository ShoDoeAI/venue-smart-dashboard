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
        userAccessType: 'TOAST_MACHINE_CLIENT'
      }
    );
    return response.data.token.accessToken;
  } catch (error) {
    console.error('Toast auth error:', error.response?.data || error.message);
    return null;
  }
}

async function fetchDayData(token, startDate, endDate) {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Toast-Restaurant-External-ID': TOAST_LOCATION_ID
  };

  try {
    const ordersResponse = await axios.get(
      `https://ws-api.toasttab.com/orders/v2/ordersBulk?startDate=${startDate}&endDate=${endDate}`,
      { headers }
    );
    
    let revenue = 0;
    let transactions = 0;
    const hourlyRevenue = {};
    
    if (ordersResponse.data && Array.isArray(ordersResponse.data)) {
      ordersResponse.data.forEach(order => {
        if (order.checks && Array.isArray(order.checks)) {
          order.checks.forEach(check => {
            const amount = check.totalAmount || 0;
            revenue += amount;
            transactions++;
            
            const orderDate = new Date(order.createdDate);
            const hour = orderDate.getHours();
            if (!hourlyRevenue[hour]) {
              hourlyRevenue[hour] = { revenue: 0, transactions: 0 };
            }
            hourlyRevenue[hour].revenue += amount;
            hourlyRevenue[hour].transactions++;
          });
        }
      });
    }
    
    return { revenue, transactions, hourlyRevenue, orderCount: ordersResponse.data.length };
  } catch (error) {
    console.error('Orders fetch error:', error.response?.data || error.message);
    return { revenue: 0, transactions: 0, hourlyRevenue: {}, orderCount: 0 };
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const token = await getToastToken();
  if (!token) {
    return res.status(500).json({ error: 'Failed to authenticate with Toast' });
  }

  // Fetch Friday (July 18) and Saturday (July 19) data
  const fridayStart = '2025-07-18T04:00:00.000Z'; // Friday midnight EDT
  const fridayEnd = '2025-07-19T03:59:59.999Z';   // Friday 11:59pm EDT
  
  const saturdayStart = '2025-07-19T04:00:00.000Z'; // Saturday midnight EDT
  const saturdayEnd = '2025-07-20T03:59:59.999Z';   // Saturday 11:59pm EDT

  const [fridayData, saturdayData] = await Promise.all([
    fetchDayData(token, fridayStart, fridayEnd),
    fetchDayData(token, saturdayStart, saturdayEnd)
  ]);

  // Build hourly arrays for both days
  const buildHourlyArray = (hourlyData) => {
    const result = [];
    for (let i = 0; i < 24; i++) {
      const hour = hourlyData[i] || { revenue: 0, transactions: 0 };
      result.push({
        hour: `${i}:00`,
        revenue: Math.round(hour.revenue * 100) / 100,
        transactions: hour.transactions
      });
    }
    return result;
  };

  res.status(200).json({
    success: true,
    weekend: {
      friday: {
        date: '2025-07-18',
        dayName: 'Friday',
        revenue: Math.round(fridayData.revenue * 100) / 100,
        transactions: fridayData.transactions,
        avgTransaction: fridayData.transactions > 0 ? Math.round(fridayData.revenue / fridayData.transactions * 100) / 100 : 0,
        orderCount: fridayData.orderCount,
        hourlyBreakdown: buildHourlyArray(fridayData.hourlyRevenue)
      },
      saturday: {
        date: '2025-07-19',
        dayName: 'Saturday',
        revenue: Math.round(saturdayData.revenue * 100) / 100,
        transactions: saturdayData.transactions,
        avgTransaction: saturdayData.transactions > 0 ? Math.round(saturdayData.revenue / saturdayData.transactions * 100) / 100 : 0,
        orderCount: saturdayData.orderCount,
        hourlyBreakdown: buildHourlyArray(saturdayData.hourlyRevenue)
      },
      combined: {
        totalRevenue: Math.round((fridayData.revenue + saturdayData.revenue) * 100) / 100,
        totalTransactions: fridayData.transactions + saturdayData.transactions,
        avgTransaction: (fridayData.transactions + saturdayData.transactions) > 0 ? 
          Math.round((fridayData.revenue + saturdayData.revenue) / (fridayData.transactions + saturdayData.transactions) * 100) / 100 : 0
      }
    }
  });
};