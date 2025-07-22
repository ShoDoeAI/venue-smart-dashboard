const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Toast API credentials
const TOAST_CLIENT_ID = process.env.TOAST_CLIENT_ID || 'mT5Nsj9fT2XhQ9p0OvaONnqpt1IPkrh7';
const TOAST_CLIENT_SECRET = process.env.TOAST_CLIENT_SECRET || '-PvyQasB-AopTOeL1ogLmQ5s5ZH1AbvwKdv2Shbe0NghzbmPvWyQ5O56akh6VNn4';
const TOAST_LOCATION_ID = process.env.TOAST_LOCATION_ID || 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c';

// Get Toast authentication token
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

// Fetch comprehensive Toast data
async function fetchToastData(dateRange = 730) { // Default to 2 years (730 days)
  const token = await getToastToken();
  if (!token) return null;

  const headers = {
    Authorization: `Bearer ${token}`,
    'Toast-Restaurant-External-ID': TOAST_LOCATION_ID,
  };

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - dateRange);

  try {
    // Fetch orders for the date range
    const ordersResponse = await axios.get(
      `https://ws-api.toasttab.com/orders/v2/ordersBulk?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
      { headers }
    );

    const orders = ordersResponse.data || [];
    
    // Process orders to extract detailed insights
    const analysis = {
      totalOrders: orders.length,
      totalRevenue: 0,
      itemsSold: {},
      paymentMethods: {},
      hourlyDistribution: {},
      dailyRevenue: {},
      customerFrequency: {},
      topItems: [],
      averageOrderValue: 0,
    };

    orders.forEach(order => {
      if (order.checks && Array.isArray(order.checks)) {
        order.checks.forEach(check => {
          const amount = check.totalAmount || 0;
          analysis.totalRevenue += amount;

          // Track daily revenue
          const orderDate = new Date(order.createdDate).toISOString().split('T')[0];
          analysis.dailyRevenue[orderDate] = (analysis.dailyRevenue[orderDate] || 0) + amount;

          // Track hourly distribution
          const hour = new Date(order.createdDate).getHours();
          analysis.hourlyDistribution[hour] = (analysis.hourlyDistribution[hour] || 0) + amount;

          // Track items sold
          if (check.lineItems) {
            check.lineItems.forEach(item => {
              const itemName = item.name || 'Unknown';
              if (!analysis.itemsSold[itemName]) {
                analysis.itemsSold[itemName] = { quantity: 0, revenue: 0 };
              }
              analysis.itemsSold[itemName].quantity += item.quantity || 1;
              analysis.itemsSold[itemName].revenue += item.price || 0;
            });
          }

          // Track payment methods
          if (check.payments) {
            check.payments.forEach(payment => {
              const method = payment.type || 'Unknown';
              analysis.paymentMethods[method] = (analysis.paymentMethods[method] || 0) + 1;
            });
          }
        });
      }
    });

    // Calculate top items
    analysis.topItems = Object.entries(analysis.itemsSold)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Calculate average order value
    analysis.averageOrderValue = analysis.totalRevenue / (orders.length || 1);

    // Add year-over-year analysis
    const currentYear = new Date().getFullYear();
    const lastYear = currentYear - 1;
    
    analysis.yearOverYear = {
      currentYear: { revenue: 0, orders: 0 },
      lastYear: { revenue: 0, orders: 0 },
      growth: 0
    };

    // Calculate monthly trends
    analysis.monthlyTrends = {};
    
    orders.forEach(order => {
      const orderDate = new Date(order.createdDate);
      const year = orderDate.getFullYear();
      const month = orderDate.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      
      if (!analysis.monthlyTrends[month]) {
        analysis.monthlyTrends[month] = { revenue: 0, orders: 0 };
      }
      
      if (order.checks) {
        const orderRevenue = order.checks.reduce((sum, check) => sum + (check.totalAmount || 0), 0);
        analysis.monthlyTrends[month].revenue += orderRevenue;
        analysis.monthlyTrends[month].orders += 1;
        
        if (year === currentYear) {
          analysis.yearOverYear.currentYear.revenue += orderRevenue;
          analysis.yearOverYear.currentYear.orders += 1;
        } else if (year === lastYear) {
          analysis.yearOverYear.lastYear.revenue += orderRevenue;
          analysis.yearOverYear.lastYear.orders += 1;
        }
      }
    });
    
    // Calculate YoY growth
    if (analysis.yearOverYear.lastYear.revenue > 0) {
      analysis.yearOverYear.growth = ((analysis.yearOverYear.currentYear.revenue - analysis.yearOverYear.lastYear.revenue) / analysis.yearOverYear.lastYear.revenue) * 100;
    }

    // Convert amounts from cents
    analysis.totalRevenue = analysis.totalRevenue / 100;
    analysis.averageOrderValue = analysis.averageOrderValue / 100;
    Object.keys(analysis.dailyRevenue).forEach(key => {
      analysis.dailyRevenue[key] = analysis.dailyRevenue[key] / 100;
    });
    Object.keys(analysis.hourlyDistribution).forEach(key => {
      analysis.hourlyDistribution[key] = analysis.hourlyDistribution[key] / 100;
    });
    analysis.topItems.forEach(item => {
      item.revenue = item.revenue / 100;
    });

    return analysis;
  } catch (error) {
    console.error('Error fetching Toast data:', error);
    return null;
  }
}

// Fetch real-time dashboard data
async function fetchDashboardData() {
  try {
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'https://venue-smart-dashboard.vercel.app';
    
    const response = await axios.get(`${baseUrl}/api/dashboard`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);
    return null;
  }
}

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, context } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Fetch all data sources
    const [dashboardData, toastAnalysis] = await Promise.all([
      fetchDashboardData(),
      fetchToastData(730), // Last 2 years (730 days)
    ]);
    
    // Extract current metrics
    const currentRevenue = dashboardData?.kpis?.revenueMetrics?.current || 0;
    const transactions = dashboardData?.kpis?.transactionMetrics?.count || 0;
    const avgTransaction = dashboardData?.kpis?.transactionMetrics?.avgAmount || 0;
    const alerts = dashboardData?.alerts || [];

    // Build comprehensive context
    const systemPrompt = `You are an AI assistant for Jack's on Water Street, a venue using VenueSync with full access to their Toast POS data spanning 2 years.

CURRENT STATUS (${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} EDT):
- Today's Revenue: $${currentRevenue.toFixed(2)} from ${transactions} transactions
- Average Transaction: $${avgTransaction.toFixed(2)}

${toastAnalysis ? `
TOAST POS HISTORICAL DATA (2 YEARS):
- Total Revenue: $${toastAnalysis.totalRevenue.toFixed(2)}
- Total Orders: ${toastAnalysis.totalOrders}
- Average Order Value: $${toastAnalysis.averageOrderValue.toFixed(2)}

YEAR-OVER-YEAR PERFORMANCE:
- ${new Date().getFullYear()} Revenue: $${(toastAnalysis.yearOverYear.currentYear.revenue / 100).toFixed(2)} (${toastAnalysis.yearOverYear.currentYear.orders} orders)
- ${new Date().getFullYear() - 1} Revenue: $${(toastAnalysis.yearOverYear.lastYear.revenue / 100).toFixed(2)} (${toastAnalysis.yearOverYear.lastYear.orders} orders)
- YoY Growth: ${toastAnalysis.yearOverYear.growth.toFixed(1)}%

TOP SELLING ITEMS:
${toastAnalysis.topItems.map((item, i) => `${i + 1}. ${item.name}: ${item.quantity} sold, $${item.revenue.toFixed(2)} revenue`).join('\n')}

DAILY REVENUE BREAKDOWN:
${Object.entries(toastAnalysis.dailyRevenue)
  .sort((a, b) => new Date(b[0]) - new Date(a[0]))
  .map(([date, revenue]) => `- ${new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}: $${revenue.toFixed(2)}`)
  .join('\n')}

PEAK HOURS (by revenue):
${Object.entries(toastAnalysis.hourlyDistribution)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5)
  .map(([hour, revenue]) => `- ${hour}:00: $${revenue.toFixed(2)}`)
  .join('\n')}

PAYMENT METHODS:
${Object.entries(toastAnalysis.paymentMethods)
  .map(([method, count]) => `- ${method}: ${count} transactions`)
  .join('\n')}
` : 'Toast data temporarily unavailable.'}

${alerts.length > 0 ? `\nACTIVE ALERTS:\n${alerts.map(a => `- ${a.title}: ${a.message}`).join('\n')}` : ''}

KEY INSIGHTS:
- The venue is closed on Mondays
- Weekend revenue typically 2x higher than weekdays
- Current timezone is EDT

You have access to comprehensive sales data, item performance, customer patterns, and payment trends. Provide specific, data-driven recommendations based on the actual Toast POS data. When analyzing, consider:
1. Item performance and profitability
2. Peak hours and staffing optimization
3. Payment method trends
4. Daily/weekly patterns
5. Menu optimization opportunities`;

    // Create the message
    const completion = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: message,
        },
      ],
      system: systemPrompt,
    });

    return res.status(200).json({
      success: true,
      response: completion.content[0].text,
      usage: completion.usage,
      dataContext: {
        hasToastData: !!toastAnalysis,
        hasDashboardData: !!dashboardData,
        dateRange: '7 days',
      }
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to process chat request',
    });
  }
};