import { createClient } from '@supabase/supabase-js';
import type { Database } from '@venuesync/shared';
import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * API endpoint for historical dashboard data queries
 * Supports date range queries for revenue analysis
 */
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

    // Get query parameters
    const {
      venueId = 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c',
      startDate,
      endDate,
      granularity = 'daily', // daily, weekly, monthly
      metrics = 'revenue,transactions,customers'
    } = req.query;

    // Validate required parameters
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        error: 'startDate and endDate are required',
        example: '/api/dashboard/historical?startDate=2024-01-01&endDate=2024-01-31'
      });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    if (start >= end) {
      return res.status(400).json({ error: 'startDate must be before endDate' });
    }

    // Get venue's location ID for Toast transactions
    const { data: credentials, error: credError } = await supabase
      .from('api_credentials')
      .select('credentials')
      .eq('venue_id', venueId)
      .eq('service_name', 'toast')
      .eq('is_active', true)
      .single();

    if (credError || !credentials?.credentials?.locationGuid) {
      return res.status(404).json({ error: 'Toast credentials not found for venue' });
    }

    const locationId = credentials.credentials.locationGuid;
    const requestedMetrics = (metrics as string).split(',').map(m => m.trim());

    // Choose the appropriate view based on granularity
    let viewName = 'daily_revenue_summary';
    let dateColumn = 'date';
    const groupByClause = '';

    switch (granularity) {
      case 'weekly':
        viewName = 'weekly_revenue_summary';
        dateColumn = 'week_start';
        break;
      case 'monthly':
        viewName = 'monthly_revenue_summary';
        dateColumn = 'month_start';
        break;
      default:
        viewName = 'daily_revenue_summary';
        dateColumn = 'date';
    }

    // Query the appropriate summary view
    const { data: summaryData, error: summaryError } = await supabase
      .from(viewName)
      .select('*')
      .eq('location_id', locationId)
      .gte(dateColumn, start.toISOString().split('T')[0])
      .lte(dateColumn, end.toISOString().split('T')[0])
      .order(dateColumn, { ascending: true });

    if (summaryError) {
      console.error('Summary query error:', summaryError);
      return res.status(500).json({ error: 'Failed to fetch historical data' });
    }

    // Calculate period totals and comparisons
    const totalRevenue = summaryData?.reduce((sum, period) => sum + (period.total_revenue || 0), 0) || 0;
    const totalTransactions = summaryData?.reduce((sum, period) => sum + (period.transaction_count || 0), 0) || 0;
    const totalCustomers = summaryData?.reduce((sum, period) => sum + (period.unique_customers || 0), 0) || 0;
    const avgTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    // Find best and worst performing periods
    const bestPeriod = summaryData?.reduce((best, period) => 
      (period.total_revenue || 0) > (best.total_revenue || 0) ? period : best
    );
    const worstPeriod = summaryData?.reduce((worst, period) => 
      (period.total_revenue || 0) < (worst.total_revenue || 0) ? period : worst
    );

    // Calculate comparison period (same length, prior to start date)
    const periodDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const comparisonStart = new Date(start);
    comparisonStart.setDate(comparisonStart.getDate() - periodDays);
    const comparisonEnd = new Date(start);

    const { data: comparisonData } = await supabase
      .from(viewName)
      .select('*')
      .eq('location_id', locationId)
      .gte(dateColumn, comparisonStart.toISOString().split('T')[0])
      .lt(dateColumn, comparisonEnd.toISOString().split('T')[0]);

    const comparisonRevenue = comparisonData?.reduce((sum, period) => sum + (period.total_revenue || 0), 0) || 0;
    const comparisonTransactions = comparisonData?.reduce((sum, period) => sum + (period.transaction_count || 0), 0) || 0;
    const comparisonCustomers = comparisonData?.reduce((sum, period) => sum + (period.unique_customers || 0), 0) || 0;

    // Calculate growth rates
    const revenueGrowth = comparisonRevenue > 0 ? ((totalRevenue - comparisonRevenue) / comparisonRevenue) * 100 : 0;
    const transactionGrowth = comparisonTransactions > 0 ? ((totalTransactions - comparisonTransactions) / comparisonTransactions) * 100 : 0;
    const customerGrowth = comparisonCustomers > 0 ? ((totalCustomers - comparisonCustomers) / comparisonCustomers) * 100 : 0;

    // Build response based on requested metrics
    const response: any = {
      success: true,
      period: {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
        granularity,
        totalDays: periodDays,
      },
      summary: {},
      trends: [],
      insights: {
        bestPeriod: bestPeriod ? {
          date: bestPeriod[dateColumn],
          revenue: bestPeriod.total_revenue,
          transactions: bestPeriod.transaction_count,
        } : null,
        worstPeriod: worstPeriod ? {
          date: worstPeriod[dateColumn],
          revenue: worstPeriod.total_revenue,
          transactions: worstPeriod.transaction_count,
        } : null,
      },
      comparison: {
        periodStart: comparisonStart.toISOString().split('T')[0],
        periodEnd: comparisonEnd.toISOString().split('T')[0],
        revenueGrowth: parseFloat(revenueGrowth.toFixed(2)),
        transactionGrowth: parseFloat(transactionGrowth.toFixed(2)),
        customerGrowth: parseFloat(customerGrowth.toFixed(2)),
      },
    };

    // Add requested metrics to summary
    if (requestedMetrics.includes('revenue')) {
      response.summary.revenue = {
        total: parseFloat(totalRevenue.toFixed(2)),
        average: parseFloat((totalRevenue / periodDays).toFixed(2)),
        growth: parseFloat(revenueGrowth.toFixed(2)),
      };
    }

    if (requestedMetrics.includes('transactions')) {
      response.summary.transactions = {
        total: totalTransactions,
        average: parseFloat((totalTransactions / periodDays).toFixed(1)),
        avgValue: parseFloat(avgTransactionValue.toFixed(2)),
        growth: parseFloat(transactionGrowth.toFixed(2)),
      };
    }

    if (requestedMetrics.includes('customers')) {
      response.summary.customers = {
        total: totalCustomers,
        average: parseFloat((totalCustomers / periodDays).toFixed(1)),
        growth: parseFloat(customerGrowth.toFixed(2)),
      };
    }

    // Add time series data
    response.trends = summaryData?.map(period => ({
      date: period[dateColumn],
      revenue: period.total_revenue || 0,
      transactions: period.transaction_count || 0,
      customers: period.unique_customers || 0,
      avgTransactionValue: period.transaction_count > 0 ? 
        parseFloat(((period.total_revenue || 0) / period.transaction_count).toFixed(2)) : 0,
    })) || [];

    return res.status(200).json(response);

  } catch (error) {
    console.error('Historical dashboard API error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}