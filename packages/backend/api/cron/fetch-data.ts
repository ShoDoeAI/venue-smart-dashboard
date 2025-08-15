import { createClient } from '@supabase/supabase-js';
import type { Database } from '@venuesync/shared';
import type { VercelRequest, VercelResponse } from '@vercel/node';

import { DataOrchestrator } from '../../src/services/data-orchestrator';


/**
 * Vercel Cron job to fetch data from all integrated APIs
 * Runs every 3 hours: 0 star/3 star star star
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Verify this is being called by Vercel Cron
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const startTime = Date.now();
  console.log(`[CRON] Starting data fetch at ${new Date().toISOString()}`);

  try {
    // Initialize Supabase client
    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    // Get all active venues
    const { data: venues, error: venuesError } = await supabase
      .from('venues')
      .select('id, name')
      .eq('is_active', true);

    if (venuesError) {
      throw new Error(`Failed to fetch venues: ${venuesError.message}`);
    }

    if (!venues || venues.length === 0) {
      console.log('[CRON] No active venues found');
      return res.status(200).json({ 
        message: 'No active venues to process',
        duration: Date.now() - startTime,
      });
    }

    console.log(`[CRON] Found ${venues.length} active venue(s)`);

    // Initialize orchestrator
    const orchestrator = new DataOrchestrator(supabase);

    // Process each venue in parallel
    const results = await Promise.allSettled(
      venues.map(async (venue) => {
        console.log(`[CRON] Processing venue: ${venue.name} (${venue.id})`);

        try {
          // Get API statuses
          const apiStatuses = await orchestrator.getApiStatuses(venue.id);
          
          // Determine which APIs need updates
          const apisToFetch = [];
          if (apiStatuses.toast.needsUpdate) apisToFetch.push('toast');
          if (apiStatuses.eventbrite.needsUpdate) apisToFetch.push('eventbrite');
          if (apiStatuses.opendate?.needsUpdate) apisToFetch.push('opendate');
          
          if (apisToFetch.length === 0) {
            console.log(`[CRON] Skipping ${venue.name} - all APIs recently updated`);
            return {
              venueId: venue.id,
              venueName: venue.name,
              skipped: true,
              reason: 'All APIs recently updated',
            };
          }

          // Fetch data from APIs that need updates
          const result = await orchestrator.fetchAllData({
            venueId: venue.id,
            apis: apisToFetch,
            dateRange: {
              start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
              end: new Date(),
            },
          });

          return {
            venueId: venue.id,
            venueName: venue.name,
            ...result,
          };
        } catch (error) {
          throw error;
        }
      })
    );

    // Summarize results
    const summary = {
      totalVenues: venues.length,
      processed: 0,
      skipped: 0,
      failed: 0,
      results: [] as any[],
    };

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const data = result.value;
        if (data.skipped) {
          summary.skipped++;
        } else {
          summary.processed++;
        }
        summary.results.push(data);
      } else {
        summary.failed++;
        summary.results.push({
          venueId: venues[index].id,
          venueName: venues[index].name,
          error: result.reason.message || 'Unknown error',
        });
      }
    });

    const duration = Date.now() - startTime;
    console.log(`[CRON] Data fetch completed in ${duration}ms`);
    console.log(`[CRON] Summary: ${summary.processed} processed, ${summary.skipped} skipped, ${summary.failed} failed`);

    // Log to cron_logs table
    await supabase.from('cron_logs').insert({
      job_name: 'fetch-data',
      status: summary.failed > 0 ? 'partial_success' : 'success',
      duration_ms: duration,
      metadata: summary,
      executed_at: new Date().toISOString(),
    });

    return res.status(200).json({
      success: true,
      duration,
      summary,
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[CRON] Data fetch failed:', error);

    // Log error to cron_logs table
    try {
      const supabase = createClient<Database>(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!
      );
      
      await supabase.from('cron_logs').insert({
        job_name: 'fetch-data',
        status: 'failed',
        duration_ms: duration,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        executed_at: new Date().toISOString(),
      });
    } catch (logError) {
      console.error('[CRON] Failed to log error:', logError);
    }

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
    });
  }
}