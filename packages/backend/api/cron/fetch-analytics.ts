import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@venuesync/shared';
import { ToastAnalyticsConnector } from '../../src/connectors/toast-analytics';

/**
 * Cron job to fetch data from Toast Analytics API
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Verify authorization
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const startTime = Date.now();
  console.log(`[ANALYTICS CRON] Starting at ${new Date().toISOString()}`);

  try {
    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Get active venues
    const { data: venues, error: venuesError } = await supabase
      .from('venues')
      .select('id, name')
      .eq('is_active', true);

    if (venuesError) {
      throw new Error(`Failed to fetch venues: ${venuesError.message}`);
    }

    if (!venues || venues.length === 0) {
      return res.status(200).json({ 
        message: 'No active venues to process',
        duration: Date.now() - startTime,
      });
    }

    console.log(`[ANALYTICS CRON] Processing ${venues.length} venue(s)`);

    // Process each venue
    const results = await Promise.allSettled(
      venues.map(async (venue) => {
        console.log(`[ANALYTICS CRON] Processing venue: ${venue.name}`);

        try {
          // Get Toast Analytics credentials
          const { data: creds, error: credError } = await supabase
            .from('api_credentials')
            .select('*')
            .eq('venue_id', venue.id)
            .eq('api_name', 'toast')
            .eq('is_active', true)
            .single();

          if (credError || !creds) {
            throw new Error('No Toast Analytics credentials found');
          }

          // Check if this is analytics API
          if (creds.credentials.apiType !== 'analytics') {
            throw new Error('Not configured for Analytics API');
          }

          // Initialize Analytics connector
          const connector = new ToastAnalyticsConnector(
            {
              venueId: venue.id,
              apiName: 'toast',
              credentials: creds.credentials
            },
            {
              timeout: 30000,
              retryAttempts: 2,
              retryDelay: 1000
            },
            supabase
          );

          // Fetch last 7 days of data
          const endDate = new Date();
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);

          const result = await connector.fetchData({
            dateRange: { start: startDate, end: endDate }
          });

          // Store the data
          await connector.storeData(result, venue.id);

          // Update sync status
          await supabase
            .from('api_sync_status')
            .upsert({
              venue_id: venue.id,
              service: 'toast',
              last_sync_at: new Date().toISOString(),
              last_successful_sync_at: new Date().toISOString(),
              last_error: null,
              is_syncing: false
            }, {
              onConflict: 'venue_id,service'
            });

          return {
            venueId: venue.id,
            venueName: venue.name,
            success: true,
            recordsProcessed: result.totalOrders || 0
          };

        } catch (error) {
          console.error(`[ANALYTICS CRON] Error for venue ${venue.name}:`, error);
          
          // Update sync status with error
          await supabase
            .from('api_sync_status')
            .upsert({
              venue_id: venue.id,
              service: 'toast',
              last_sync_at: new Date().toISOString(),
              last_error: error instanceof Error ? error.message : 'Unknown error',
              is_syncing: false
            }, {
              onConflict: 'venue_id,service'
            });

          throw error;
        }
      })
    );

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
          error: result.reason.message || 'Unknown error',
        });
      }
    });

    const duration = Date.now() - startTime;
    console.log(`[ANALYTICS CRON] Completed in ${duration}ms`);

    // Log to cron_logs
    await supabase.from('cron_logs').insert({
      job_name: 'fetch-analytics',
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
    console.error('[ANALYTICS CRON] Failed:', error);

    // Log error
    try {
      const supabase = createClient<Database>(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!
      );
      
      await supabase.from('cron_logs').insert({
        job_name: 'fetch-analytics',
        status: 'failed',
        duration_ms: duration,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        executed_at: new Date().toISOString(),
      });
    } catch (logError) {
      console.error('[ANALYTICS CRON] Failed to log error:', logError);
    }

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
    });
  }
}