import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@venuesync/shared';

import { getEasternBusinessDate, getEasternTodayStart } from '../utils/timezone';

import type { AIContext } from './claude-ai';

interface ToastAnalytics {
  queryPeriod?: {
    startDate: string;
    endDate: string;
  };
  noDataFound?: boolean;
  totalRevenue?: number;
  totalOrders?: number;
  totalChecks?: number;
  averageCheckSize?: number;
  dailyBreakdown?: Array<{
    date: string;
    revenue: number;
    orders: number;
    checks: number;
    dayOfWeek: string;
  }>;
  hourlyPattern?: Array<{
    hour: number;
    hourLabel: string;
    revenue: number;
    checks: number;
  }>;
  bestDay?: {
    date: string;
    revenue: number;
    orders: number;
    checks: number;
    dayOfWeek: string;
  };
  worstDay?: {
    date: string;
    revenue: number;
    orders: number;
    checks: number;
    dayOfWeek: string;
  };
  periodComparison?: {
    firstPeriod: {
      revenue: number;
      days: number;
      avgDaily: number;
    };
    secondPeriod: {
      revenue: number;
      days: number;
      avgDaily: number;
    };
    change: number;
    changePercent: number;
  };
  // New: Day of week patterns
  dayOfWeekAnalysis?: {
    [key: string]: {
      avgRevenue: number;
      totalRevenue: number;
      count: number;
      percentOfWeek: number;
    };
  };
  // New: Year over year comparison
  yearOverYear?: {
    currentPeriod: {
      year: number;
      revenue: number;
      orders: number;
      avgCheck: number;
    };
    previousPeriod: {
      year: number;
      revenue: number;
      orders: number;
      avgCheck: number;
    };
    growth: {
      revenue: number;
      orders: number;
      avgCheck: number;
    };
  };
  // New: Monthly trends
  monthlyTrend?: Array<{
    month: string;
    year: number;
    revenue: number;
    orders: number;
    avgDaily: number;
  }>;
  // New: Special events or anomalies
  insights?: {
    peakDays: string[];
    slowDays: string[];
    trends: string[];
    recommendations: string[];
  };
}

export class AIContextAggregatorToast {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Build enhanced context with actual Toast data from database
   */
  async buildEnhancedContext(
    venueId: string,
    queryType: 'revenue' | 'menu' | 'customers' | 'labor' | 'general',
    startDate?: Date,
    endDate?: Date
  ): Promise<AIContext & { toastAnalytics?: ToastAnalytics }> {
    // Use Eastern Time for business date calculations
    const now = new Date();
    const todayStart = getEasternTodayStart();
    const defaultStart = startDate || todayStart;
    const defaultEnd = endDate || now;
    
    // Debug logging
    console.log('[AIContextAggregatorToast] buildEnhancedContext called with:', {
      venueId,
      queryType,
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
      defaultStart: defaultStart.toISOString(),
      defaultEnd: defaultEnd.toISOString()
    });
    
    // Get base context with Toast data
    const baseContext = await this.buildBasicContext(venueId);
    
    // Get Toast analytics for the period
    const toastAnalytics = await this.getToastAnalytics(defaultStart, defaultEnd, queryType);
    
    console.log('[AIContextAggregatorToast] Toast analytics result:', {
      hasData: !!toastAnalytics,
      totalRevenue: toastAnalytics?.totalRevenue,
      dayCount: toastAnalytics?.dailyBreakdown?.length,
      noDataFound: toastAnalytics?.noDataFound
    });
    
    return {
      ...baseContext,
      toastAnalytics
    };
  }

  /**
   * Get Toast analytics from database
   */
  private async getToastAnalytics(startDate: Date, endDate: Date, queryType: string): Promise<ToastAnalytics> {
    console.log('[DEBUG 1] getToastAnalytics called:', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      queryType,
      timestamp: new Date().toISOString()
    });

    const analytics: ToastAnalytics = {
      queryPeriod: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      }
    };
    
    try {
      // Log before database query
      console.log('[DEBUG 2] Preparing revenue_overrides query:', {
        startDateStr: startDate.toISOString().split('T')[0],
        endDateStr: endDate.toISOString().split('T')[0],
        queryType
      });
      
      // IMPORTANT: Use revenue_overrides table for accurate data (same as dashboard)
      const { data: overrides, error: overridesError } = await this.supabase
        .from('revenue_overrides')
        .select('*')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: true });
        
      // Log database response
      console.log('[DEBUG 3] Revenue overrides response:', {
        status: overridesError ? 'error' : 'success',
        error: overridesError,
        dataCount: overrides?.length || 0,
        firstRow: overrides?.[0],
        lastRow: overrides?.[overrides.length - 1],
        allDates: overrides?.map(o => o.date)
      });
    
    const overrideMap = new Map<string, { revenue: number; checkCount: number }>();
    overrides?.forEach(override => {
      overrideMap.set(override.date, { 
        revenue: override.actual_revenue,
        checkCount: override.check_count 
      });
    });
    
    // Get simple transactions for dates without overrides
    console.log('[DEBUG 3.1] Querying simple_transactions...');
    const { data: transactions, error: transError } = await this.supabase
      .from('simple_transactions')
      .select('*')
      .gte('transaction_date', startDate.toISOString())
      .lte('transaction_date', endDate.toISOString());
      
    console.log('[DEBUG 3.2] Simple transactions result:', {
      error: transError,
      count: transactions?.length || 0
    });
    
    // Convert dates to business date format (YYYYMMDD)
    const startBusinessDate = parseInt(startDate.toISOString().split('T')[0].replace(/-/g, ''));
    const endBusinessDate = parseInt(endDate.toISOString().split('T')[0].replace(/-/g, ''));
    
    // Get orders by business date
    // For single day queries, we want ONLY that day
    const isSingleDay = startBusinessDate === endBusinessDate;
    const query = this.supabase
      .from('toast_orders')
      .select('order_guid, business_date, created_date')
      .gte('business_date', startBusinessDate);
    
    if (isSingleDay) {
      query.eq('business_date', startBusinessDate);
    } else {
      query.lte('business_date', endBusinessDate);
    }
    
    console.log('[DEBUG 3.3] Querying toast_orders with business dates:', {
      startBusinessDate,
      endBusinessDate,
      isSingleDay
    });
    
    const { data: orders, error: ordersError } = await query.order('business_date', { ascending: true });
    
    console.log('[DEBUG 3.4] Toast orders result:', {
      error: ordersError,
      count: orders?.length || 0,
      sampleBusinessDates: orders?.slice(0, 3).map(o => o.business_date)
    });
    
    if (!orders || orders.length === 0) {
      console.log('[DEBUG 3.5] No orders found, checking if we have revenue_overrides data');
      
      // If we have revenue overrides data, use that instead
      if (overrides && overrides.length > 0) {
        console.log('[DEBUG 3.6] Using revenue_overrides data instead of toast_orders');
        
        // Build daily breakdown from overrides
        analytics.dailyBreakdown = overrides.map(override => {
          const dayDate = new Date(override.date);
          return {
            date: override.date,
            dayOfWeek: dayDate.toLocaleDateString('en-US', { weekday: 'long' }),
            revenue: override.actual_revenue,
            orders: 0, // We don't have order count from overrides
            checks: override.check_count,
            avgCheckSize: override.check_count > 0 ? override.actual_revenue / override.check_count : 0,
            topItems: [],
            hasOverride: true
          };
        });
        
        // Calculate totals
        analytics.totalRevenue = overrides.reduce((sum, o) => sum + o.actual_revenue, 0);
        analytics.totalChecks = overrides.reduce((sum, o) => sum + o.check_count, 0);
        analytics.averageCheckSize = analytics.totalChecks > 0 ? analytics.totalRevenue / analytics.totalChecks : 0;
        
        console.log('[DEBUG 3.7] Revenue from overrides:', {
          totalRevenue: analytics.totalRevenue,
          days: analytics.dailyBreakdown.length,
          dates: analytics.dailyBreakdown.map(d => d.date)
        });
        
        return analytics;
      }
      
      analytics.noDataFound = true;
      analytics.totalRevenue = 0;
      analytics.totalOrders = 0;
      analytics.totalChecks = 0;
      return analytics;
    }
    
    // Get all checks for these orders
    const orderGuids = orders.map(o => o.order_guid);
    const { data: checks } = await this.supabase
      .from('toast_checks')
      .select('check_guid, total_amount, created_date, order_guid, voided')
      .in('order_guid', orderGuids)
      .eq('voided', false);
    
    // CRITICAL: Only use revenue_overrides data for 100% accuracy
    // If we have revenue overrides, use ONLY that data
    if (overrideMap.size > 0) {
      console.log('[DEBUG 4] Using ONLY revenue_overrides for accuracy');
      
      const dailyBreakdown: Array<{
        date: string;
        revenue: number;
        orders: number;
        checks: number;
        dayOfWeek: string;
      }> = [];
      
      // Use ONLY the dates that have revenue_overrides entries
      overrideMap.forEach((data, date) => {
        dailyBreakdown.push({
          date,
          revenue: data.revenue,
          orders: 0, // We don't track orders in overrides
          checks: data.checkCount,
          dayOfWeek: new Date(date).toLocaleDateString('en-US', { weekday: 'short' })
        });
      });
      
      // Sort by date
      dailyBreakdown.sort((a, b) => a.date.localeCompare(b.date));
      
      // Calculate totals from overrides ONLY
      analytics.totalRevenue = Array.from(overrideMap.values()).reduce((sum, data) => sum + data.revenue, 0);
      analytics.totalChecks = Array.from(overrideMap.values()).reduce((sum, data) => sum + data.checkCount, 0);
      analytics.totalOrders = 0;
      analytics.averageCheckSize = analytics.totalChecks > 0 ? analytics.totalRevenue / analytics.totalChecks : 0;
      analytics.dailyBreakdown = dailyBreakdown;
      
      console.log('[DEBUG 4.1] Revenue from overrides ONLY:', {
        totalRevenue: analytics.totalRevenue,
        dayCount: dailyBreakdown.length,
        dates: dailyBreakdown.map(d => ({ date: d.date, revenue: d.revenue }))
      });
      
      return analytics;
    }
    
    // If no overrides, calculate from other sources
    console.log('[DEBUG 4.2] No revenue_overrides found, using fallback calculation');
    const dailyMap = new Map<string, { revenue: number; orders: number; checks: number }>();
    
    // Add transaction data for dates without overrides
    transactions?.forEach(transaction => {
      const dateStr = new Date(transaction.transaction_date).toISOString().split('T')[0];
      if (dailyMap.has(dateStr) && !overrideMap.has(dateStr)) {
        const day = dailyMap.get(dateStr)!;
        day.revenue += transaction.amount || 0;
        day.orders++;
        day.checks++;
      }
    });
    
    // Count orders by business date
    orders.forEach(order => {
      const dateStr = String(order.business_date).replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
      if (dailyMap.has(dateStr)) {
        dailyMap.get(dateStr)!.orders++;
      }
    });
    
    // Add check revenue for dates without overrides
    checks?.forEach(check => {
      const order = orders.find(o => o.order_guid === check.order_guid);
      if (order) {
        const dateStr = String(order.business_date).replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
        // Only update if we don't have an override for this date
        if (dailyMap.has(dateStr) && !overrideMap.has(dateStr)) {
          const day = dailyMap.get(dateStr)!;
          day.revenue += check.total_amount || 0;
          day.checks++;
        }
      }
    });
    
    // Log daily map state before totals
    console.log('[DEBUG 4] Daily map state:', {
      mapSize: dailyMap.size,
      dates: Array.from(dailyMap.keys()),
      sampleData: Array.from(dailyMap.entries()).slice(0, 3)
    });

    // Calculate totals and build daily breakdown
    let totalRevenue = 0;
    let totalOrders = 0;
    let totalChecks = 0;
    const dailyBreakdown: Array<{
      date: string;
      revenue: number;
      orders: number;
      checks: number;
      dayOfWeek: string;
    }> = [];
    
    dailyMap.forEach((data, date) => {
      totalRevenue += data.revenue;
      totalOrders += data.orders;
      totalChecks += data.checks;
      dailyBreakdown.push({
        date,
        revenue: data.revenue,
        orders: data.orders,
        checks: data.checks,
        dayOfWeek: new Date(date).toLocaleDateString('en-US', { weekday: 'short' })
      });
    });
    
    analytics.totalRevenue = totalRevenue;
    analytics.totalOrders = totalOrders;
    analytics.totalChecks = totalChecks;
    analytics.averageCheckSize = totalChecks > 0 ? totalRevenue / totalChecks : 0;
    analytics.dailyBreakdown = dailyBreakdown;
    
    // Add hourly pattern for revenue queries
    if (queryType === 'revenue' && checks) {
      const hourlyMap = new Map<number, { revenue: number; checks: number }>();
      
      checks.forEach(check => {
        const hour = new Date(check.created_date).getHours();
        if (!hourlyMap.has(hour)) {
          hourlyMap.set(hour, { revenue: 0, checks: 0 });
        }
        const hourData = hourlyMap.get(hour)!;
        hourData.revenue += check.total_amount || 0;
        hourData.checks++;
      });
      
      analytics.hourlyPattern = Array.from(hourlyMap.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([hour, data]) => ({
          hour,
          hourLabel: `${hour}:00`,
          revenue: data.revenue,
          checks: data.checks
        }));
    }
    
    // Find best and worst days
    const sortedDays = [...dailyBreakdown].sort((a, b) => b.revenue - a.revenue);
    if (sortedDays.length > 0) {
      analytics.bestDay = sortedDays[0];
      analytics.worstDay = sortedDays[sortedDays.length - 1];
    }
    
    // Day of Week Analysis
    if (dailyBreakdown.length >= 7) {
      const dayOfWeekData: Record<string, { total: number; count: number; dates: string[] }> = {
        'Mon': { total: 0, count: 0, dates: [] },
        'Tue': { total: 0, count: 0, dates: [] },
        'Wed': { total: 0, count: 0, dates: [] },
        'Thu': { total: 0, count: 0, dates: [] },
        'Fri': { total: 0, count: 0, dates: [] },
        'Sat': { total: 0, count: 0, dates: [] },
        'Sun': { total: 0, count: 0, dates: [] }
      };
      
      dailyBreakdown.forEach(day => {
        const dow = day.dayOfWeek;
        if (dayOfWeekData[dow]) {
          dayOfWeekData[dow].total += day.revenue;
          dayOfWeekData[dow].count++;
          dayOfWeekData[dow].dates.push(day.date);
        }
      });
      
      const weekTotal = Object.values(dayOfWeekData).reduce((sum, d) => sum + d.total, 0);
      analytics.dayOfWeekAnalysis = {};
      
      Object.entries(dayOfWeekData).forEach(([day, data]) => {
        if (data.count > 0) {
          analytics.dayOfWeekAnalysis![day] = {
            avgRevenue: data.total / data.count,
            totalRevenue: data.total,
            count: data.count,
            percentOfWeek: (data.total / weekTotal) * 100
          };
        }
      });
    }
    
    // Year over Year Comparison (if querying same period last year)
    if (queryType === 'revenue' && dailyBreakdown.length > 0) {
      const currentYear = new Date(endDate).getFullYear();
      const startLastYear = new Date(startDate);
      startLastYear.setFullYear(currentYear - 1);
      const endLastYear = new Date(endDate);
      endLastYear.setFullYear(currentYear - 1);
      
      // Get last year's data
      const { data: lastYearOverrides } = await this.supabase
        .from('revenue_overrides')
        .select('*')
        .gte('date', startLastYear.toISOString().split('T')[0])
        .lte('date', endLastYear.toISOString().split('T')[0]);
      
      if (lastYearOverrides && lastYearOverrides.length > 0) {
        const lastYearRevenue = lastYearOverrides.reduce((sum, d) => sum + (d.actual_revenue || 0), 0);
        const lastYearOrders = lastYearOverrides.reduce((sum, d) => sum + (d.check_count || 0), 0);
        
        analytics.yearOverYear = {
          currentPeriod: {
            year: currentYear,
            revenue: totalRevenue,
            orders: totalOrders,
            avgCheck: totalOrders > 0 ? totalRevenue / totalOrders : 0
          },
          previousPeriod: {
            year: currentYear - 1,
            revenue: lastYearRevenue,
            orders: lastYearOrders,
            avgCheck: lastYearOrders > 0 ? lastYearRevenue / lastYearOrders : 0
          },
          growth: {
            revenue: lastYearRevenue > 0 ? ((totalRevenue - lastYearRevenue) / lastYearRevenue) * 100 : 0,
            orders: lastYearOrders > 0 ? ((totalOrders - lastYearOrders) / lastYearOrders) * 100 : 0,
            avgCheck: 0 // Will calculate below
          }
        };
        
        // Calculate average check growth
        const currentAvg = analytics.yearOverYear.currentPeriod.avgCheck;
        const previousAvg = analytics.yearOverYear.previousPeriod.avgCheck;
        if (previousAvg > 0) {
          analytics.yearOverYear.growth.avgCheck = ((currentAvg - previousAvg) / previousAvg) * 100;
        }
      }
    }
    
    // Generate Insights
    analytics.insights = {
      peakDays: sortedDays.slice(0, 3).map(d => `${d.date} (${d.dayOfWeek}): $${d.revenue.toFixed(2)}`),
      slowDays: sortedDays.slice(-3).map(d => `${d.date} (${d.dayOfWeek}): $${d.revenue.toFixed(2)}`),
      trends: [],
      recommendations: []
    };
    
    // Add trend insights
    if (analytics.dayOfWeekAnalysis) {
      const bestDayOfWeek = Object.entries(analytics.dayOfWeekAnalysis)
        .sort((a, b) => b[1].avgRevenue - a[1].avgRevenue)[0];
      analytics.insights.trends.push(`${bestDayOfWeek[0]} is your strongest day averaging $${bestDayOfWeek[1].avgRevenue.toFixed(2)}`);
    }
    
    if (analytics.yearOverYear) {
      const yoyGrowth = analytics.yearOverYear.growth.revenue;
      if (yoyGrowth > 0) {
        analytics.insights.trends.push(`Revenue up ${yoyGrowth.toFixed(1)}% vs same period last year`);
      } else if (yoyGrowth < 0) {
        analytics.insights.trends.push(`Revenue down ${Math.abs(yoyGrowth).toFixed(1)}% vs same period last year`);
      }
    }
    
    // Calculate week over week if applicable
    if (dailyBreakdown.length >= 14) {
      const midPoint = Math.floor(dailyBreakdown.length / 2);
      const firstHalf = dailyBreakdown.slice(0, midPoint);
      const secondHalf = dailyBreakdown.slice(midPoint);
      
      const firstHalfRevenue = firstHalf.reduce((sum, day) => sum + day.revenue, 0);
      const secondHalfRevenue = secondHalf.reduce((sum, day) => sum + day.revenue, 0);
      
      analytics.periodComparison = {
        firstPeriod: {
          revenue: firstHalfRevenue,
          days: firstHalf.length,
          avgDaily: firstHalfRevenue / firstHalf.length
        },
        secondPeriod: {
          revenue: secondHalfRevenue,
          days: secondHalf.length,
          avgDaily: secondHalfRevenue / secondHalf.length
        },
        change: secondHalfRevenue - firstHalfRevenue,
        changePercent: firstHalfRevenue > 0 ? ((secondHalfRevenue - firstHalfRevenue) / firstHalfRevenue) * 100 : 0
      };
    }
    
    // Log final analytics before returning
    console.log('[DEBUG 5] Final analytics result:', {
      totalRevenue: analytics.totalRevenue,
      totalOrders: analytics.totalOrders,
      totalChecks: analytics.totalChecks,
      dayCount: analytics.dailyBreakdown?.length,
      noDataFound: analytics.noDataFound,
      queryPeriod: analytics.queryPeriod,
      hasHourlyPattern: !!analytics.hourlyPattern,
      hasDayOfWeekAnalysis: !!analytics.dayOfWeekAnalysis,
      sampleDailyData: analytics.dailyBreakdown?.slice(0, 2)
    });
    
    return analytics;
    
    } catch (error) {
      console.error('[DEBUG ERROR] getToastAnalytics error:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        queryType
      });
      
      // Return empty analytics on error
      analytics.noDataFound = true;
      analytics.totalRevenue = 0;
      analytics.totalOrders = 0;
      analytics.totalChecks = 0;
      return analytics;
    }
  }

  /**
   * Build basic context with current metrics
   */
  private async buildBasicContext(venueId: string): Promise<AIContext> {
    const venue = {
      id: venueId,
      name: "Venue",
      type: 'Restaurant & Bar'
    };

    // Use Eastern Time for business date calculations
    const todayBusinessDate = getEasternBusinessDate();
    
    // Get today's data from Toast
    const { data: todayOrders } = await this.supabase
      .from('toast_orders')
      .select('order_guid')
      .eq('business_date', todayBusinessDate);
    
    let todayRevenue = 0;
    let todayChecks = 0;
    
    if (todayOrders && todayOrders.length > 0) {
      const orderGuids = todayOrders.map(o => o.order_guid);
      const { data: checks } = await this.supabase
        .from('toast_checks')
        .select('total_amount')
        .in('order_guid', orderGuids)
        .eq('voided', false);
      
      todayRevenue = checks?.reduce((sum, c) => sum + (c.total_amount || 0), 0) || 0;
      todayChecks = checks?.length || 0;
    }

    return {
      venue,
      currentMetrics: {
        todayRevenue,
        todayTransactions: todayChecks,
        todayCustomers: todayChecks,
        lastHourRevenue: 0,
        activeEvents: 0,
      },
      historicalTrends: {
        revenueGrowth: 0,
        customerGrowth: 0,
        averageTicketPrice: todayChecks > 0 ? todayRevenue / todayChecks : 0,
        peakHours: [17, 18, 19, 20, 21],
      },
      activeAlerts: [],
      availableActions: [],
    };
  }
}