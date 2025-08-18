import { createClient } from '@supabase/supabase-js';
import type { Database } from '@venuesync/shared';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
    );

    // Query revenue_overrides for July 2025
    const { data: overrides, error: overridesError } = await supabase
      .from('revenue_overrides')
      .select('*')
      .gte('date', '2025-07-01')
      .lte('date', '2025-07-31')
      .order('date');

    // Query toast_checks for July 2025
    const { data: toastChecks, error: toastError } = await supabase
      .from('toast_checks')
      .select('businessDate, revenue, checkCount')
      .gte('businessDate', '2025-07-01')
      .lte('businessDate', '2025-07-31')
      .order('businessDate');

    // Calculate totals
    const overridesTotal = overrides?.reduce((sum, row) => sum + (row.revenue_total || 0), 0) || 0;
    const toastTotal = toastChecks?.reduce((sum, row) => sum + (row.revenue || 0), 0) || 0;

    return res.status(200).json({
      success: true,
      message: 'July 2025 data check',
      summary: {
        hasData: (overrides?.length || 0) > 0 || (toastChecks?.length || 0) > 0,
        overridesCount: overrides?.length || 0,
        toastChecksCount: toastChecks?.length || 0,
        totalRevenueFromOverrides: overridesTotal,
        totalRevenueFromToast: toastTotal
      },
      revenue_overrides: {
        count: overrides?.length || 0,
        data: overrides || [],
        error: overridesError?.message
      },
      toast_checks: {
        count: toastChecks?.length || 0,
        data: toastChecks || [],
        error: toastError?.message
      }
    });
  } catch (error) {
    console.error('Check July data error:', error);
    return res.status(500).json({
      error: 'Failed to check July data',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}