const axios = require('axios');

// Toast API credentials - use env vars or defaults
const TOAST_CLIENT_ID = process.env.TOAST_CLIENT_ID || 'mT5Nsj9fT2XhQ9p0OvaONnqpt1IPkrh7';
const TOAST_CLIENT_SECRET =
  process.env.TOAST_CLIENT_SECRET ||
  '-PvyQasB-AopTOeL1ogLmQ5s5ZH1AbvwKdv2Shbe0NghzbmPvWyQ5O56akh6VNn4';
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
  };

  try {
    // Get yesterday's date range (since venue is closed today)
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    const startOfDay = new Date(yesterday);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(yesterday);
    endOfDay.setHours(23, 59, 59, 999);

    const startDate = startOfDay.toISOString();
    const endDate = endOfDay.toISOString();

    // Fetch today's orders
    try {
      const ordersResponse = await axios.get(
        `https://ws-api.toasttab.com/orders/v2/ordersBulk?startDate=${startDate}&endDate=${endDate}`,
        { headers },
      );

      if (ordersResponse.data && Array.isArray(ordersResponse.data)) {
        data.orders = ordersResponse.data;

        // Calculate revenue and hourly breakdown
        data.orders.forEach((order) => {
          if (order.checks && Array.isArray(order.checks)) {
            order.checks.forEach((check) => {
              const amount = check.totalAmount || 0;
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
            });
          }
        });
      }
    } catch (orderError) {
      console.error('Orders fetch error:', orderError.response?.data || orderError.message);
    }
  } catch (error) {
    console.error('Toast data fetch error:', error.message);
  }

  return data;
}

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const now = new Date();
  const currentHour = now.getHours();

  // Get yesterday for data fetching (venue closed today)
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  // Initialize response data
  let totalRevenue = 0;
  let totalTransactions = 0;
  let toastData = null;
  let toastSuccess = false;

  // Try to get Toast data
  try {
    const token = await getToastToken();
    if (token) {
      toastData = await fetchToastData(token);
      if (toastData && toastData.revenue > 0) {
        toastSuccess = true;
        totalRevenue = toastData.revenue;
        totalTransactions = toastData.transactions;
      }
    }
  } catch (error) {
    console.error('Error fetching Toast data:', error);
  }

  // Build hourly data
  const hourlyData = [];

  if (toastSuccess && toastData) {
    // Use real Toast data
    for (let i = 0; i < 24; i++) {
      const hourData = toastData.hourlyRevenue[i] || { revenue: 0, transactions: 0 };
      hourlyData.push({
        hour: `${i}:00`,
        revenue: Math.round(hourData.revenue * 100) / 100,
        transactions: hourData.transactions,
      });
    }
  } else {
    // Generate mock data as fallback
    for (let i = 0; i < 24; i++) {
      if (i <= currentHour) {
        const isPeakHour = (i >= 12 && i <= 14) || (i >= 18 && i <= 22);
        const baseRevenue = isPeakHour ? 2000 : 800;
        const hourRevenue = Math.floor(baseRevenue + Math.random() * 1000);
        const hourTransactions = Math.floor(hourRevenue / 95);

        totalRevenue += hourRevenue;
        totalTransactions += hourTransactions;

        hourlyData.push({
          hour: `${i}:00`,
          revenue: hourRevenue,
          transactions: hourTransactions,
        });
      } else {
        hourlyData.push({
          hour: `${i}:00`,
          revenue: 0,
          transactions: 0,
        });
      }
    }
  }

  // Build response
  const response = {
    success: true,
    snapshot: {
      venue_id: 'default-venue-id',
      created_at: now.toISOString(),
      api_data: {
        toast: {
          success: toastSuccess,
          data: {
            location: {
              name: "Jack's on Water Street",
              id: TOAST_LOCATION_ID,
            },
            todayRevenue: toastData?.revenue || 0,
            todayTransactions: toastData?.transactions || 0,
            dataDate: yesterday.toISOString().split('T')[0],
            lastUpdated: now.toISOString(),
          },
        },
      },
    },
    kpis: {
      revenueMetrics: {
        current: totalRevenue,
        lastPeriod: Math.floor(totalRevenue * 0.92),
        growth: 8.0,
      },
      attendanceMetrics: {
        current: totalTransactions * 2.2,
        capacity: 500,
        utilizationRate: ((totalTransactions * 2.2) / 500) * 100,
      },
      transactionMetrics: {
        count: totalTransactions,
        avgAmount: totalRevenue / totalTransactions || 0,
      },
      eventMetrics: {
        ticketsSoldToday: 0,
      },
      upcomingEvents: [],
    },
    hourlyData,
    categoryBreakdown: [
      { name: 'Beer', value: totalRevenue * 0.35, percentage: 35 },
      { name: 'Cocktails', value: totalRevenue * 0.28, percentage: 28 },
      { name: 'Wine', value: totalRevenue * 0.22, percentage: 22 },
      { name: 'Food', value: totalRevenue * 0.15, percentage: 15 },
    ],
    alerts: [],
    lastUpdated: now.toISOString(),
  };

  return res.status(200).json(response);
};
