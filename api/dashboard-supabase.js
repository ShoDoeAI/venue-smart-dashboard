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
    
    // Get latest snapshot with KPIs
    const { data: latestSnapshot, error: snapshotError } = await supabase
      .from('venue_snapshots')
      .select('*')
      .order('snapshot_timestamp', { ascending: false })
      .limit(1)
      .single();
    
    if (snapshotError && snapshotError.code !== 'PGRST116') {
      throw snapshotError;
    }
    
    // Get today's transactions from Supabase
    const { data: todayTransactions, error: todayError } = await supabase
      .from('toast_transactions')
      .select('*')
      .gte('created_at', todayStart.toISOString())
      .order('created_at', { ascending: false });
    
    if (todayError) throw todayError;
    
    // Get yesterday's transactions
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayEnd = new Date(todayStart);
    
    const { data: yesterdayTransactions, error: yesterdayError } = await supabase
      .from('toast_transactions')
      .select('*')
      .gte('created_at', yesterdayStart.toISOString())
      .lt('created_at', yesterdayEnd.toISOString());
    
    if (yesterdayError) throw yesterdayError;
    
    // Get last 7 days
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const { data: weekTransactions, error: weekError } = await supabase
      .from('toast_transactions')
      .select('*')
      .gte('created_at', weekAgo.toISOString());
    
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
      .from('toast_transactions')
      .select('*')
      .gte('created_at', friday.toISOString())
      .lt('created_at', monday.toISOString());
    
    if (weekendError) throw weekendError;
    
    // Calculate metrics
    const calculateMetrics = (transactions) => {
      const revenue = transactions.reduce((sum, t) => sum + (t.total_amount || 0) / 100, 0);
      const tax = transactions.reduce((sum, t) => sum + (t.tax_amount || 0) / 100, 0);
      const tips = transactions.reduce((sum, t) => sum + (t.tip_amount || 0) / 100, 0);
      const count = transactions.length;
      
      // Get unique menu items
      const menuItems = new Set();
      transactions.forEach(t => {
        if (t.itemizations && Array.isArray(t.itemizations)) {
          t.itemizations.forEach(item => {
            if (item.name || item.displayName) {
              menuItems.add(item.name || item.displayName);
            }
          });
        }
      });
      
      return {
        revenue,
        tax,
        tips,
        netRevenue: revenue - tax,
        transactions: count,
        orders: count, // In this schema, each transaction is an order
        avgCheck: count > 0 ? revenue / count : 0,
        menuItems: Array.from(menuItems)
      };
    };
    
    const todayMetrics = calculateMetrics(todayTransactions || []);
    const yesterdayMetrics = calculateMetrics(yesterdayTransactions || []);
    const weekMetrics = calculateMetrics(weekTransactions || []);
    const weekendMetrics = calculateMetrics(weekendTransactions || []);
    
    // Calculate hourly breakdown for today
    const hourlyRevenue = {};
    todayTransactions.forEach(t => {
      const hour = new Date(t.created_at).getHours();
      if (!hourlyRevenue[hour]) {
        hourlyRevenue[hour] = { revenue: 0, transactions: 0 };
      }
      hourlyRevenue[hour].revenue += (t.total_amount || 0) / 100;
      hourlyRevenue[hour].transactions++;
    });
    
    // Get alerts from latest snapshot
    const alerts = latestSnapshot?.alerts || [];
    
    // Response
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      dataSource: 'supabase',
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
        sampleMenuItems: todayMetrics.menuItems.slice(0, 10),
        totalMenuItems: todayMetrics.menuItems.length,
      },
      kpis: latestSnapshot?.kpis || null,
      alerts: alerts
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