const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

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
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    
    // Get today's transactions from simple_transactions view
    const { data: todayTransactions, error: todayError } = await supabase
      .from('simple_transactions')
      .select('*')
      .gte('transaction_date', todayStart.toISOString())
      .order('transaction_date', { ascending: false });
    
    if (todayError) throw todayError;
    
    // Get yesterday's transactions
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayEnd = new Date(todayStart);
    
    const { data: yesterdayTransactions, error: yesterdayError } = await supabase
      .from('simple_transactions')
      .select('*')
      .gte('transaction_date', yesterdayStart.toISOString())
      .lt('transaction_date', yesterdayEnd.toISOString());
    
    if (yesterdayError) throw yesterdayError;
    
    // Get last 7 days
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const { data: weekTransactions, error: weekError } = await supabase
      .from('simple_transactions')
      .select('*')
      .gte('transaction_date', weekAgo.toISOString());
    
    if (weekError) throw weekError;
    
    // Get last weekend (Friday-Sunday)
    const lastSaturday = new Date(now);
    const dayOfWeek = lastSaturday.getDay();
    const daysToSaturday = dayOfWeek === 6 ? 7 : (dayOfWeek + 1);
    lastSaturday.setDate(lastSaturday.getDate() - daysToSaturday);
    
    const friday = new Date(lastSaturday);
    friday.setDate(friday.getDate() - 1);
    friday.setHours(0, 0, 0, 0);
    
    const monday = new Date(lastSaturday);
    monday.setDate(monday.getDate() + 2);
    monday.setHours(0, 0, 0, 0);
    
    const { data: weekendTransactions, error: weekendError } = await supabase
      .from('simple_transactions')
      .select('*')
      .gte('transaction_date', friday.toISOString())
      .lt('transaction_date', monday.toISOString());
    
    if (weekendError) throw weekendError;
    
    // Get all data for menu items
    const { data: allTransactions, error: allError } = await supabase
      .from('simple_transactions')
      .select('*')
      .order('transaction_date', { ascending: false })
      .limit(500);
    
    if (allError) throw allError;
    
    // Calculate metrics
    const calculateMetrics = (transactions) => {
      const revenue = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
      const tax = transactions.reduce((sum, t) => sum + (t.tax || 0), 0);
      const tips = transactions.reduce((sum, t) => sum + (t.tip || 0), 0);
      const count = transactions.length;
      
      return {
        revenue,
        tax,
        tips,
        netRevenue: revenue - tax,
        transactions: count,
        orders: count,
        avgCheck: count > 0 ? revenue / count : 0
      };
    };
    
    const todayMetrics = calculateMetrics(todayTransactions || []);
    const yesterdayMetrics = calculateMetrics(yesterdayTransactions || []);
    const weekMetrics = calculateMetrics(weekTransactions || []);
    const weekendMetrics = calculateMetrics(weekendTransactions || []);
    
    // Calculate hourly breakdown for today
    const hourlyRevenue = {};
    (todayTransactions || []).forEach(t => {
      const hour = new Date(t.transaction_date).getHours();
      if (!hourlyRevenue[hour]) {
        hourlyRevenue[hour] = { revenue: 0, transactions: 0 };
      }
      hourlyRevenue[hour].revenue += (t.amount || 0);
      hourlyRevenue[hour].transactions++;
    });
    
    // Get sample menu items from metadata
    const menuItems = new Set();
    allTransactions.forEach(t => {
      if (t.metadata?.items) {
        t.metadata.items.forEach(item => {
          if (item.name) menuItems.add(item.name);
        });
      }
    });
    
    // Get alerts (if available)
    const { data: latestSnapshot } = await supabase
      .from('venue_snapshots')
      .select('alerts, kpis, snapshot_timestamp')
      .order('snapshot_timestamp', { ascending: false })
      .limit(1)
      .single();
    
    // Response
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      dataSource: 'database',
      lastSync: latestSnapshot?.snapshot_timestamp || null,
      restaurant: {
        name: "Jack's on Water Street",
        address: "123 Water Street",
        city: "Boston",
        state: "MA"
      },
      data: {
        overview: {
          revenue: todayMetrics.revenue,
          transactions: todayMetrics.transactions,
          orders: todayMetrics.orders,
          averageCheck: todayMetrics.avgCheck,
        },
        today: {
          revenue: todayMetrics.revenue,
          tax: todayMetrics.tax,
          tips: todayMetrics.tips,
          netRevenue: todayMetrics.netRevenue,
          transactions: todayMetrics.transactions,
          orders: todayMetrics.orders,
        },
        yesterday: {
          revenue: yesterdayMetrics.revenue,
          transactions: yesterdayMetrics.transactions,
          orders: yesterdayMetrics.orders,
        },
        lastWeekend: {
          revenue: weekendMetrics.revenue,
          transactions: weekendMetrics.transactions,
          orders: weekendMetrics.orders,
          dates: {
            friday: friday.toISOString().split('T')[0],
            sunday: new Date(monday.getTime() - 86400000).toISOString().split('T')[0]
          }
        },
        last7Days: {
          revenue: weekMetrics.revenue,
          transactions: weekMetrics.transactions,
          orders: weekMetrics.orders,
        },
        hourlyRevenue: hourlyRevenue,
        sampleMenuItems: Array.from(menuItems).slice(0, 10),
        totalMenuItems: menuItems.size,
      },
      kpis: latestSnapshot?.kpis || {
        overview: { revenue: 0, transactions: 0, orders: 0, averageCheck: 0 },
        today: { revenue: 0, transactions: 0, orders: 0 },
        yesterday: { revenue: 0, transactions: 0, orders: 0 },
        lastWeekend: { revenue: 0, transactions: 0, orders: 0 },
        last7Days: { revenue: 0, transactions: 0, orders: 0 }
      },
      alerts: latestSnapshot?.alerts || []
    };

    res.status(200).json(response);
    
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      dataSource: 'database',
      timestamp: new Date().toISOString()
    });
  }
};