import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { KPICalculator } from '../src/services/kpi-calculator';
import { AlertGenerator } from '../src/services/alert-generator';
import type { Database } from '@venuesync/shared';

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

    // Get venue ID from query or default
    const venueId = req.query.venueId as string || 'default-venue-id';

    // Get latest snapshot
    const { data: snapshot, error: snapshotError } = await supabase
      .from('venue_snapshots')
      .select('*')
      .eq('venue_id', venueId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (snapshotError && snapshotError.code !== 'PGRST116') {
      console.error('Error fetching snapshot:', snapshotError);
    }

    // Get real-time KPIs
    const kpiCalculator = new KPICalculator(supabase);
    let realtimeMetrics;
    
    try {
      realtimeMetrics = await kpiCalculator.calculateRealtimeMetrics(venueId);
    } catch (error) {
      console.error('Error calculating real-time metrics:', error);
    }

    // Get active alerts
    const alertGenerator = new AlertGenerator();
    const alerts = await alertGenerator.getActiveAlerts();

    // Get today's summary
    const { data: todaySummary } = await supabase
      .from('daily_summaries')
      .select('*')
      .eq('venue_id', venueId)
      .eq('summary_date', new Date().toISOString().split('T')[0])
      .single();

    // Prepare response
    const response = {
      success: true,
      snapshot: snapshot || null,
      kpis: {
        revenueMetrics: {
          current: todaySummary?.total_revenue || 0,
          lastPeriod: 0, // Would calculate from previous day
          growth: 0
        },
        attendanceMetrics: {
          current: todaySummary?.unique_customers || 0,
          capacity: 500, // Would come from venue settings
          utilizationRate: 0
        },
        transactionMetrics: {
          count: todaySummary?.transaction_count || 0,
          avgAmount: todaySummary?.average_transaction || 0
        },
        eventMetrics: {
          ticketsSoldToday: todaySummary?.total_tickets_sold || 0
        },
        upcomingEvents: realtimeMetrics?.upcomingEvents || []
      },
      alerts: alerts.slice(0, 5), // Top 5 alerts
      lastUpdated: new Date().toISOString()
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Dashboard API error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}