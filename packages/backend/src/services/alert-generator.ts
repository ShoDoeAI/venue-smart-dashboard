import { z } from 'zod';
import { supabase } from '../lib/supabase';

export const AlertSeverity = z.enum(['critical', 'high', 'medium', 'low']);
export const AlertType = z.enum([
  'low_ticket_sales',
  'high_variance',
  'stock_outage',
  'revenue_drop',
  'capacity_issue',
  'unusual_activity',
  'system_error'
]);

export const AlertSchema = z.object({
  id: z.string().optional(),
  type: AlertType,
  severity: AlertSeverity,
  title: z.string(),
  message: z.string(),
  value: z.number().optional(),
  threshold: z.number().optional(),
  context: z.record(z.any()).optional(),
  source: z.string(),
  created_at: z.string().optional(),
  resolved_at: z.string().optional().nullable(),
  group_id: z.string().optional(),
  action_suggestions: z.array(z.object({
    action: z.string(),
    description: z.string(),
    estimated_impact: z.string().optional()
  })).optional()
});

export type Alert = z.infer<typeof AlertSchema>;
export type AlertRule = {
  type: z.infer<typeof AlertType>;
  check: (metrics: KPICalculatorResult) => Alert | null;
  severity: z.infer<typeof AlertSeverity>;
  cooldown?: number; // minutes before re-alerting
};

export class AlertGenerator {
  private rules: AlertRule[] = [];
  private lastAlerts: Map<string, Date> = new Map();

  constructor() {
    this.initializeRules();
  }

  private initializeRules() {
    // Low ticket sales alert
    this.rules.push({
      type: 'low_ticket_sales',
      severity: 'high',
      cooldown: 120, // 2 hours
      check: (metrics) => {
        const events = metrics.eventMetrics?.upcomingEvents || [];
        for (const event of events) {
          const daysUntilEvent = Math.ceil(
            (new Date(event.startDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );
          
          if (daysUntilEvent <= 7 && daysUntilEvent > 0) {
            const soldPercentage = (event.ticketsSold / event.capacity) * 100;
            
            if (soldPercentage < 50) {
              return {
                type: 'low_ticket_sales',
                severity: 'high',
                title: `Low ticket sales for ${event.name}`,
                message: `Only ${soldPercentage.toFixed(1)}% of tickets sold with ${daysUntilEvent} days until event`,
                value: soldPercentage,
                threshold: 50,
                source: 'eventbrite',
                context: {
                  eventId: event.eventId,
                  eventName: event.name,
                  ticketsSold: event.ticketsSold,
                  capacity: event.capacity,
                  daysUntilEvent
                },
                action_suggestions: [
                  {
                    action: 'create_promo_code',
                    description: 'Create a 20% discount code for the next 48 hours',
                    estimated_impact: 'Could increase sales by 15-25%'
                  },
                  {
                    action: 'boost_social_media',
                    description: 'Boost event on social media platforms',
                    estimated_impact: 'Typically increases awareness by 30%'
                  }
                ]
              };
            }
          }
        }
        return null;
      }
    });

    // Revenue drop alert
    this.rules.push({
      type: 'revenue_drop',
      severity: 'critical',
      cooldown: 60,
      check: (metrics) => {
        const current = metrics.venueMetrics?.revenueMetrics.current || 0;
        const lastPeriod = metrics.venueMetrics?.revenueMetrics.lastPeriod || 0;
        
        if (lastPeriod > 0) {
          const dropPercentage = ((lastPeriod - current) / lastPeriod) * 100;
          
          if (dropPercentage > 20) {
            return {
              type: 'revenue_drop',
              severity: 'critical',
              title: 'Significant revenue drop detected',
              message: `Revenue down ${dropPercentage.toFixed(1)}% compared to last period`,
              value: current,
              threshold: lastPeriod * 0.8,
              source: 'analytics',
              context: {
                current,
                lastPeriod,
                dropPercentage,
                period: metrics.venueMetrics?.period
              },
              action_suggestions: [
                {
                    action: 'analyze_categories',
                    description: 'Review which revenue categories are underperforming',
                    estimated_impact: 'Identify specific problem areas'
                },
                {
                    action: 'flash_promotion',
                    description: 'Launch limited-time offers on top items',
                    estimated_impact: 'Can recover 5-10% of lost revenue'
                }
              ]
            };
          }
        }
        return null;
      }
    });

    // High variance alert
    this.rules.push({
      type: 'high_variance',
      severity: 'medium',
      cooldown: 240,
      check: (metrics) => {
        const hourlyRevenue = metrics.venueMetrics?.hourlyBreakdown || [];
        if (hourlyRevenue.length < 2) return null;

        const revenues = hourlyRevenue.map((h: any) => h.revenue);
        const mean = revenues.reduce((a: number, b: number) => a + b, 0) / revenues.length;
        const variance = revenues.reduce((acc: number, val: number) => acc + Math.pow(val - mean, 2), 0) / revenues.length;
        const stdDev = Math.sqrt(variance);
        const coefficientOfVariation = (stdDev / mean) * 100;

        if (coefficientOfVariation > 50) {
          return {
            type: 'high_variance',
            severity: 'medium',
            title: 'Unusual revenue fluctuation detected',
            message: `Revenue variance is ${coefficientOfVariation.toFixed(1)}% - indicating inconsistent performance`,
            value: coefficientOfVariation,
            threshold: 50,
            source: 'analytics',
            context: {
              mean,
              stdDev,
              coefficientOfVariation,
              hourlyData: hourlyRevenue
            },
            action_suggestions: [
              {
                action: 'review_staffing',
                description: 'Check if staffing levels match demand patterns',
                estimated_impact: 'Could smooth operations and increase efficiency'
              },
              {
                action: 'adjust_hours',
                description: 'Consider adjusting operating hours based on demand',
                estimated_impact: 'Reduce costs during low-traffic periods'
              }
            ]
          };
        }
        return null;
      }
    });

    // Capacity issue alert
    this.rules.push({
      type: 'capacity_issue',
      severity: 'medium',
      cooldown: 30,
      check: (metrics) => {
        const attendance = metrics.venueMetrics?.attendanceMetrics;
        if (!attendance) return null;

        const utilizationRate = (attendance.current / attendance.capacity) * 100;
        
        if (utilizationRate > 90) {
          return {
            type: 'capacity_issue',
            severity: 'medium',
            title: 'Venue approaching capacity',
            message: `Current utilization at ${utilizationRate.toFixed(1)}% - consider managing flow`,
            value: utilizationRate,
            threshold: 90,
            source: 'analytics',
            context: {
              current: attendance.current,
              capacity: attendance.capacity,
              utilizationRate
            },
            action_suggestions: [
              {
                action: 'implement_reservations',
                description: 'Require reservations for peak hours',
                estimated_impact: 'Better crowd control and customer experience'
              },
              {
                action: 'extend_hours',
                description: 'Consider extending operating hours',
                estimated_impact: 'Distribute traffic more evenly'
              }
            ]
          };
        }
        return null;
      }
    });
  }

  async generateAlerts(metrics: KPICalculatorResult): Promise<Alert[]> {
    const alerts: Alert[] = [];
    const now = new Date();

    for (const rule of this.rules) {
      const alertKey = `${rule.type}_${metrics.venueMetrics?.venueId || 'default'}`;
      const lastAlert = this.lastAlerts.get(alertKey);
      
      // Check cooldown
      if (lastAlert && rule.cooldown) {
        const minutesSinceLastAlert = (now.getTime() - lastAlert.getTime()) / (1000 * 60);
        if (minutesSinceLastAlert < rule.cooldown) {
          continue;
        }
      }

      const alert = rule.check(metrics);
      if (alert) {
        alerts.push(alert);
        this.lastAlerts.set(alertKey, now);
      }
    }

    // Group similar alerts
    const groupedAlerts = this.groupAlerts(alerts);
    
    // Store alerts in database
    if (groupedAlerts.length > 0) {
      await this.storeAlerts(groupedAlerts);
    }

    return groupedAlerts;
  }

  private groupAlerts(alerts: Alert[]): Alert[] {
    const grouped = new Map<string, Alert[]>();
    
    for (const alert of alerts) {
      const groupKey = `${alert.type}_${alert.severity}`;
      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, []);
      }
      grouped.get(groupKey)!.push(alert);
    }

    const result: Alert[] = [];
    for (const [groupKey, groupAlerts] of grouped) {
      if (groupAlerts.length === 1) {
        result.push(groupAlerts[0]);
      } else {
        // Merge alerts of the same type
        const merged: Alert = {
          ...groupAlerts[0],
          title: `Multiple ${groupAlerts[0].type.replace(/_/g, ' ')} alerts`,
          message: `${groupAlerts.length} similar issues detected`,
          group_id: groupKey,
          context: {
            alerts: groupAlerts.map(a => ({
              title: a.title,
              message: a.message,
              context: a.context
            }))
          }
        };
        result.push(merged);
      }
    }

    return result;
  }

  private async storeAlerts(alerts: Alert[]): Promise<void> {
    try {
      const alertRecords = alerts.map(alert => ({
        type: alert.type,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        value: alert.value,
        threshold: alert.threshold,
        context: alert.context,
        source: alert.source,
        group_id: alert.group_id,
        action_suggestions: alert.action_suggestions,
        created_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('alerts')
        .insert(alertRecords);

      if (error) {
        console.error('Error storing alerts:', error);
      }
    } catch (error) {
      console.error('Failed to store alerts:', error);
    }
  }

  async getActiveAlerts(): Promise<Alert[]> {
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .is('resolved_at', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      return data.map(record => AlertSchema.parse(record));
    } catch (error) {
      console.error('Error fetching active alerts:', error);
      return [];
    }
  }

  async resolveAlert(alertId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('alerts')
        .update({ resolved_at: new Date().toISOString() })
        .eq('id', alertId);

      if (error) throw error;
    } catch (error) {
      console.error('Error resolving alert:', error);
      throw error;
    }
  }

  getPriorityScore(alert: Alert): number {
    const severityScores = {
      critical: 100,
      high: 75,
      medium: 50,
      low: 25
    };

    let score = severityScores[alert.severity];
    
    // Boost score for revenue-impacting alerts
    if (alert.type === 'revenue_drop' || alert.type === 'low_ticket_sales') {
      score += 20;
    }

    // Boost score for alerts with action suggestions
    if (alert.action_suggestions && alert.action_suggestions.length > 0) {
      score += 10;
    }

    return score;
  }

  sortByPriority(alerts: Alert[]): Alert[] {
    return alerts.sort((a, b) => this.getPriorityScore(b) - this.getPriorityScore(a));
  }
}