const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// This runs every 3 minutes via Vercel cron
module.exports = async (req, res) => {
  console.log('🔄 Starting data sync cron job...');
  
  try {
    // Create a new snapshot entry
    const { data: snapshot, error: snapshotError } = await supabase
      .from('venue_snapshots')
      .insert({
        snapshot_timestamp: new Date().toISOString(),
        eventbrite_fetched: false,
        toast_fetched: false,
        wisk_fetched: false,
        resy_fetched: false,
        audience_republic_fetched: false,
        meta_fetched: false,
        opentable_fetched: false
      })
      .select()
      .single();
    
    if (snapshotError) {
      throw new Error(`Failed to create snapshot: ${snapshotError.message}`);
    }
    
    const results = {
      snapshotId: snapshot.id,
      toast: null,
      errors: []
    };
    
    // Sync Toast data (last 24 hours)
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
      
      // Call the sync endpoint
      const baseUrl = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : 'https://venue-smart-dashboard.vercel.app';
      
      const syncResponse = await axios.post(
        `${baseUrl}/api/sync-toast-to-supabase`,
        {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      );
      
      results.toast = syncResponse.data;
      
      // Update snapshot to mark Toast as fetched
      await supabase
        .from('venue_snapshots')
        .update({ toast_fetched: true })
        .eq('id', snapshot.id);
      
    } catch (error) {
      console.error('Toast sync error:', error.message);
      results.errors.push({ service: 'toast', error: error.message });
    }
    
    // Calculate KPIs from the synced data
    try {
      const kpis = await calculateKPIs();
      
      // Update snapshot with KPIs
      await supabase
        .from('venue_snapshots')
        .update({ 
          kpis: kpis,
          fetch_duration_ms: Date.now() - new Date(snapshot.created_at).getTime()
        })
        .eq('id', snapshot.id);
      
      results.kpis = kpis;
      
    } catch (error) {
      console.error('KPI calculation error:', error.message);
      results.errors.push({ service: 'kpis', error: error.message });
    }
    
    // Update daily summary
    await updateDailySummary(new Date());
    
    res.status(200).json({
      success: true,
      message: 'Data sync completed',
      ...results
    });
    
  } catch (error) {
    console.error('Cron job error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

async function calculateKPIs() {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  
  // Get today's transactions from Supabase
  const { data: todayTransactions, error } = await supabase
    .from('toast_transactions')
    .select('*')
    .gte('created_at', todayStart.toISOString())
    .lte('created_at', now.toISOString());
  
  if (error) throw error;
  
  // Calculate revenue metrics
  let totalRevenue = 0;
  let totalTransactions = 0;
  let totalTax = 0;
  let totalTips = 0;
  
  todayTransactions.forEach(transaction => {
    totalRevenue += (transaction.total_amount || 0) / 100;
    totalTax += (transaction.tax_amount || 0) / 100;
    totalTips += (transaction.tip_amount || 0) / 100;
    totalTransactions++;
  });
  
  // Get yesterday's data for comparison
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const yesterdayEnd = new Date(todayStart);
  
  const { data: yesterdayTransactions } = await supabase
    .from('toast_transactions')
    .select('total_amount')
    .gte('created_at', yesterdayStart.toISOString())
    .lt('created_at', yesterdayEnd.toISOString());
  
  const yesterdayRevenue = (yesterdayTransactions || []).reduce(
    (sum, t) => sum + (t.total_amount || 0) / 100, 0
  );
  
  return {
    revenueMetrics: {
      current: totalRevenue,
      previous: yesterdayRevenue,
      change: yesterdayRevenue > 0 
        ? ((totalRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
        : 0,
      tax: totalTax,
      tips: totalTips,
      netRevenue: totalRevenue - totalTax
    },
    transactionMetrics: {
      count: totalTransactions,
      avgAmount: totalTransactions > 0 ? totalRevenue / totalTransactions : 0
    },
    timestamp: now.toISOString()
  };
}

async function updateDailySummary(date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  // Get all transactions for the day
  const { data: transactions } = await supabase
    .from('toast_transactions')
    .select('*')
    .gte('created_at', startOfDay.toISOString())
    .lte('created_at', endOfDay.toISOString());
  
  if (!transactions || transactions.length === 0) return;
  
  // Calculate daily totals
  const summary = {
    date: startOfDay.toISOString().split('T')[0],
    total_revenue: transactions.reduce((sum, t) => sum + (t.total_amount || 0) / 100, 0),
    transaction_count: transactions.length,
    average_transaction: 0
  };
  
  summary.average_transaction = summary.transaction_count > 0 
    ? summary.total_revenue / summary.transaction_count 
    : 0;
  
  // Upsert daily summary
  await supabase
    .from('daily_summaries')
    .upsert(summary, { onConflict: 'date' });
}