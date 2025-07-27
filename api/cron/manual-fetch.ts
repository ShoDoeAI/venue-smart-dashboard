import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { DataOrchestrator } from '../../packages/backend/src/services/data-orchestrator';
import type { Database } from '@venuesync/shared';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const startTime = Date.now();
  console.log(`[MANUAL] Starting data fetch at ${new Date().toISOString()}`);

  try {
    // Initialize Supabase client
    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Get specific venue (Jack's on Water Street)
    const venueId = 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c';
    
    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .select('*')
      .eq('id', venueId)
      .single();

    if (venueError || !venue) {
      return res.status(404).json({ 
        error: 'Venue not found. Please run /api/setup-venue first.',
        venueId
      });
    }

    console.log(`[MANUAL] Processing venue: ${venue.name}`);

    // Initialize orchestrator
    const orchestrator = new DataOrchestrator(supabase);

    // Fetch data from all APIs
    const result = await orchestrator.fetchAllData({
      venueId: venue.id,
      apis: ['toast', 'eventbrite', 'opendate'],
      dateRange: {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        end: new Date(),
      },
    });

    const duration = Date.now() - startTime;
    console.log(`[MANUAL] Data fetch completed in ${duration}ms`);

    // Log to cron_logs table
    await supabase.from('cron_logs').insert({
      job_name: 'manual-fetch',
      status: 'success',
      duration_ms: duration,
      metadata: {
        venue: venue.name,
        result
      },
      executed_at: new Date().toISOString(),
    });

    return res.status(200).json({
      success: true,
      duration,
      venue: venue.name,
      result
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[MANUAL] Data fetch failed:', error);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
    });
  }
}