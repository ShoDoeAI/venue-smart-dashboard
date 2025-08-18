/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
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

    // Get all unique years from revenue_overrides
    const { data: overrides } = await supabase
      .from('revenue_overrides')
      .select('date')
      .order('date', { ascending: false });

    // Extract unique years and months
    const yearMonths = new Map<string, Set<string>>();
    overrides?.forEach((row: any) => {
      const date = new Date(row.date);
      const year = date.getFullYear().toString();
      const month = date.toLocaleDateString('en-US', { month: 'long' });

      if (!yearMonths.has(year)) {
        yearMonths.set(year, new Set());
      }
      yearMonths.get(year)!.add(month);
    });

    // Convert to readable format
    const yearSummary = Array.from(yearMonths.entries()).map(([year, months]) => ({
      year,
      months: Array.from(months),
      monthCount: months.size,
    }));

    // Check for specific July 2025 data
    const { data: july2025, count: july2025Count } = await supabase
      .from('revenue_overrides')
      .select('date, actual_revenue, revenue_total', { count: 'exact' })
      .gte('date', '2025-07-01')
      .lte('date', '2025-07-31');

    // Get first and last dates in the database
    const { data: firstEntry } = await supabase
      .from('revenue_overrides')
      .select('date')
      .order('date', { ascending: true })
      .limit(1);

    const { data: lastEntry } = await supabase
      .from('revenue_overrides')
      .select('date')
      .order('date', { ascending: false })
      .limit(1);

    // Check recent data (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { count: recentCount } = await supabase
      .from('revenue_overrides')
      .select('date', { count: 'exact' })
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0]);

    return res.status(200).json({
      success: true,
      message: 'Data years analysis',
      summary: {
        totalRecords: overrides?.length || 0,
        dateRange: {
          first: firstEntry?.[0]?.date,
          last: lastEntry?.[0]?.date,
        },
        yearSummary,
        july2025: {
          exists: (july2025Count ?? 0) > 0,
          count: july2025Count,
          totalRevenue: july2025?.reduce((sum, r: any) => sum + (r.actual_revenue || 0), 0) || 0,
          sample: july2025?.slice(0, 5),
        },
        recentDataCount: recentCount,
        databaseTimezone: 'UTC',
        currentDate: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Check data years error:', error);
    return res.status(500).json({
      error: 'Failed to check data years',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
