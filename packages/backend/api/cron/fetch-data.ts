import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { DataOrchestrator } from '../../src/services/data-orchestrator';
import type { Database } from '@venuesync/shared/types/database.generated';

// Initialize Supabase client
const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Verify this is being called by Vercel Cron
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('[Cron] Starting scheduled data fetch...');

  try {
    // Get all active venues
    const { data: venues, error: venuesError } = await supabase
      .from('venue_config')
      .select('*')
      .eq('is_active', true);

    if (venuesError || !venues) {
      throw new Error('Failed to fetch active venues');
    }

    console.log(`[Cron] Found ${venues.length} active venue(s)`);

    const orchestrator = new DataOrchestrator(supabase);
    const results = [];

    // Process each venue
    for (const venue of venues) {
      console.log(`[Cron] Processing venue: ${venue.name} (${venue.id})`);

      try {
        // Check if snapshot is needed (default: every 3 hours)
        const apiStatuses = await orchestrator.getApiStatuses(venue.id);
        const needsUpdate = Object.values(apiStatuses).some(status => status.needsUpdate);

        if (!needsUpdate) {
          console.log(`[Cron] Skipping ${venue.name} - recently updated`);
          results.push({
            venueId: venue.id,
            venueName: venue.name,
            status: 'skipped',
            reason: 'Recently updated',
          });
          continue;
        }

        // Determine which APIs to fetch
        const apisToFetch = [];
        if (apiStatuses.toast.needsUpdate) apisToFetch.push('toast');
        if (apiStatuses.eventbrite.needsUpdate) apisToFetch.push('eventbrite');
        if (apiStatuses.wisk.needsUpdate) apisToFetch.push('wisk');

        // Fetch data
        const result = await orchestrator.fetchAllData({
          venueId: venue.id,
          apis: apisToFetch,
        });

        results.push({
          venueId: venue.id,
          venueName: venue.name,
          status: 'success',
          snapshotId: result.snapshotId,
          metrics: result.metrics,
          duration: result.duration,
          apis: result.results,
        });

        console.log(`[Cron] Successfully processed ${venue.name}`);

      } catch (error) {
        console.error(`[Cron] Error processing venue ${venue.name}:`, error);
        results.push({
          venueId: venue.id,
          venueName: venue.name,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Log summary
    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    const skippedCount = results.filter(r => r.status === 'skipped').length;

    console.log(`[Cron] Completed: ${successCount} success, ${errorCount} errors, ${skippedCount} skipped`);

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        total: venues.length,
        processed: successCount,
        errors: errorCount,
        skipped: skippedCount,
      },
      results,
    });

  } catch (error) {
    console.error('[Cron] Fatal error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}