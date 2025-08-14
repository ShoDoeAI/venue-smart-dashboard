import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@venuesync/shared';
import type { AIContext } from './claude-ai';
import { getEasternBusinessDate, getEasternTodayStart, getEasternTimeComponents } from '../utils/timezone';

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
    
    // Get base context with Toast data
    const baseContext = await this.buildBasicContext(venueId);
    
    // Get Toast analytics for the period
    const toastAnalytics = await this.getToastAnalytics(defaultStart, defaultEnd, queryType);
    
    return {
      ...baseContext,
      toastAnalytics
    };
  }

  /**
   * Get Toast analytics from database
   */
  private async getToastAnalytics(startDate: Date, endDate: Date, queryType: string): Promise<ToastAnalytics> {
    const analytics: ToastAnalytics = {
      queryPeriod: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      }
    };
    
    // IMPORTANT: Use revenue_overrides table for accurate data (same as dashboard)
    const { data: overrides } = await this.supabase
      .from('revenue_overrides')
      .select('*')
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: true });
    
    const overrideMap = new Map<string, { revenue: number; checkCount: number }>();
    overrides?.forEach(override => {
      overrideMap.set(override.date, { 
        revenue: override.actual_revenue,
        checkCount: override.check_count 
      });
    });
    
    // Get simple transactions for dates without overrides
    const { data: transactions } = await this.supabase
      .from('simple_transactions')
      .select('*')
      .gte('transaction_date', startDate.toISOString())
      .lte('transaction_date', endDate.toISOString());
    
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
      query.lt('business_date', endBusinessDate);
    }
    
    const { data: orders } = await query.order('business_date', { ascending: true });
    
    if (!orders || orders.length === 0) {
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
    
    // Calculate daily breakdown
    const dailyMap = new Map<string, { revenue: number; orders: number; checks: number }>();
    
    // Initialize map with all days in range
    const current = new Date(startDate);
    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];
      dailyMap.set(dateStr, { revenue: 0, orders: 0, checks: 0 });
      current.setDate(current.getDate() + 1);
    }
    
    // Apply revenue overrides first (these are verified accurate)
    overrideMap.forEach((data, date) => {
      if (dailyMap.has(date)) {
        const day = dailyMap.get(date)!;
        day.revenue = data.revenue;
        day.checks = data.checkCount;
      }
    });
    
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
    
    return analytics;
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