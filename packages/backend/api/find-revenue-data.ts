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

    // Search for July 2025 data in all possible tables
    const results: Record<
      string,
      {
        count: number;
        sample?: unknown[];
        total?: number;
        dates?: string[];
        error?: string;
      }
    > = {};

    // 1. Check revenue_overrides
    const { data: overrides } = await supabase
      .from('revenue_overrides')
      .select('*')
      .gte('date', '2025-07-01')
      .lte('date', '2025-07-31');
    results.revenue_overrides = {
      count: overrides?.length || 0,
      sample: overrides?.slice(0, 3),
      total: overrides?.reduce((sum, r: any) => sum + (r.revenue_total || 0), 0) || 0,
    };

    // 2. Check toast_checks
    const { data: toastChecks } = await supabase
      .from('toast_checks')
      .select('*')
      .gte('businessDate', '2025-07-01')
      .lte('businessDate', '2025-07-31');
    results.toast_checks = {
      count: toastChecks?.length || 0,
      sample: toastChecks?.slice(0, 3),
      total: toastChecks?.reduce((sum, r: any) => sum + (r.revenue || 0), 0) || 0,
    };

    // 3. Check snapshots table
    const { data: snapshots } = await supabase
      .from('snapshots')
      .select('*')
      .gte('created_at', '2025-07-01')
      .lte('created_at', '2025-07-31');
    results.snapshots = {
      count: snapshots?.length || 0,
      sample: snapshots?.slice(0, 1),
    };

    // 4. Check toast_orders
    const { data: toastOrders } = await supabase
      .from('toast_orders')
      .select('*')
      .gte('business_date', 20250701)
      .lte('business_date', 20250731)
      .limit(5);
    results.toast_orders = {
      count: toastOrders?.length || 0,
      sample: toastOrders,
    };

    // 5. Check simple_transactions
    const { data: simpleTrans } = await supabase
      .from('simple_transactions')
      .select('*')
      .gte('transaction_date', '2025-07-01')
      .lte('transaction_date', '2025-07-31')
      .limit(5);
    results.simple_transactions = {
      count: simpleTrans?.length || 0,
      sample: simpleTrans,
    };

    // 6. Check kpis table
    const { data: kpis } = await supabase
      .from('kpis')
      .select('*')
      .gte('created_at', '2025-07-01')
      .lte('created_at', '2025-07-31')
      .limit(5);
    results.kpis = {
      count: kpis?.length || 0,
      sample: kpis,
    };

    // 7. Try to query venue_snapshots if it exists
    try {
      const { data: venueSnapshots } = await supabase
        .from('venue_snapshots')
        .select('*')
        .gte('created_at', '2025-07-01')
        .lte('created_at', '2025-07-31')
        .limit(5);
      results.venue_snapshots = {
        count: venueSnapshots?.length || 0,
        sample: venueSnapshots,
      };
    } catch (e) {
      results.venue_snapshots = { error: 'Table may not exist' };
    }

    // 8. Check if there's any June/August data in surrounding months
    const { data: june2025 } = await supabase
      .from('revenue_overrides')
      .select('date, actual_revenue')
      .gte('date', '2025-06-01')
      .lte('date', '2025-06-30')
      .limit(5);
    results.june2025_sample = {
      count: june2025?.length || 0,
      dates: june2025?.map((r) => r.date),
    };

    // Check for any August data in revenue_overrides for comparison
    const { data: augOverrides } = await supabase
      .from('revenue_overrides')
      .select('*')
      .gte('date', '2025-08-01')
      .lte('date', '2025-08-10');
    results.august_comparison = {
      count: augOverrides?.length || 0,
      total: augOverrides?.reduce((sum, r: any) => sum + (r.revenue_total || 0), 0) || 0,
      dates: augOverrides?.map((r: any) => r.date as string),
    };

    return res.status(200).json({
      success: true,
      message: 'Revenue data search results for July 2025',
      results,
      summary: {
        hasJulyData: Object.values(results).some((r) => r.count > 0),
        totalJulyRevenue: results.revenue_overrides.total + results.toast_checks.total,
      },
    });
  } catch (error) {
    console.error('Find revenue data error:', error);
    return res.status(500).json({
      error: 'Failed to search for revenue data',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
