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

    // Get venue ID from query or use Jack's on Water Street
    const venueId = req.query.venueId as string || 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c';
    
    // Get date range from query params
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

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
    let historicalData;
    
    try {
      realtimeMetrics = await kpiCalculator.calculateRealtimeMetrics(venueId);
      
      // If date range provided, fetch historical data
      if (startDate && endDate) {
        const { data: historicalTransactions } = await supabase
          .from('toast_transactions')
          .select('*')
          .gte('transaction_date', startDate)
          .lte('transaction_date', endDate)
          .order('transaction_date', { ascending: true });
          
        historicalData = historicalTransactions;
      }
    } catch (error) {
      console.error('Error calculating metrics:', error);
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

    // Calculate hourly breakdown if we have Toast data
    let hourlyBreakdown;
    if (todaySummary) {
      const { data: todayTransactions } = await supabase
        .from('toast_transactions')
        .select('transaction_date, total_amount, customer_id')
        .gte('transaction_date', new Date().toISOString().split('T')[0])
        .lt('transaction_date', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
        
      if (todayTransactions) {
        hourlyBreakdown = Array.from({ length: 24 }, (_, hour) => {
          const hourTransactions = todayTransactions.filter(tx => {
            const txHour = new Date(tx.transaction_date).getHours();
            return txHour === hour;
          });
          
          return {
            hour,
            revenue: hourTransactions.reduce((sum, tx) => sum + (tx.total_amount || 0), 0),
            transactions: hourTransactions.length,
            customers: new Set(hourTransactions.map(tx => tx.customer_id).filter(Boolean)).size
          };
        });
      }
    }
    
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
        upcomingEvents: realtimeMetrics?.upcomingEvents || [],
        hourlyBreakdown: hourlyBreakdown || []
      },
      historicalData: historicalData || null,
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