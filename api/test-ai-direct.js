import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  const { date } = req.query; // Format: YYYY-MM-DD

  if (!date) {
    return res.status(400).json({ error: 'Date parameter required (YYYY-MM-DD)' });
  }

  try {
    // Convert to business date
    const [year, month, day] = date.split('-');
    const businessDate = parseInt(`${year}${month.padStart(2, '0')}${day.padStart(2, '0')}`);

    // Get orders for this business date
    const { data: orders, error: orderError } = await supabase
      .from('toast_orders')
      .select('order_guid')
      .eq('business_date', businessDate);

    if (orderError) {
      return res.status(500).json({ error: 'Order query error: ' + orderError.message });
    }

    if (!orders || orders.length === 0) {
      return res.status(200).json({
        date,
        businessDate,
        orders: 0,
        checks: 0,
        revenue: 0,
        message: 'No orders found for this date',
      });
    }

    // Get checks for these orders
    const orderGuids = orders.map((o) => o.order_guid);
    const { data: checks, error: checkError } = await supabase
      .from('toast_checks')
      .select('check_guid, total_amount, voided')
      .in('order_guid', orderGuids);

    if (checkError) {
      return res.status(500).json({ error: 'Check query error: ' + checkError.message });
    }

    // Count unique checks and calculate revenue
    const uniqueChecks = new Map();
    checks?.forEach((check) => {
      if (!uniqueChecks.has(check.check_guid)) {
        uniqueChecks.set(check.check_guid, check);
      }
    });

    let totalRevenue = 0;
    let nonVoidedChecks = 0;

    uniqueChecks.forEach((check) => {
      if (!check.voided) {
        totalRevenue += check.total_amount || 0;
        nonVoidedChecks++;
      }
    });

    // Now test what the AI system would see
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    // Build the prompt that would be sent to AI
    const systemPrompt = `You are analyzing Toast POS data for a restaurant.
Current date: ${new Date().toLocaleDateString()}
Business date ${date} (${businessDate}) shows:
- Total orders: ${orders.length}
- Total checks: ${nonVoidedChecks}
- Total revenue: $${totalRevenue.toFixed(2)}

When asked about revenue for ${date}, you should report exactly: $${totalRevenue.toFixed(2)}`;

    return res.status(200).json({
      date,
      businessDate,
      database: {
        orders: orders.length,
        totalChecks: checks?.length || 0,
        uniqueChecks: uniqueChecks.size,
        nonVoidedChecks,
        revenue: totalRevenue.toFixed(2),
      },
      aiContext: {
        systemPrompt: systemPrompt,
        expectedResponse: `$${totalRevenue.toFixed(2)}`,
      },
      testResults: {
        aug8: date === '2025-08-08' ? totalRevenue.toFixed(2) === '1440.06' : null,
        aug10: date === '2025-08-10' ? totalRevenue.toFixed(2) === '6500.00' : null,
      },
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      error: error.message,
      stack: error.stack,
    });
  }
}
