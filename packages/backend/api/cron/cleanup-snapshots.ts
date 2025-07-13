import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { SnapshotService } from '../../src/services/snapshot-service';
import type { Database } from '@venuesync/shared/types/database.generated';

/**
 * Vercel Cron job to cleanup old snapshots
 * Runs weekly on Sunday at 3 AM: "0 3 * * 0"
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Verify cron secret
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const startTime = Date.now();
  console.log(`[CRON] Starting snapshot cleanup at ${new Date().toISOString()}`);

  try {
    // Initialize Supabase client
    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Get all venues (including inactive ones for cleanup)
    const { data: venues, error: venuesError } = await supabase
      .from('venues')
      .select('id, name');

    if (venuesError) {
      throw new Error(`Failed to fetch venues: ${venuesError.message}`);
    }

    if (!venues || venues.length === 0) {
      console.log('[CRON] No venues found');
      return res.status(200).json({ 
        message: 'No venues to process',
        duration: Date.now() - startTime,
      });
    }

    // Initialize snapshot service
    const snapshotService = new SnapshotService(supabase);

    // Process each venue
    const results = await Promise.allSettled(
      venues.map(async (venue) => {
        console.log(`[CRON] Cleaning up snapshots for venue: ${venue.name} (${venue.id})`);

        try {
          // Clean up snapshots older than 30 days
          await snapshotService.cleanupOldSnapshots(venue.id, 30);

          // Get count of remaining snapshots
          const { count, error: countError } = await supabase
            .from('venue_snapshots')
            .select('*', { count: 'exact', head: true })
            .eq('venue_id', venue.id);

          if (countError) {
            throw countError;
          }

          return {
            venueId: venue.id,
            venueName: venue.name,
            success: true,
            remainingSnapshots: count || 0,
          };
        } catch (error) {
          throw error;
        }
      })
    );

    // Also cleanup orphaned transaction data
    console.log('[CRON] Cleaning up orphaned transaction data...');
    
    // Delete Toast transactions with no corresponding snapshot
    const { error: toastCleanupError } = await supabase
      .from('toast_transactions')
      .delete()
      .not('snapshot_timestamp', 'in', 
        `(SELECT created_at FROM venue_snapshots)`
      );
    
    if (toastCleanupError) {
      console.error('[CRON] Failed to cleanup Toast transactions:', toastCleanupError);
    }

    // Delete Eventbrite transactions with no corresponding snapshot
    const { error: eventbriteCleanupError } = await supabase
      .from('eventbrite_transactions')
      .delete()
      .not('snapshot_timestamp', 'in', 
        `(SELECT created_at FROM venue_snapshots)`
      );
    
    if (eventbriteCleanupError) {
      console.error('[CRON] Failed to cleanup Eventbrite transactions:', eventbriteCleanupError);
    }

    // Delete OpenDate transactions with no corresponding snapshot
    const { error: opendateCleanupError } = await supabase
      .from('opendate_transactions')
      .delete()
      .not('snapshot_timestamp', 'in', 
        `(SELECT created_at FROM venue_snapshots)`
      );
    
    if (opendateCleanupError) {
      console.error('[CRON] Failed to cleanup OpenDate transactions:', opendateCleanupError);
    }

    // Summarize results
    const summary = {
      totalVenues: venues.length,
      successful: 0,
      failed: 0,
      results: [] as any[],
    };

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        summary.successful++;
        summary.results.push(result.value);
      } else {
        summary.failed++;
        summary.results.push({
          venueId: venues[index].id,
          venueName: venues[index].name,
          success: false,
          error: result.reason.message || 'Unknown error',
        });
      }
    });

    const duration = Date.now() - startTime;
    console.log(`[CRON] Snapshot cleanup completed in ${duration}ms`);
    console.log(`[CRON] Summary: ${summary.successful} successful, ${summary.failed} failed`);

    // Log to cron_logs table
    await supabase.from('cron_logs').insert({
      job_name: 'cleanup-snapshots',
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
    console.error('[CRON] Snapshot cleanup failed:', error);

    // Log error to cron_logs table
    try {
      const supabase = createClient<Database>(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!
      );
      
      await supabase.from('cron_logs').insert({
        job_name: 'cleanup-snapshots',
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