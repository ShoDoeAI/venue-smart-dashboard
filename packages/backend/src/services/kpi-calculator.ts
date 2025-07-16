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

    return {
      month: monthStart.getMonth() + 1,
      year: monthStart.getFullYear(),
      ...monthlyMetrics,
      yearOverYear,
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
      ...toastToday.transactions.map(t => t.customer_id || t.customer_email),
      ...eventbriteToday.transactions.map(t => t.customer_id || t.customer_email),
      ...opendateToday.transactions.map(t => t.customer_id || t.customer_email),
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

  private async fetchToastTransactions(venueId: string, start: Date, end: Date) {
    const { data, error } = await this.supabase
      .from('toast_transactions')
      .select('*')
      .gte('transaction_date', start.toISOString())
      .lte('transaction_date', end.toISOString());

    if (error) {
      console.error('Error fetching Toast transactions:', error);
      return { transactions: [], revenue: 0, inventory: null };
    }

    const revenue = data?.reduce((sum, tx) => sum + (tx.total_amount || 0), 0) || 0;
    
    return { 
      transactions: data || [], 
      revenue,
      inventory: null, // TODO: Implement inventory tracking
    };
  }

  private async fetchEventbriteTransactions(venueId: string, start: Date, end: Date) {
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

  private async fetchOpenDateTransactions(venueId: string, start: Date, end: Date) {
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
    endDate: Date
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

  private calculateInventoryMetrics(inventory: any) {
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
    // Similar to aggregateWeeklyMetrics but for monthly data
    // Implementation would follow the same pattern
    return {} as any; // Placeholder
  }

  private async calculateGrowthRates(
    venueId: string,
    previousStart: Date,
    previousEnd: Date,
    currentMetrics: any
  ) {
    // Fetch previous period metrics and calculate growth rates
    // Implementation would compare current vs previous period
    return {
      revenue: 0,
      transactions: 0,
      customers: 0,
    };
  }

  private async calculateYearOverYear(
    venueId: string,
    lastYearStart: Date,
    lastYearEnd: Date,
    currentMetrics: any
  ) {
    // Fetch last year's metrics and calculate YoY growth
    // Implementation would compare current vs last year
    return {
      revenue: 0,
      transactions: 0,
      customers: 0,
    };
  }

  private async getUpcomingEvents(venueId: string) {
    // Fetch upcoming events from Eventbrite and OpenDate
    // Implementation would query both APIs for future events
    return [] as any[];
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