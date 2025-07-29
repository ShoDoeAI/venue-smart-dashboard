const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get date from query params or use July 27, 2025
    const date = req.query.date || '2025-07-27';

    // Create date range for the day
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    // Get checks from that date based on created_date
    const { data: checksByCreated, error: createdError } = await supabase
      .from('toast_checks')
      .select('check_guid, total_amount, created_date, closed_date')
      .gte('created_date', startDate.toISOString())
      .lte('created_date', endDate.toISOString());

    // Also check by closed_date (when payment was actually processed)
    const { data: checksByClosed, error: closedError } = await supabase
      .from('toast_checks')
      .select('check_guid, total_amount, created_date, closed_date')
      .gte('closed_date', startDate.toISOString())
      .lte('closed_date', endDate.toISOString());

    // Also check by business_date in orders
    const businessDate = parseInt(date.replace(/-/g, ''));
    const { data: ordersByBusinessDate } = await supabase
      .from('toast_orders')
      .select('order_guid, business_date')
      .eq('business_date', businessDate);

    // Get checks for those orders
    let checksByBusinessDate = [];
    if (ordersByBusinessDate && ordersByBusinessDate.length > 0) {
      const orderGuids = ordersByBusinessDate.map((o) => o.order_guid);
      const { data } = await supabase
        .from('toast_checks')
        .select('check_guid, total_amount, created_date, closed_date, order_guid')
        .in('order_guid', orderGuids);
      checksByBusinessDate = data || [];
    }

    // Calculate revenues (amounts are already in dollars)
    const revenueByCreated =
      (checksByCreated || []).reduce((sum, check) => sum + (check.total_amount || 0), 0);
    const revenueByClosed =
      (checksByClosed || []).reduce((sum, check) => sum + (check.total_amount || 0), 0);
    const revenueByBusinessDate =
      checksByBusinessDate.reduce((sum, check) => sum + (check.total_amount || 0), 0);

    return res.status(200).json({
      success: true,
      date,
      revenue: {
        byCreatedDate: {
          dollars: revenueByCreated,
          formatted: `$${revenueByCreated.toFixed(2)}`,
          checkCount: checksByCreated?.length || 0,
        },
        byClosedDate: {
          dollars: revenueByClosed,
          formatted: `$${revenueByClosed.toFixed(2)}`,
          checkCount: checksByClosed?.length || 0,
        },
        byBusinessDate: {
          dollars: revenueByBusinessDate,
          formatted: `$${revenueByBusinessDate.toFixed(2)}`,
          checkCount: checksByBusinessDate.length,
          orderCount: ordersByBusinessDate?.length || 0,
        },
      },
      sampleChecks: {
        created: checksByCreated?.slice(0, 3).map((c) => ({
          ...c,
          dollars: c.total_amount,
          formatted: `$${(c.total_amount).toFixed(2)}`,
        })),
        closed: checksByClosed?.slice(0, 3).map((c) => ({
          ...c,
          dollars: c.total_amount,
          formatted: `$${(c.total_amount).toFixed(2)}`,
        })),
      },
    });
  } catch (error) {
    console.error('Revenue by date error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
