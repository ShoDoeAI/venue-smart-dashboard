import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  console.log('Testing August 10 data...');

  try {
    // Get orders for Aug 10 business date
    const { data: orders } = await supabase
      .from('toast_orders')
      .select('order_guid')
      .eq('business_date', 20250810);

    if (!orders || orders.length === 0) {
      return res.status(200).json({
        message: 'No orders found for August 10',
        orderCount: 0,
      });
    }

    // Get checks for these orders
    const orderGuids = orders.map((o) => o.order_guid);
    const { data: checks } = await supabase
      .from('toast_checks')
      .select('check_guid, total_amount, voided, created_date')
      .in('order_guid', orderGuids);

    // Calculate revenue
    let totalRevenue = 0;
    let nonVoidedChecks = 0;
    let voidedChecks = 0;

    if (checks) {
      checks.forEach((check) => {
        if (!check.voided) {
          totalRevenue += check.total_amount || 0;
          nonVoidedChecks++;
        } else {
          voidedChecks++;
        }
      });
    }

    // Get some sample checks
    const sampleChecks = checks?.slice(0, 5).map((c) => ({
      guid: c.check_guid.slice(0, 8) + '...',
      amount: c.total_amount,
      voided: c.voided,
      created: c.created_date,
    }));

    return res.status(200).json({
      businessDate: '2025-08-10',
      orderCount: orders.length,
      totalChecks: checks?.length || 0,
      nonVoidedChecks,
      voidedChecks,
      totalRevenue: totalRevenue.toFixed(2),
      sampleChecks,
      message: `August 10 had ${orders.length} orders with total revenue of $${totalRevenue.toFixed(2)}`,
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
