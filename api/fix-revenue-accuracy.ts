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

    // Test specific queries
    const testQueries = [
      { query: 'July 2025', expectedStart: '2025-07-01', expectedEnd: '2025-07-31' },
      { query: 'August 2025', expectedStart: '2025-08-01', expectedEnd: '2025-08-31' },
      { query: 'July', expectedStart: '2025-07-01', expectedEnd: '2025-07-31' } // Should be July, not August!
    ];

    const results = [];

    for (const test of testQueries) {
      // Get data for the expected date range
      const { data: overrides } = await supabase
        .from('revenue_overrides')
        .select('*')
        .gte('date', test.expectedStart)
        .lte('date', test.expectedEnd)
        .order('date');

      const correctTotal = overrides?.reduce((sum, row) => sum + row.actual_revenue, 0) || 0;

      results.push({
        query: test.query,
        expectedDateRange: { start: test.expectedStart, end: test.expectedEnd },
        correctTotal: correctTotal.toFixed(2),
        dayCount: overrides?.length || 0,
        dailyBreakdown: overrides?.map(row => ({
          date: row.date,
          revenue: row.actual_revenue,
          notes: row.notes
        }))
      });
    }

    return res.status(200).json({
      success: true,
      message: 'These are the EXACT totals that AI should report',
      results,
      instructions: {
        'July 2025': 'Should report exactly $31,533.21',
        'August 2025': 'Should report exactly $11,955.41 (only 6 days with data)',
        'July': 'Should be interpreted as July 2025, NOT current month'
      }
    });
  } catch (error) {
    console.error('Fix revenue accuracy error:', error);
    return res.status(500).json({
      error: 'Failed to calculate correct totals',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}