/* eslint-disable */
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

    // Check February 2025
    const { data: feb2025 } = await supabase
      .from('revenue_overrides')
      .select('*')
      .gte('date', '2025-02-01')
      .lte('date', '2025-02-28')
      .order('date');

    // Check what months have data in 2025
    const { data: all2025 } = await supabase
      .from('revenue_overrides')
      .select('date, actual_revenue')
      .gte('date', '2025-01-01')
      .lte('date', '2025-12-31')
      .order('date');

    // Group by month
    const monthlyData: Record<string, number> = {};
    all2025?.forEach(row => {
      const month = row.date.substring(0, 7); // YYYY-MM
      monthlyData[month] = (monthlyData[month] || 0) + row.actual_revenue;
    });

    return res.status(200).json({
      success: true,
      february2025: {
        hasData: (feb2025?.length || 0) > 0,
        recordCount: feb2025?.length || 0,
        totalRevenue: feb2025?.reduce((sum, r) => sum + r.actual_revenue, 0) || 0,
        data: feb2025
      },
      monthsWithData2025: Object.keys(monthlyData).map(month => ({
        month,
        revenue: monthlyData[month].toFixed(2)
      })),
      message: 'These are all the months with revenue data in 2025'
    });
  } catch (error) {
    console.error('Check February data error:', error);
    return res.status(500).json({
      error: 'Failed to check February data',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}