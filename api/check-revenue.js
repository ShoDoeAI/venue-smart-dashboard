const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Calculate revenue from toast_checks total_amount
    const { data: checks, error: checksError } = await supabase
      .from('toast_checks')
      .select('total_amount');

    if (checksError) {
      throw checksError;
    }

    // Sum up total_amount (which is in cents)
    const totalRevenueCents = checks.reduce((sum, check) => sum + (check.total_amount || 0), 0);
    const totalRevenueDollars = totalRevenueCents / 100;

    // Get counts
    const { count: orderCount } = await supabase
      .from('toast_orders')
      .select('*', { count: 'exact', head: true });

    const { count: checkCount } = await supabase
      .from('toast_checks')
      .select('*', { count: 'exact', head: true });

    const { count: paymentCount } = await supabase
      .from('toast_payments')
      .select('*', { count: 'exact', head: true });

    // Get a sample of recent checks
    const { data: recentChecks } = await supabase
      .from('toast_checks')
      .select('check_guid, total_amount, amount, tax_amount, created_date')
      .order('created_date', { ascending: false })
      .limit(5);

    return res.status(200).json({
      success: true,
      revenue: {
        totalCents: totalRevenueCents,
        totalDollars: totalRevenueDollars,
        formattedTotal: `$${totalRevenueDollars.toFixed(2)}`,
      },
      counts: {
        orders: orderCount,
        checks: checkCount,
        payments: paymentCount,
      },
      recentChecks: recentChecks?.map((check) => ({
        ...check,
        totalDollars: check.total_amount / 100,
        formatted: `$${(check.total_amount / 100).toFixed(2)}`,
      })),
    });
  } catch (error) {
    console.error('Revenue check error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
