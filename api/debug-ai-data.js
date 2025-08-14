import { createClient } from '@supabase/supabase-js';
import { AIContextAggregatorToast } from '../packages/backend/src/services/ai-context-aggregator-toast.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  console.log('Debugging AI data access...');

  try {
    const { date } = req.query; // Format: YYYY-MM-DD

    if (!date) {
      return res.status(400).json({ error: 'Date parameter required (YYYY-MM-DD)' });
    }

    // Parse the date
    const [year, month, day] = date.split('-').map(Number);
    const businessDate = parseInt(
      `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`,
    );

    // Method 1: Direct database query (what we know is correct)
    const { data: orders } = await supabase
      .from('toast_orders')
      .select('order_guid')
      .eq('business_date', businessDate);

    let directRevenue = 0;
    let directChecks = 0;

    if (orders && orders.length > 0) {
      const orderGuids = orders.map((o) => o.order_guid);
      const { data: checks } = await supabase
        .from('toast_checks')
        .select('total_amount, voided')
        .in('order_guid', orderGuids);

      checks?.forEach((check) => {
        if (!check.voided) {
          directRevenue += check.total_amount || 0;
          directChecks++;
        }
      });
    }

    // Method 2: What the AI context aggregator sees
    const aggregator = new AIContextAggregatorToast(supabase);
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const aiContext = await aggregator.buildEnhancedContext(
      'venue-1',
      'revenue',
      startDate,
      endDate,
    );

    const aiRevenue = aiContext.toastAnalytics?.totalRevenue || 0;
    const aiChecks = aiContext.toastAnalytics?.totalChecks || 0;

    return res.status(200).json({
      date,
      businessDate,
      direct: {
        orders: orders?.length || 0,
        checks: directChecks,
        revenue: directRevenue.toFixed(2),
      },
      aiContext: {
        checks: aiChecks,
        revenue: aiRevenue.toFixed(2),
        queryPeriod: aiContext.toastAnalytics?.queryPeriod,
        dailyBreakdown: aiContext.toastAnalytics?.dailyBreakdown,
      },
      match: directRevenue.toFixed(2) === aiRevenue.toFixed(2),
      difference: Math.abs(directRevenue - aiRevenue).toFixed(2),
    });
  } catch (error) {
    console.error('Debug error:', error);
    return res.status(500).json({ error: error.message });
  }
}
