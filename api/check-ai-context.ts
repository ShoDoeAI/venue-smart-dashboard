import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AIContextAggregatorToast } from '../packages/backend/src/services/ai-context-aggregator-toast';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const aggregator = new AIContextAggregatorToast(supabase);
    
    // Test specific months
    const testMonths = [
      { month: 'January 2024', dateRange: { startDate: '2024-01-01', endDate: '2024-01-31' } },
      { month: 'April 2024', dateRange: { startDate: '2024-04-01', endDate: '2024-04-30' } },
      { month: 'July 2025', dateRange: { startDate: '2025-07-01', endDate: '2025-07-31' } },
      { month: 'August 2025', dateRange: { startDate: '2025-08-01', endDate: '2025-08-31' } }
    ];

    const results = [];

    for (const test of testMonths) {
      const context = await aggregator.aggregateContext(
        [{ integration: 'toast', description: `Revenue for ${test.month}` }],
        test.dateRange
      );

      results.push({
        month: test.month,
        revenue: context[0]?.analytics?.totalRevenue || 0,
        dataLength: context[0]?.data?.length || 0,
        hasData: !!context[0]?.data
      });
    }

    res.status(200).json({
      success: true,
      results,
      note: 'This shows what data the AI context aggregator sees'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to check AI context',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}