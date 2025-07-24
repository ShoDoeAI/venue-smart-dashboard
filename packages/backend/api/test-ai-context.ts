import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { AIContextAggregator } from '../src/services/ai-context-aggregator';
import type { Database } from '@venuesync/shared';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Simple auth check
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('Testing AI Context Aggregation...');

  try {
    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Get venue
    const { data: venues } = await supabase
      .from('venues')
      .select('*')
      .limit(1);

    const venue = venues?.[0];
    if (!venue) {
      return res.status(400).json({ error: 'No venue found' });
    }

    // Build AI context
    const contextAggregator = new AIContextAggregator(supabase);
    const context = await contextAggregator.buildContext(venue.id);

    // Check Toast data specifically
    const { data: toastOrders } = await supabase
      .from('toast_orders')
      .select('*')
      .order('created_date', { ascending: false })
      .limit(5);

    const { data: toastPayments } = await supabase
      .from('toast_payments')
      .select('*')
      .order('paid_date', { ascending: false })
      .limit(5);

    // Check date range of available data
    const { data: oldestOrder } = await supabase
      .from('toast_orders')
      .select('created_date')
      .order('created_date', { ascending: true })
      .limit(1);

    const { data: newestOrder } = await supabase
      .from('toast_orders')
      .select('created_date')
      .order('created_date', { ascending: false })
      .limit(1);

    return res.status(200).json({
      message: 'AI Context Test Results',
      venue: {
        id: venue.id,
        name: venue.name,
        type: venue.type || 'unknown'
      },
      ai_context: {
        has_current_metrics: !!context.currentMetrics,
        current_metrics_sample: {
          todayRevenue: context.currentMetrics?.todayRevenue,
          todayTransactions: context.currentMetrics?.todayTransactions,
          todayCustomers: context.currentMetrics?.todayCustomers
        },
        has_historical_trends: !!context.historicalTrends,
        historical_trends: {
          revenue_growth: context.historicalTrends?.revenueGrowth,
          customer_growth: context.historicalTrends?.customerGrowth,
          peak_hours: context.historicalTrends?.peakHours
        },
        active_alerts: context.activeAlerts,
        available_actions: context.availableActions?.map(a => ({
          service: a.service,
          actionType: a.actionType,
          description: a.description
        }))
      },
      toast_data: {
        orders_count: toastOrders?.length || 0,
        payments_count: toastPayments?.length || 0,
        data_range: {
          oldest: oldestOrder?.[0]?.created_date || 'No data',
          newest: newestOrder?.[0]?.created_date || 'No data'
        },
        sample_order: toastOrders?.[0] ? {
          date: toastOrders[0].created_date,
          location: toastOrders[0].location_id,
          server: `${toastOrders[0].server_first_name} ${toastOrders[0].server_last_name}`
        } : null
      },
      recommendations: [
        'Test basic queries like "What is our revenue today?"',
        'Test comparisons like "Compare this week to last week"',
        'Test insights like "What are our busiest hours?"',
        'Test actions like "What should I do to increase sales?"'
      ]
    });

  } catch (error) {
    console.error('Context test error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}