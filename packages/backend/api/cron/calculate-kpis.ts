import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { KPICalculator } from '../../src/services/kpi-calculator';
import { AlertGenerator } from '../../src/services/alert-generator';
import type { Database } from '@venuesync/shared';

/**
 * Vercel Cron job to calculate KPIs and generate analytics
 * Runs daily at 1 AM: "0 1 * * *"
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
  console.log(`[CRON] Starting KPI calculation at ${new Date().toISOString()}`);

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

    // Initialize KPI calculator and alert generator
    const kpiCalculator = new KPICalculator(supabase);
    const alertGenerator = new AlertGenerator();

    // Calculate date range (yesterday)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setHours(23, 59, 59, 999);

    // Process each venue
    const results = await Promise.allSettled(
      venues.map(async (venue) => {
        console.log(`[CRON] Calculating KPIs for venue: ${venue.name} (${venue.id})`);

        try {
          // Calculate daily KPIs
          const dailyKPIs = await kpiCalculator.calculateDailyKPIs(
            venue.id,
            yesterday
          );

          // Calculate weekly KPIs (if it's Monday)
          let weeklyKPIs = null;
          if (yesterday.getDay() === 0) { // Sunday
            const weekStart = new Date(yesterday);
            weekStart.setDate(weekStart.getDate() - 6);
            weeklyKPIs = await kpiCalculator.calculateWeeklyKPIs(
              venue.id,
              weekStart,
              yesterday
            );
          }

          // Calculate monthly KPIs (if it's the last day of the month)
          let monthlyKPIs = null;
          const tomorrow = new Date(yesterday);
          tomorrow.setDate(tomorrow.getDate() + 1);
          if (tomorrow.getDate() === 1) {
            const monthStart = new Date(yesterday.getFullYear(), yesterday.getMonth(), 1);
            monthlyKPIs = await kpiCalculator.calculateMonthlyKPIs(
              venue.id,
              monthStart,
              yesterday
            );
          }

          // Calculate real-time metrics
          const realtimeMetrics = await kpiCalculator.calculateRealtimeMetrics(
            venue.id
          );

          // Generate alerts based on KPIs
          const kpiResult = {
            venueMetrics: {
              venueId: venue.id,
              venueName: venue.name,
              period: 'daily',
              revenueMetrics: dailyKPIs?.revenueMetrics || {},
              attendanceMetrics: dailyKPIs?.attendanceMetrics || {},
              hourlyBreakdown: dailyKPIs?.hourlyBreakdown || [],
            },
            eventMetrics: realtimeMetrics?.upcomingEvents ? {
              upcomingEvents: realtimeMetrics.upcomingEvents,
            } : undefined,
          };

          const alerts = await alertGenerator.generateAlerts(kpiResult);

          return {
            venueId: venue.id,
            venueName: venue.name,
            success: true,
            kpis: {
              daily: dailyKPIs,
              weekly: weeklyKPIs,
              monthly: monthlyKPIs,
              realtime: realtimeMetrics,
            },
            alertsGenerated: alerts.length,
          };
        } catch (error) {
          throw error;
        }
      })
    );

    // Summarize results
    const summary = {
      totalVenues: venues.length,
      successful: 0,
      failed: 0,
      totalAlertsGenerated: 0,
      results: [] as any[],
    };

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        summary.successful++;
        summary.totalAlertsGenerated += result.value.alertsGenerated || 0;
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
    console.log(`[CRON] KPI calculation completed in ${duration}ms`);
    console.log(`[CRON] Summary: ${summary.successful} successful, ${summary.failed} failed`);

    // Log to cron_logs table
    await supabase.from('cron_logs').insert({
      job_name: 'calculate-kpis',
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
    console.error('[CRON] KPI calculation failed:', error);

    // Log error to cron_logs table
    try {
      const supabase = createClient<Database>(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!
      );
      
      await supabase.from('cron_logs').insert({
        job_name: 'calculate-kpis',
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