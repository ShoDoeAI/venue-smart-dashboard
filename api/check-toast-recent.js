const axios = require('axios');

const TOAST_CLIENT_ID = process.env.TOAST_CLIENT_ID || 'mT5Nsj9fT2XhQ9p0OvaONnqpt1IPkrh7';
const TOAST_CLIENT_SECRET =
  process.env.TOAST_CLIENT_SECRET ||
  '-PvyQasB-AopTOeL1ogLmQ5s5ZH1AbvwKdv2Shbe0NghzbmPvWyQ5O56akh6VNn4';
const TOAST_LOCATION_ID = process.env.TOAST_LOCATION_ID || 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c';

async function getToastToken() {
  const response = await axios.post(
    'https://ws-api.toasttab.com/authentication/v1/authentication/login',
    {
      clientId: TOAST_CLIENT_ID,
      clientSecret: TOAST_CLIENT_SECRET,
      userAccessType: 'TOAST_MACHINE_CLIENT',
    },
  );
  return response.data.token.accessToken;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const token = await getToastToken();
    const headers = {
      Authorization: `Bearer ${token}`,
      'Toast-Restaurant-External-ID': TOAST_LOCATION_ID,
    };

    // Get current date
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    // Check multiple date ranges
    const dateRanges = [
      {
        name: 'Today',
        start: today.toISOString(),
        end: now.toISOString(),
      },
      {
        name: 'Yesterday',
        start: new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString(),
        end: today.toISOString(),
      },
      {
        name: 'Last 7 days',
        start: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        end: now.toISOString(),
      },
      {
        name: 'July 2025',
        start: '2025-07-01T00:00:00.000Z',
        end: '2025-07-31T23:59:59.999Z',
      },
      {
        name: 'Last weekend (July 26-27)',
        start: '2025-07-26T00:00:00.000Z',
        end: '2025-07-27T23:59:59.999Z',
      },
    ];

    const results = {};

    for (const range of dateRanges) {
      console.log(`Checking ${range.name}...`);

      const response = await axios.get('https://ws-api.toasttab.com/orders/v2/ordersBulk', {
        headers,
        params: {
          startDate: range.start,
          endDate: range.end,
          pageSize: 100,
        },
      });

      const orders = response.data || [];

      let totalRevenue = 0;
      let totalChecks = 0;

      orders.forEach((order) => {
        if (order.checks) {
          order.checks.forEach((check) => {
            totalRevenue += (check.totalAmount || 0) / 100;
            totalChecks++;
          });
        }
      });

      results[range.name] = {
        startDate: range.start,
        endDate: range.end,
        orderCount: orders.length,
        checkCount: totalChecks,
        totalRevenue: totalRevenue.toFixed(2),
        firstOrder: orders[0]
          ? {
              guid: orders[0].guid,
              createdDate: orders[0].createdDate,
              businessDate: orders[0].businessDate,
              displayNumber: orders[0].displayNumber,
            }
          : null,
      };
    }

    // Also check the business date format Toast expects
    const businessDateCheck = await axios.get('https://ws-api.toasttab.com/orders/v2/ordersBulk', {
      headers,
      params: {
        businessDate: 20250728, // Today in YYYYMMDD format
        pageSize: 10,
      },
    });

    results['Business Date Check'] = {
      businessDate: 20250728,
      orderCount: businessDateCheck.data?.length || 0,
    };

    return res.status(200).json({
      success: true,
      locationId: TOAST_LOCATION_ID,
      currentTime: now.toISOString(),
      results,
    });
  } catch (error) {
    console.error('Toast check error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data || 'No additional details',
    });
  }
};
