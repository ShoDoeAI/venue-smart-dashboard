import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { DataOrchestrator } from '../src/services/data-orchestrator';
import type { Database } from '@venuesync/shared';

/**
 * Manual endpoint to fetch Toast data for a specific venue and date range
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      venueId = 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c', 
      startDate, 
      endDate,
      apis = ['toast']
    } = req.body;

    console.log(`[MANUAL FETCH] Starting data fetch for venue ${venueId}`);

    // Initialize Supabase client
    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Initialize orchestrator
    const orchestrator = new DataOrchestrator(supabase);

    // Parse dates
    const dateRange = {
      start: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default: last 30 days
      end: endDate ? new Date(endDate) : new Date(),
    };

    console.log(`[MANUAL FETCH] Fetching from ${dateRange.start.toISOString()} to ${dateRange.end.toISOString()}`);

    // Fetch data
    const result = await orchestrator.fetchAllData({
      venueId,
      apis,
      dateRange,
      locationId: 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c', // Jack's location ID
    });

    // Calculate KPIs for the date range
    if (result.success && result.results.toast?.success) {
      console.log(`[MANUAL FETCH] Successfully fetched ${result.results.toast.recordCount} Toast transactions`);
      
      // Trigger KPI calculation for each day in the range
      const { KPICalculator } = await import('../src/services/kpi-calculator');
      const kpiCalculator = new KPICalculator(supabase);
      
      const currentDate = new Date(dateRange.start);
      while (currentDate <= dateRange.end) {
        try {
          await kpiCalculator.calculateDailyKPIs(venueId, new Date(currentDate));
          console.log(`[MANUAL FETCH] Calculated KPIs for ${currentDate.toISOString().split('T')[0]}`);
        } catch (error) {
          console.error(`[MANUAL FETCH] Error calculating KPIs for ${currentDate.toISOString().split('T')[0]}:`, error);
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    console.log(`[MANUAL FETCH] Completed in ${result.duration}ms`);

    return res.status(200).json({
      success: true,
      message: 'Data fetch completed',
      result,
    });

  } catch (error) {
    console.error('[MANUAL FETCH] Error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}