/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@venuesync/shared';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
    );

    const { dateRange, showDetails = false } = req.query;

    // Get specific date range or default to July 2025
    let startDate = '2025-07-01';
    let endDate = '2025-07-31';

    if (dateRange === 'august') {
      startDate = '2025-08-01';
      endDate = '2025-08-31';
    } else if (dateRange === 'custom' && req.query.start && req.query.end) {
      startDate = req.query.start as string;
      endDate = req.query.end as string;
    }

    // 1. Get revenue_overrides data (this is what AI should use)
    const { data: overrides } = await supabase
      .from('revenue_overrides')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date');

    // 2. Calculate what AI would report
    const aiCalculation = {
      method: 'revenue_overrides.actual_revenue',
      totalRevenue: overrides?.reduce((sum, row) => sum + (row.actual_revenue || 0), 0) || 0,
      dayCount: overrides?.length || 0,
      dailyBreakdown: overrides?.map(row => ({
        date: row.date,
        revenue: row.actual_revenue,
        checkCount: row.check_count,
        notes: row.notes
      }))
    };

    // 3. Also check revenue_total field for comparison
    const revenueTotal = {
      method: 'revenue_overrides.revenue_total',
      totalRevenue: overrides?.reduce((sum, row) => sum + (row.revenue_total || 0), 0) || 0
    };

    // 4. Check toast_checks for comparison
    const { data: toastChecks } = await supabase
      .from('toast_checks')
      .select('revenue, checkCount, businessDate')
      .gte('businessDate', startDate)
      .lte('businessDate', endDate);

    const toastChecksTotal = {
      method: 'toast_checks.revenue',
      totalRevenue: toastChecks?.reduce((sum, row) => sum + (row.revenue || 0), 0) || 0,
      dayCount: toastChecks?.length || 0
    };

    // 5. Get a sample of what dashboard would show
    const dashboardSample = overrides?.slice(0, 5).map(row => ({
      date: row.date,
      actual_revenue: row.actual_revenue,
      revenue_total: row.revenue_total,
      check_count: row.check_count,
      notes: row.notes,
      discrepancy: row.actual_revenue !== row.revenue_total ? 
        `Difference: ${Math.abs(row.actual_revenue - row.revenue_total).toFixed(2)}` : 
        'No discrepancy'
    }));

    return res.status(200).json({
      success: true,
      dateRange: { startDate, endDate },
      accuracy: {
        ai_should_report: {
          total: aiCalculation.totalRevenue.toFixed(2),
          source: 'revenue_overrides.actual_revenue',
          dayCount: aiCalculation.dayCount
        },
        comparison: {
          revenue_overrides_actual: aiCalculation.totalRevenue.toFixed(2),
          revenue_overrides_total: revenueTotal.totalRevenue.toFixed(2),
          toast_checks_total: toastChecksTotal.totalRevenue.toFixed(2)
        },
        verification: {
          message: 'AI should ALWAYS use revenue_overrides.actual_revenue for accuracy',
          verified_dates: overrides?.filter(r => r.notes?.includes('verified')).length || 0
        }
      },
      sample: showDetails ? dashboardSample : 'Use ?showDetails=true to see daily breakdown',
      daily_breakdown: showDetails ? aiCalculation.dailyBreakdown : 'Use ?showDetails=true to see details'
    });
  } catch (error) {
    console.error('Verify revenue accuracy error:', error);
    return res.status(500).json({
      error: 'Failed to verify revenue accuracy',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}