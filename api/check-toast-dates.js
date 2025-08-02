const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async (req, res) => {
  try {
    // Get date range and sample of toast_checks data
    const { data: dateRange, error: dateError } = await supabase
      .from('toast_checks')
      .select('created_date, closed_date, total_amount')
      .order('created_date', { ascending: false })
      .limit(10);

    // Get daily totals
    const { data: dailyTotals, error: totalsError } = await supabase
      .rpc('get_daily_toast_revenue', {
        start_date: '2025-07-01',
        end_date: '2025-07-31'
      })
      .catch(() => ({ data: null, error: 'RPC function not found' }));

    // If RPC doesn't exist, do a manual query
    const { data: sampleData, error: sampleError } = await supabase
      .from('toast_checks')
      .select('created_date, total_amount')
      .gte('created_date', '2025-07-01')
      .lte('created_date', '2025-07-31')
      .order('created_date', { ascending: false });

    res.status(200).json({
      success: true,
      recentChecks: dateRange,
      julyData: sampleData,
      totalJulyRevenue: sampleData?.reduce((sum, check) => sum + (check.total_amount || 0), 0),
      errors: {
        dateError,
        totalsError,
        sampleError
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};