import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@venuesync/shared';

export interface DailyKPIs {
  date: string;
  revenue: {
    total: number;
    pos: number;           // Toast POS
    events: number;        // Eventbrite
    tickets: number;       // OpenDate.io
    byHour: Array<{ hour: number; amount: number }>;
    byCategory: Array<{ category: string; amount: number }>;
  };
  transactions: {
    total: number;
    average: number;
    bySource: Array<{ source: string; count: number }>;
    byPaymentMethod: Array<{ method: string; count: number }>;
  };
  customers: {
    unique: number;
    new: number;
    returning: number;
    topCustomers: Array<{ 
      customerId: string; 
      name?: string; 
      totalSpent: number; 
      transactionCount: number;
    }>;
  };
  // Legacy properties for backward compatibility
  revenueMetrics?: any;
  attendanceMetrics?: any;
  hourlyBreakdown?: any[];
  inventory?: {
    topItems: Array<{ name: string; quantity: number; revenue: number }>;
    lowStock: Array<{ name: string; remaining: number; threshold: number }>;
  };
  events?: {
    total: number;
    attendees: number;
    capacity: number;
    utilizationRate: number;
    topEvents: Array<{ 
      name: string; 
      attendees: number; 
      revenue: number; 
      date: string;
    }>;
  };
}

export interface WeeklyKPIs extends Omit<DailyKPIs, 'date'> {
  weekStart: string;
  weekEnd: string;
  dailyComparison: Array<{
    date: string;
    revenue: number;
    transactions: number;
    customers: number;
  }>;
  growthRates: {
    revenue: number;
    transactions: number;
    customers: number;
  };
}

export interface MonthlyKPIs extends Omit<WeeklyKPIs, 'weekStart' | 'weekEnd' | 'dailyComparison'> {
  month: string;
  year: number;
  weeklyComparison: Array<{
    weekNumber: number;
    revenue: number;
    transactions: number;
    customers: number;
  }>;
  yearOverYear: {
    revenue: number;
    transactions: number;
    customers: number;
  };
}

export interface RealtimeMetrics {
  timestamp: string;
  todayRevenue: number;
  todayTransactions: number;
  todayCustomers: number;
  lastHourRevenue: number;
  lastHourTransactions: number;
  activeEvents: number;
  upcomingEvents: Array<{
    name: string;
    startTime: string;
    soldTickets: number;
    capacity: number;
  }>;
}

export class KPICalculator {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Calculate daily KPIs for a venue
   */
  async calculateDailyKPIs(venueId: string, date: Date): Promise<DailyKPIs> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Fetch all transactions for the day from all sources
    const [toastData, eventbriteData, opendateData] = await Promise.all([
      this.fetchToastTransactions(venueId, startOfDay, endOfDay),
      this.fetchEventbriteTransactions(venueId, startOfDay, endOfDay),
      this.fetchOpenDateTransactions(venueId, startOfDay, endOfDay),
    ]);

    // Combine all transactions
    const allTransactions = [
      ...toastData.transactions,
      ...eventbriteData.transactions,
      ...opendateData.transactions,
    ];

    // Calculate revenue metrics
    const revenue = this.calculateRevenueMetrics(
      allTransactions,
      toastData.revenue,
      eventbriteData.revenue,
      opendateData.revenue
    );

    // Calculate transaction metrics
    const transactions = this.calculateTransactionMetrics(allTransactions);

    // Calculate customer metrics
    const customers = await this.calculateCustomerMetrics(
      venueId,
      allTransactions,
      startOfDay,
      endOfDay
    );

    // Calculate inventory metrics (if Toast data available)
    const inventory = toastData.inventory 
      ? this.calculateInventoryMetrics(toastData.inventory)
      : undefined;

    // Calculate event metrics (if Eventbrite/OpenDate data available)
    const events = (eventbriteData.events.length > 0 || opendateData.events.length > 0)
      ? this.calculateEventMetrics([...eventbriteData.events, ...opendateData.events])
      : undefined;

    // Store KPIs in database
    await this.storeDailyKPIs(venueId, date, {
      date: startOfDay.toISOString(),
      revenue,
      transactions,
      customers,
      inventory,
      events,
    });

    return {
      date: startOfDay.toISOString(),
      revenue,
      transactions,
      customers,
      inventory,
      events,
    };
  }

  /**
   * Calculate weekly KPIs for a venue
   */
  async calculateWeeklyKPIs(
    venueId: string, 
    weekStart: Date, 
    weekEnd: Date
  ): Promise<WeeklyKPIs> {
    // Fetch daily KPIs for the week
    const { data: dailyKPIs, error } = await this.supabase
      .from('daily_kpis')
      .select('*')
      .eq('venue_id', venueId)
      .gte('date', weekStart.toISOString())
      .lte('date', weekEnd.toISOString())
      .order('date');

    if (error || !dailyKPIs) {
      throw new Error('Failed to fetch daily KPIs for weekly calculation');
    }

    // Aggregate weekly metrics
    const weeklyMetrics = this.aggregateWeeklyMetrics(dailyKPIs);

    // Calculate growth rates (compare to previous week)
    const previousWeekStart = new Date(weekStart);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);
    const previousWeekEnd = new Date(weekEnd);
    previousWeekEnd.setDate(previousWeekEnd.getDate() - 7);

    const growthRates = await this.calculateGrowthRates(
      venueId,
      previousWeekStart,
      previousWeekEnd,
      weeklyMetrics
    );

    return {
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      ...weeklyMetrics,
      growthRates,
    };
  }

  /**
   * Calculate monthly KPIs for a venue
   */
  async calculateMonthlyKPIs(
    venueId: string,
    monthStart: Date,
    monthEnd: Date
  ): Promise<MonthlyKPIs> {
    // Fetch weekly KPIs for the month
    const { data: weeklyKPIs, error } = await this.supabase
      .from('weekly_kpis')
      .select('*')
      .eq('venue_id', venueId)
      .gte('week_start', monthStart.toISOString())
      .lte('week_end', monthEnd.toISOString())
      .order('week_start');

    if (error || !weeklyKPIs) {
      throw new Error('Failed to fetch weekly KPIs for monthly calculation');
    }

    // Aggregate monthly metrics
    const monthlyMetrics = this.aggregateMonthlyMetrics(weeklyKPIs);

    // Calculate year-over-year comparison
    const lastYearStart = new Date(monthStart);
    lastYearStart.setFullYear(lastYearStart.getFullYear() - 1);
    const lastYearEnd = new Date(monthEnd);
    lastYearEnd.setFullYear(lastYearEnd.getFullYear() - 1);

    const yearOverYear = await this.calculateYearOverYear(
      venueId,
      lastYearStart,
      lastYearEnd,
      monthlyMetrics
    );

    // Calculate growth rates
    const previousMonthStart = new Date(monthStart);
    previousMonthStart.setMonth(previousMonthStart.getMonth() - 1);
    const previousMonthEnd = new Date(monthEnd);
    previousMonthEnd.setMonth(previousMonthEnd.getMonth() - 1);
    
    const growthRates = await this.calculateGrowthRates(
      venueId,
      previousMonthStart,
      previousMonthEnd,
      monthlyMetrics
    );

    // Convert weekly KPIs to weeklyComparison format
    const weeklyComparison = weeklyKPIs.map((week: any, index: number) => ({
      weekNumber: index + 1,
      revenue: week.metrics?.revenue?.total || 0,
      transactions: week.metrics?.transactions?.count || 0,
      customers: week.metrics?.customers?.unique || 0,
    }));

    return {
      month: (monthStart.getMonth() + 1).toString(),
      year: monthStart.getFullYear(),
      ...monthlyMetrics,
      yearOverYear,
      growthRates,
      weeklyComparison,
    };
  }

  /**
   * Calculate real-time metrics
   */
  async calculateRealtimeMetrics(venueId: string): Promise<RealtimeMetrics> {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Fetch today's transactions
    const [toastToday, eventbriteToday, opendateToday] = await Promise.all([
      this.fetchToastTransactions(venueId, todayStart, now),
      this.fetchEventbriteTransactions(venueId, todayStart, now),
      this.fetchOpenDateTransactions(venueId, todayStart, now),
    ]);

    // Fetch last hour's transactions
    const [toastHour, eventbriteHour, opendateHour] = await Promise.all([
      this.fetchToastTransactions(venueId, oneHourAgo, now),
      this.fetchEventbriteTransactions(venueId, oneHourAgo, now),
      this.fetchOpenDateTransactions(venueId, oneHourAgo, now),
    ]);

    // Calculate metrics
    const todayRevenue = toastToday.revenue + eventbriteToday.revenue + opendateToday.revenue;
    const todayTransactions = toastToday.transactions.length + 
                             eventbriteToday.transactions.length + 
                             opendateToday.transactions.length;
    
    const todayCustomers = new Set([
      ...toastToday.transactions.map(t => t.customer_email || t.customer_name || t.customer_id),
      ...eventbriteToday.transactions.map(t => t.customer_email || t.customer_id),
      ...opendateToday.transactions.map(t => t.customer_email || t.customer_id),
    ].filter(Boolean)).size;

    const lastHourRevenue = toastHour.revenue + eventbriteHour.revenue + opendateHour.revenue;
    const lastHourTransactions = toastHour.transactions.length + 
                                eventbriteHour.transactions.length + 
                                opendateHour.transactions.length;

    // Get active and upcoming events
    const upcomingEvents = await this.getUpcomingEvents(venueId);

    return {
      timestamp: now.toISOString(),
      todayRevenue,
      todayTransactions,
      todayCustomers,
      lastHourRevenue,
      lastHourTransactions,
      activeEvents: upcomingEvents.filter(e => 
        new Date(e.startTime) <= now && new Date(e.endTime || e.startTime) >= now
      ).length,
      upcomingEvents: upcomingEvents
        .filter(e => new Date(e.startTime) > now)
        .slice(0, 5)
        .map(e => ({
          name: e.name,
          startTime: e.startTime,
          soldTickets: e.soldTickets,
          capacity: e.capacity,
        })),
    };
  }

  // Helper methods

  private async fetchToastTransactions(_venueId: string, start: Date, end: Date) {
    // First try simple_transactions table
    const { data: simpleData, error: simpleError } = await this.supabase
      .from('simple_transactions')
      .select('*')
      .eq('source', 'toast')
      .gte('transaction_date', start.toISOString())
      .lte('transaction_date', end.toISOString());

    if (!simpleError && simpleData && simpleData.length > 0) {
      // Use simple transactions (amount already in dollars)
      const revenue = simpleData.reduce((sum, tx) => sum + (tx.amount || 0), 0);
      return { 
        transactions: simpleData, 
        revenue,
        inventory: null
      };
    }

    // Fallback to original toast_transactions table
    const { data, error } = await this.supabase
      .from('toast_transactions')
      .select('*')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    if (error) {
      console.error('Error fetching Toast transactions:', error);
      return { transactions: [], revenue: 0, inventory: null };
    }

    // Amounts are already in dollars
    const revenue = data?.reduce((sum, tx) => sum + (tx.total_amount || 0), 0) || 0;
    
    return { 
      transactions: data || [], 
      revenue,
      inventory: null, // TODO: Implement inventory tracking
    };
  }

  private async fetchEventbriteTransactions(_venueId: string, start: Date, end: Date) {
    const { data, error } = await this.supabase
      .from('eventbrite_transactions')
      .select('*')
      .gte('transaction_date', start.toISOString())
      .lte('transaction_date', end.toISOString());

    if (error) {
      console.error('Error fetching Eventbrite transactions:', error);
      return { transactions: [], revenue: 0, events: [] };
    }

    const revenue = data?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;
    
    // Group by event
    const events = this.groupEventbriteByEvent(data || []);

    return { 
      transactions: data || [], 
      revenue,
      events,
    };
  }

  private async fetchOpenDateTransactions(_venueId: string, start: Date, end: Date) {
    const { data, error } = await this.supabase
      .from('opendate_transactions')
      .select('*')
      .gte('transaction_date', start.toISOString())
      .lte('transaction_date', end.toISOString());

    if (error) {
      console.error('Error fetching OpenDate transactions:', error);
      return { transactions: [], revenue: 0, events: [] };
    }

    const revenue = data?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;
    
    // Group by show/event
    const events = this.groupOpenDateByEvent(data || []);

    return { 
      transactions: data || [], 
      revenue,
      events,
    };
  }

  private calculateRevenueMetrics(
    allTransactions: any[],
    posRevenue: number,
    eventsRevenue: number,
    ticketsRevenue: number
  ) {
    // Calculate hourly breakdown
    const byHour = Array.from({ length: 24 }, (_, hour) => {
      const hourTransactions = allTransactions.filter(tx => {
        const txHour = new Date(tx.transaction_date).getHours();
        return txHour === hour;
      });
      const amount = hourTransactions.reduce((sum, tx) => 
        sum + (tx.total_amount || tx.amount || 0), 0
      );
      return { hour, amount };
    });

    // Calculate by category
    const categoryMap = new Map<string, number>();
    allTransactions.forEach(tx => {
      const category = tx.category || tx.transaction_type || 'Other';
      const amount = tx.total_amount || tx.amount || 0;
      categoryMap.set(category, (categoryMap.get(category) || 0) + amount);
    });

    const byCategory = Array.from(categoryMap.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    return {
      total: posRevenue + eventsRevenue + ticketsRevenue,
      pos: posRevenue,
      events: eventsRevenue,
      tickets: ticketsRevenue,
      byHour,
      byCategory,
    };
  }

  private calculateTransactionMetrics(allTransactions: any[]) {
    const total = allTransactions.length;
    const totalAmount = allTransactions.reduce((sum, tx) => 
      sum + (tx.total_amount || tx.amount || 0), 0
    );
    const average = total > 0 ? totalAmount / total : 0;

    // Group by source
    const sourceMap = new Map<string, number>();
    allTransactions.forEach(tx => {
      const source = tx.source || 'unknown';
      sourceMap.set(source, (sourceMap.get(source) || 0) + 1);
    });

    const bySource = Array.from(sourceMap.entries())
      .map(([source, count]) => ({ source, count }));

    // Group by payment method
    const methodMap = new Map<string, number>();
    allTransactions.forEach(tx => {
      const method = tx.payment_method || tx.payment_type || 'unknown';
      methodMap.set(method, (methodMap.get(method) || 0) + 1);
    });

    const byPaymentMethod = Array.from(methodMap.entries())
      .map(([method, count]) => ({ method, count }));

    return {
      total,
      average,
      bySource,
      byPaymentMethod,
    };
  }

  private async calculateCustomerMetrics(
    venueId: string,
    allTransactions: any[],
    startDate: Date,
    _endDate: Date
  ) {
    // Get unique customers
    const customerSet = new Set<string>();
    const customerSpendMap = new Map<string, { totalSpent: number; transactionCount: number; name?: string }>();

    allTransactions.forEach(tx => {
      const customerId = tx.customer_id || tx.customer_email;
      if (customerId) {
        customerSet.add(customerId);
        
        const existing = customerSpendMap.get(customerId) || { totalSpent: 0, transactionCount: 0 };
        customerSpendMap.set(customerId, {
          totalSpent: existing.totalSpent + (tx.total_amount || tx.amount || 0),
          transactionCount: existing.transactionCount + 1,
          name: tx.customer_name || tx.customer_first_name || existing.name,
        });
      }
    });

    const unique = customerSet.size;

    // Identify new vs returning customers
    const { data: previousCustomers } = await this.supabase
      .from('customer_metrics')
      .select('customer_id')
      .eq('venue_id', venueId)
      .lt('first_seen', startDate.toISOString());

    const previousCustomerSet = new Set(previousCustomers?.map(c => c.customer_id) || []);
    const newCustomers = Array.from(customerSet).filter(c => !previousCustomerSet.has(c)).length;
    const returningCustomers = unique - newCustomers;

    // Get top customers
    const topCustomers = Array.from(customerSpendMap.entries())
      .map(([customerId, data]) => ({
        customerId,
        ...data,
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    return {
      unique,
      new: newCustomers,
      returning: returningCustomers,
      topCustomers,
    };
  }

  private calculateInventoryMetrics(_inventory: any) {
    // TODO: Implement based on actual inventory data structure
    return undefined;
  }

  private calculateEventMetrics(events: any[]) {
    const total = events.length;
    const totalAttendees = events.reduce((sum, e) => sum + (e.attendees || 0), 0);
    const totalCapacity = events.reduce((sum, e) => sum + (e.capacity || 0), 0);
    const utilizationRate = totalCapacity > 0 ? (totalAttendees / totalCapacity) * 100 : 0;

    const topEvents = events
      .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
      .slice(0, 5)
      .map(e => ({
        name: e.name,
        attendees: e.attendees || 0,
        revenue: e.revenue || 0,
        date: e.date,
      }));

    return {
      total,
      attendees: totalAttendees,
      capacity: totalCapacity,
      utilizationRate,
      topEvents,
    };
  }

  private groupEventbriteByEvent(transactions: any[]) {
    const eventMap = new Map<string, any>();

    transactions.forEach(tx => {
      const eventId = tx.event_id;
      if (eventId) {
        const existing = eventMap.get(eventId) || {
          name: tx.event_name,
          attendees: 0,
          revenue: 0,
          date: tx.transaction_date,
        };
        
        eventMap.set(eventId, {
          ...existing,
          attendees: existing.attendees + 1,
          revenue: existing.revenue + (tx.amount || 0),
        });
      }
    });

    return Array.from(eventMap.values());
  }

  private groupOpenDateByEvent(transactions: any[]) {
    const eventMap = new Map<string, any>();

    transactions.forEach(tx => {
      const eventId = tx.confirm_id || tx.show_id;
      if (eventId) {
        const existing = eventMap.get(eventId) || {
          name: tx.event_name || tx.artist_name,
          attendees: 0,
          revenue: 0,
          date: tx.transaction_date,
        };
        
        eventMap.set(eventId, {
          ...existing,
          attendees: existing.attendees + (tx.ticket_count || 1),
          revenue: existing.revenue + (tx.amount || 0),
        });
      }
    });

    return Array.from(eventMap.values());
  }

  private async storeDailyKPIs(venueId: string, date: Date, kpis: DailyKPIs) {
    const { error } = await this.supabase
      .from('daily_kpis')
      .upsert({
        venue_id: venueId,
        date: date.toISOString(),
        revenue_total: kpis.revenue.total,
        revenue_pos: kpis.revenue.pos,
        revenue_events: kpis.revenue.events,
        revenue_tickets: kpis.revenue.tickets,
        transaction_count: kpis.transactions.total,
        transaction_average: kpis.transactions.average,
        unique_customers: kpis.customers.unique,
        new_customers: kpis.customers.new,
        returning_customers: kpis.customers.returning,
        event_count: kpis.events?.total,
        event_attendees: kpis.events?.attendees,
        event_utilization: kpis.events?.utilizationRate,
        metadata: kpis,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error storing daily KPIs:', error);
      throw error;
    }
  }

  private aggregateWeeklyMetrics(dailyKPIs: any[]) {
    // Aggregate all daily metrics into weekly totals
    const revenue = {
      total: dailyKPIs.reduce((sum, day) => sum + day.revenue_total, 0),
      pos: dailyKPIs.reduce((sum, day) => sum + day.revenue_pos, 0),
      events: dailyKPIs.reduce((sum, day) => sum + day.revenue_events, 0),
      tickets: dailyKPIs.reduce((sum, day) => sum + day.revenue_tickets, 0),
      byHour: this.aggregateHourlyData(dailyKPIs),
      byCategory: this.aggregateCategoryData(dailyKPIs),
    };

    const transactions = {
      total: dailyKPIs.reduce((sum, day) => sum + day.transaction_count, 0),
      average: revenue.total / dailyKPIs.reduce((sum, day) => sum + day.transaction_count, 0),
      bySource: this.aggregateSourceData(dailyKPIs),
      byPaymentMethod: this.aggregatePaymentMethodData(dailyKPIs),
    };

    const customers = {
      unique: dailyKPIs.reduce((sum, day) => sum + day.unique_customers, 0),
      new: dailyKPIs.reduce((sum, day) => sum + day.new_customers, 0),
      returning: dailyKPIs.reduce((sum, day) => sum + day.returning_customers, 0),
      topCustomers: this.aggregateTopCustomers(dailyKPIs),
    };

    const dailyComparison = dailyKPIs.map(day => ({
      date: day.date,
      revenue: day.revenue_total,
      transactions: day.transaction_count,
      customers: day.unique_customers,
    }));

    return { revenue, transactions, customers, dailyComparison };
  }

  private aggregateMonthlyMetrics(weeklyKPIs: any[]) {
    const metrics = {
      totalRevenue: 0,
      totalTransactions: 0,
      uniqueCustomers: new Set<string>(),
      avgRevenuePerWeek: 0,
      weeklyTrends: [] as any[],
      topSellingItems: new Map<string, { name: string; quantity: number; revenue: number }>(),
    };

    weeklyKPIs.forEach(week => {
      metrics.totalRevenue += week.metrics?.revenue?.total || 0;
      metrics.totalTransactions += week.metrics?.transactions?.count || 0;
      
      // Aggregate unique customers
      if (week.metadata?.revenue?.uniqueCustomers) {
        week.metadata.revenue.uniqueCustomers.forEach((id: string) => 
          metrics.uniqueCustomers.add(id)
        );
      }

      // Weekly trends
      metrics.weeklyTrends.push({
        week: week.period_date,
        revenue: week.metrics?.revenue?.total || 0,
        transactions: week.metrics?.transactions?.count || 0,
      });

      // Aggregate top selling items
      if (week.metadata?.revenue?.topItems) {
        week.metadata.revenue.topItems.forEach((item: any) => {
          const existing = metrics.topSellingItems.get(item.id) || 
            { name: item.name, quantity: 0, revenue: 0 };
          existing.quantity += item.quantity;
          existing.revenue += item.revenue;
          metrics.topSellingItems.set(item.id, existing);
        });
      }
    });

    metrics.avgRevenuePerWeek = metrics.totalRevenue / Math.max(weeklyKPIs.length, 1);

    // Calculate aggregated metrics for the month
    const totalPOS = weeklyKPIs.reduce((sum, week) => sum + (week.metrics?.revenue?.pos || 0), 0);
    const totalEvents = weeklyKPIs.reduce((sum, week) => sum + (week.metrics?.revenue?.events || 0), 0);
    const totalTickets = weeklyKPIs.reduce((sum, week) => sum + (week.metrics?.revenue?.tickets || 0), 0);

    return {
      revenue: {
        total: metrics.totalRevenue,
        pos: totalPOS,
        events: totalEvents,
        tickets: totalTickets,
        byHour: [], // Aggregated hourly data not available at monthly level
        byCategory: [], // Aggregated category data would need to be calculated
      },
      transactions: {
        total: metrics.totalTransactions,
        average: metrics.totalRevenue / Math.max(metrics.totalTransactions, 1),
        bySource: [],
        byPaymentMethod: [],
      },
      customers: {
        unique: metrics.uniqueCustomers.size,
        new: 0, // Would need to be calculated from weekly data
        returning: 0, // Would need to be calculated from weekly data
        topCustomers: [],
      },
      inventory: {
        topItems: Array.from(metrics.topSellingItems.entries())
          .map(([_id, data]) => ({ 
            name: data.name, 
            quantity: data.quantity, 
            revenue: data.revenue,
          }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10),
        lowStock: [],
      },
      events: {
        total: 0,
        attendees: 0,
        capacity: 0,
        utilizationRate: 0,
        topEvents: [],
      },
    };
  }

  private async calculateGrowthRates(
    venueId: string,
    previousStart: Date,
    previousEnd: Date,
    currentMetrics: any
  ) {
    // Fetch previous period metrics
    const { data: previousKPIs, error } = await this.supabase
      .from('kpis')
      .select('*')
      .eq('venue_id', venueId)
      .gte('period_date', previousStart.toISOString())
      .lte('period_date', previousEnd.toISOString())
      .eq('period_type', 'daily');

    if (error || !previousKPIs || previousKPIs.length === 0) {
      return {
        revenue: 0,
        transactions: 0,
        customers: 0,
        averageTransaction: 0,
      };
    }

    // Aggregate previous period metrics
    const previousMetrics = {
      totalRevenue: 0,
      totalTransactions: 0,
      uniqueCustomers: new Set<string>(),
      avgTransaction: 0,
    };

    previousKPIs.forEach(kpi => {
      previousMetrics.totalRevenue += kpi.metrics?.revenue?.total || 0;
      previousMetrics.totalTransactions += kpi.metrics?.transactions?.count || 0;
      
      if (kpi.metadata?.revenue?.uniqueCustomers) {
        kpi.metadata.revenue.uniqueCustomers.forEach((id: string) => 
          previousMetrics.uniqueCustomers.add(id)
        );
      }
    });

    previousMetrics.avgTransaction = previousMetrics.totalTransactions > 0
      ? previousMetrics.totalRevenue / previousMetrics.totalTransactions
      : 0;

    // Calculate growth rates
    const calculateGrowth = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      revenue: calculateGrowth(
        currentMetrics.revenue?.total || 0,
        previousMetrics.totalRevenue
      ),
      transactions: calculateGrowth(
        currentMetrics.transactions?.count || 0,
        previousMetrics.totalTransactions
      ),
      customers: calculateGrowth(
        currentMetrics.customers?.unique || 0,
        previousMetrics.uniqueCustomers.size
      ),
      averageTransaction: calculateGrowth(
        currentMetrics.transactions?.avgAmount || 0,
        previousMetrics.avgTransaction
      ),
    };
  }

  private async calculateYearOverYear(
    venueId: string,
    lastYearStart: Date,
    lastYearEnd: Date,
    currentMetrics: any
  ) {
    // Fetch last year's metrics for the same period
    const { data: lastYearKPIs, error } = await this.supabase
      .from('kpis')
      .select('*')
      .eq('venue_id', venueId)
      .gte('period_date', lastYearStart.toISOString())
      .lte('period_date', lastYearEnd.toISOString())
      .eq('period_type', 'daily');

    if (error || !lastYearKPIs || lastYearKPIs.length === 0) {
      return {
        revenue: 0,
        transactions: 0,
        customers: 0,
      };
    }

    // Aggregate last year's metrics
    const lastYearMetrics = {
      totalRevenue: 0,
      totalTransactions: 0,
      uniqueCustomers: new Set<string>(),
      avgTransaction: 0,
    };

    lastYearKPIs.forEach(kpi => {
      lastYearMetrics.totalRevenue += kpi.metrics?.revenue?.total || 0;
      lastYearMetrics.totalTransactions += kpi.metrics?.transactions?.count || 0;
      
      if (kpi.metadata?.revenue?.uniqueCustomers) {
        kpi.metadata.revenue.uniqueCustomers.forEach((id: string) => 
          lastYearMetrics.uniqueCustomers.add(id)
        );
      }
    });

    lastYearMetrics.avgTransaction = lastYearMetrics.totalTransactions > 0
      ? lastYearMetrics.totalRevenue / lastYearMetrics.totalTransactions
      : 0;

    // Calculate YoY growth
    const calculateYoYGrowth = (current: number, lastYear: number) => {
      if (lastYear === 0) return current > 0 ? 100 : 0;
      return ((current - lastYear) / lastYear) * 100;
    };

    const currentRevenue = currentMetrics.revenue?.total || 0;
    const currentTransactions = currentMetrics.transactions?.count || 0;
    const currentCustomers = currentMetrics.customers?.unique || 0;
    // const currentAvgTransaction = currentMetrics.transactions?.avgAmount || 0;

    return {
      revenue: calculateYoYGrowth(currentRevenue, lastYearMetrics.totalRevenue),
      transactions: calculateYoYGrowth(currentTransactions, lastYearMetrics.totalTransactions),
      customers: calculateYoYGrowth(currentCustomers, lastYearMetrics.uniqueCustomers.size),
    };
  }

  private async getUpcomingEvents(venueId: string) {
    const upcomingEvents: any[] = [];
    const now = new Date();
    const twoMonthsFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    // Fetch Eventbrite events
    const { data: eventbriteSnapshots } = await this.supabase
      .from('eventbrite_snapshots')
      .select('data')
      .eq('venue_id', venueId)
      .order('fetched_at', { ascending: false })
      .limit(1);

    if (eventbriteSnapshots && eventbriteSnapshots[0]?.data) {
      const events = eventbriteSnapshots[0].data.events || [];
      events.forEach((event: any) => {
        const eventDate = new Date(event.start.local);
        if (eventDate > now && eventDate <= twoMonthsFromNow) {
          upcomingEvents.push({
            eventId: event.id,
            name: event.name.text,
            startDate: event.start.local,
            endDate: event.end.local,
            source: 'eventbrite',
            capacity: event.capacity || 0,
            ticketsSold: event.inventory?.sold || 0,
            ticketsAvailable: event.inventory?.available || 0,
            revenue: event.stats?.gross || 0,
            url: event.url,
            status: event.status,
          });
        }
      });
    }

    // Fetch OpenDate events
    const { data: opendateSnapshots } = await this.supabase
      .from('opendate_snapshots')
      .select('data')
      .eq('venue_id', venueId)
      .order('fetched_at', { ascending: false })
      .limit(1);

    if (opendateSnapshots && opendateSnapshots[0]?.data) {
      const shows = opendateSnapshots[0].data.shows || [];
      shows.forEach((show: any) => {
        const showDate = new Date(show.date);
        if (showDate > now && showDate <= twoMonthsFromNow) {
          upcomingEvents.push({
            eventId: show.id,
            name: show.name || `${show.artist.name} at ${show.venue.name}`,
            startDate: show.date,
            endDate: show.endDate || show.date,
            source: 'opendate',
            capacity: show.capacity || show.venue.capacity || 0,
            ticketsSold: show.ticketsSold || 0,
            ticketsAvailable: show.ticketsAvailable || 0,
            revenue: show.revenue || 0,
            artist: show.artist.name,
            status: show.status,
          });
        }
      });
    }

    // Sort by date
    upcomingEvents.sort((a, b) => 
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );

    return upcomingEvents;
  }

  // Helper aggregation methods
  private aggregateHourlyData(dailyKPIs: any[]) {
    const hourlyMap = new Map<number, number>();
    
    dailyKPIs.forEach(day => {
      if (day.metadata?.revenue?.byHour) {
        day.metadata.revenue.byHour.forEach((hourData: any) => {
          hourlyMap.set(hourData.hour, (hourlyMap.get(hourData.hour) || 0) + hourData.amount);
        });
      }
    });

    return Array.from(hourlyMap.entries())
      .map(([hour, amount]) => ({ hour, amount }))
      .sort((a, b) => a.hour - b.hour);
  }

  private aggregateCategoryData(dailyKPIs: any[]) {
    const categoryMap = new Map<string, number>();
    
    dailyKPIs.forEach(day => {
      if (day.metadata?.revenue?.byCategory) {
        day.metadata.revenue.byCategory.forEach((catData: any) => {
          categoryMap.set(catData.category, (categoryMap.get(catData.category) || 0) + catData.amount);
        });
      }
    });

    return Array.from(categoryMap.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }

  private aggregateSourceData(dailyKPIs: any[]) {
    const sourceMap = new Map<string, number>();
    
    dailyKPIs.forEach(day => {
      if (day.metadata?.transactions?.bySource) {
        day.metadata.transactions.bySource.forEach((sourceData: any) => {
          sourceMap.set(sourceData.source, (sourceMap.get(sourceData.source) || 0) + sourceData.count);
        });
      }
    });

    return Array.from(sourceMap.entries())
      .map(([source, count]) => ({ source, count }));
  }

  private aggregatePaymentMethodData(dailyKPIs: any[]) {
    const methodMap = new Map<string, number>();
    
    dailyKPIs.forEach(day => {
      if (day.metadata?.transactions?.byPaymentMethod) {
        day.metadata.transactions.byPaymentMethod.forEach((methodData: any) => {
          methodMap.set(methodData.method, (methodMap.get(methodData.method) || 0) + methodData.count);
        });
      }
    });

    return Array.from(methodMap.entries())
      .map(([method, count]) => ({ method, count }));
  }

  private aggregateTopCustomers(dailyKPIs: any[]) {
    const customerMap = new Map<string, any>();
    
    dailyKPIs.forEach(day => {
      if (day.metadata?.customers?.topCustomers) {
        day.metadata.customers.topCustomers.forEach((customer: any) => {
          const existing = customerMap.get(customer.customerId) || {
            totalSpent: 0,
            transactionCount: 0,
            name: customer.name,
          };
          
          customerMap.set(customer.customerId, {
            customerId: customer.customerId,
            name: customer.name || existing.name,
            totalSpent: existing.totalSpent + customer.totalSpent,
            transactionCount: existing.transactionCount + customer.transactionCount,
          });
        });
      }
    });

    return Array.from(customerMap.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);
  }
}