import { createClient } from '@supabase/supabase-js';
import type { Database } from '@venuesync/shared';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AIContextAggregatorToast } from '../packages/backend/src/services/ai-context-aggregator-toast';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
    );

    const { query = 'July 2025' } = req.query;
    
    // Parse the query to get date range (simplified)
    let startDate: Date;
    let endDate: Date;
    
    if (query.toString().toLowerCase().includes('july 2025')) {
      startDate = new Date('2025-07-01');
      endDate = new Date('2025-07-31');
    } else if (query.toString().toLowerCase().includes('august 2025')) {
      startDate = new Date('2025-08-01');
      endDate = new Date('2025-08-31');
    } else {
      // Default to current month
      startDate = new Date();
      startDate.setDate(1);
      endDate = new Date();
    }

    // Get the context that AI would receive
    const aggregator = new AIContextAggregatorToast(supabase);
    const context = await aggregator.buildEnhancedContext(
      'bfb355cb-55e4-4f57-af16-d0d18c11ad3c', // Your venue ID
      'revenue',
      startDate,
      endDate
    );

    // Also get raw data for comparison
    const { data: overrides } = await supabase
      .from('revenue_overrides')
      .select('*')
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date');

    return res.status(200).json({
      success: true,
      query: query.toString(),
      dateRange: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      },
      ai_context: {
        hasToastAnalytics: !!context.toastAnalytics,
        totalRevenue: context.toastAnalytics?.totalRevenue,
        dayCount: context.toastAnalytics?.dailyBreakdown?.length,
        noDataFound: context.toastAnalytics?.noDataFound,
        sample: context.toastAnalytics?.dailyBreakdown?.slice(0, 3)
      },
      raw_database_data: {
        revenue_overrides_count: overrides?.length || 0,
        total_from_actual_revenue: overrides?.reduce((sum, r) => sum + r.actual_revenue, 0) || 0,
        total_from_revenue_total: overrides?.reduce((sum, r) => sum + r.revenue_total, 0) || 0,
        sample: overrides?.slice(0, 3).map(r => ({
          date: r.date,
          actual_revenue: r.actual_revenue,
          revenue_total: r.revenue_total,
          check_count: r.check_count,
          notes: r.notes
        }))
      },
      verification: {
        ai_should_report: context.toastAnalytics?.totalRevenue || 0,
        matches_actual_revenue: context.toastAnalytics?.totalRevenue === (overrides?.reduce((sum, r) => sum + r.actual_revenue, 0) || 0),
        message: 'AI total should match sum of actual_revenue from revenue_overrides'
      }
    });
  } catch (error) {
    console.error('Test AI revenue context error:', error);
    return res.status(500).json({
      error: 'Failed to test AI revenue context',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}