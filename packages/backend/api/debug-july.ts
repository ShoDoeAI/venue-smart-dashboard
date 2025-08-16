import { createClient } from '@supabase/supabase-js';
import type { Database } from '@venuesync/shared';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Test July 2025 data fetch
    const startDate = '2025-07-01';
    const endDate = '2025-07-31';
    
    // Query revenue_overrides like the aggregator does
    const { data: overrides, error } = await supabase
      .from('revenue_overrides')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });
      
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    const totalRevenue = overrides?.reduce((sum, d) => sum + (d.actual_revenue || 0), 0) || 0;
    
    // Also check if the AI context aggregator would work
    const july1 = new Date('2025-07-01');
    const july31 = new Date('2025-07-31');
    
    return res.status(200).json({
      success: true,
      debug: {
        queryDates: { startDate, endDate },
        recordsFound: overrides?.length || 0,
        totalRevenue,
        firstRecord: overrides?.[0],
        lastRecord: overrides?.[overrides.length - 1],
        dateObjects: {
          july1: july1.toISOString(),
          july31: july31.toISOString(),
          july1String: july1.toISOString().split('T')[0],
          july31String: july31.toISOString().split('T')[0]
        }
      }
    });
  } catch (error) {
    console.error('Debug API error:', error);
    return res.status(500).json({
      error: 'Failed to debug',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}