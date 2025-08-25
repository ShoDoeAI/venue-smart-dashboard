import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@venuesync/shared';

const VENUE_ID = 'f3e07046-d1f9-4eb6-a0a9-b8e123f3a456';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
    );

    // Test specific dates that should have data
    const testDates = [
      { date: '2025-02-14', expected: 4337.24 },
      { date: '2025-07-25', expected: 10286.75 },
      { date: '2025-08-10', expected: 6500.00 },
      { date: '2025-06-14', expected: 3750.40 },
      { date: '2025-08-18', expected: 0 }, // Closed day
    ];

    const results = [];

    for (const test of testDates) {
      const { data: record, error } = await supabase
        .from('revenue_overrides')
        .select('date, actual_revenue, check_count')
        .eq('date', test.date)
        .single();

      results.push({
        date: test.date,
        expected: test.expected,
        actual: record?.actual_revenue || 0,
        checks: record?.check_count || 0,
        status: record ? 'found' : 'missing',
        match: record && parseFloat(record.actual_revenue as any) === test.expected,
        error: error?.message,
      });
    }

    // Also test date range queries
    const rangeTests = [
      { month: 'February 2025', start: '2025-02-01', end: '2025-02-28' },
      { month: 'July 2025', start: '2025-07-01', end: '2025-07-31' },
      { month: 'August 2025', start: '2025-08-01', end: '2025-08-31' },
    ];

    const rangeResults = [];

    for (const range of rangeTests) {
      const { data: records, error } = await supabase
        .from('revenue_overrides')
        .select('date, actual_revenue')
        .gte('date', range.start)
        .lte('date', range.end)
        .order('date');

      const totalRevenue = records?.reduce((sum, r) => sum + parseFloat(r.actual_revenue as any || '0'), 0) || 0;
      const daysWithRevenue = records?.filter(r => parseFloat(r.actual_revenue as any || '0') > 0).length || 0;

      rangeResults.push({
        month: range.month,
        start: range.start,
        end: range.end,
        totalRevenue,
        daysWithRevenue,
        totalDays: records?.length || 0,
        error: error?.message,
      });
    }

    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      specificDates: results,
      monthlyRanges: rangeResults,
      databaseHealth: {
        allTestsPassed: results.every(r => r.match || (r.expected === 0 && r.actual === 0)),
        dataAvailable: results.filter(r => r.status === 'found').length,
        totalTests: results.length,
      },
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}