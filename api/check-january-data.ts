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

    // Query revenue_overrides for January 2025
    const { data: overrides, error: overridesError } = await supabase
      .from('revenue_overrides')
      .select('*')
      .gte('date', '2025-01-01')
      .lte('date', '2025-01-31')
      .order('date');

    // Also check what the AI might be seeing (1901?)
    const { data: oldData } = await supabase
      .from('revenue_overrides')
      .select('*')
      .gte('date', '1901-01-01')
      .lte('date', '1901-01-31')
      .order('date');

    // Check surrounding months
    const { data: dec2024 } = await supabase
      .from('revenue_overrides')
      .select('date')
      .gte('date', '2024-12-01')
      .lte('date', '2024-12-31')
      .limit(5);

    const { data: feb2025 } = await supabase
      .from('revenue_overrides')
      .select('date')
      .gte('date', '2025-02-01')
      .lte('date', '2025-02-28')
      .limit(5);

    return res.status(200).json({
      success: true,
      message: 'January 2025 data check',
      january2025: {
        count: overrides?.length || 0,
        data: overrides || [],
        error: overridesError?.message,
        totalRevenue: overrides?.reduce((sum, r: any) => sum + (r.actual_revenue || 0), 0) || 0
      },
      incorrectData1901: {
        count: oldData?.length || 0,
        sample: oldData?.slice(0, 3)
      },
      surroundingMonths: {
        december2024: dec2024?.length || 0,
        february2025: feb2025?.length || 0
      }
    });
  } catch (error) {
    console.error('Check January data error:', error);
    return res.status(500).json({
      error: 'Failed to check January data',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}