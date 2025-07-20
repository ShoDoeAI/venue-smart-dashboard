import { z } from 'zod';
import { supabase } from '../lib/supabase';

export const ErrorSeverity = z.enum(['critical', 'high', 'medium', 'low']);
export const ErrorSource = z.enum([
  'toast',
  'eventbrite',
  'wisk',
  'resy',
  'audience_republic',
  'meta',
  'opendate',
  'internal'
]);

export const IsolatedErrorSchema = z.object({
  id: z.string().optional(),
  source: ErrorSource,
  severity: ErrorSeverity,
  error_type: z.string(),
  message: z.string(),
  context: z.record(z.any()).optional(),
  stack_trace: z.string().optional(),
  occurred_at: z.string(),
  resolved: z.boolean().default(false),
  resolution_notes: z.string().optional(),
  retry_count: z.number().default(0),
  max_retries: z.number().default(3),
  last_retry_at: z.string().optional(),
  venue_id: z.string().optional()
});

export type IsolatedError = z.infer<typeof IsolatedErrorSchema>;

interface ErrorBoundaryConfig {
  source: z.infer<typeof ErrorSource>;
  fallbackData?: any;
  maxRetries?: number;
  retryDelay?: number;
  alertOnFailure?: boolean;
}

export class ErrorIsolationService {
  private errorBoundaries: Map<string, ErrorBoundaryConfig> = new Map();
  private errorCounts: Map<string, number> = new Map();
  private lastErrors: Map<string, Date> = new Map();

  constructor() {
    this.initializeErrorBoundaries();
  }

  private initializeErrorBoundaries() {
    // Configure error boundaries for each API
    const apiConfigs: ErrorBoundaryConfig[] = [
      {
        source: 'toast',
        fallbackData: { transactions: [], items: [] },
        maxRetries: 3,
        retryDelay: 1000,
        alertOnFailure: true
      },
      {
        source: 'eventbrite',
        fallbackData: { events: [], attendees: [] },
        maxRetries: 3,
        retryDelay: 1000,
        alertOnFailure: true
      },
      {
        source: 'opendate',
        fallbackData: { shows: [], tickets: [] },
        maxRetries: 3,
        retryDelay: 1000,
        alertOnFailure: true
      },
      {
        source: 'wisk',
        fallbackData: { inventory: [], variances: [] },
        maxRetries: 2,
        retryDelay: 2000,
        alertOnFailure: false
      },
      {
        source: 'resy',
        fallbackData: { reservations: [], covers: 0 },
        maxRetries: 2,
        retryDelay: 1500,
        alertOnFailure: false
      },
      {
        source: 'audience_republic',
        fallbackData: { campaigns: [], subscribers: [] },
        maxRetries: 2,
        retryDelay: 1500,
        alertOnFailure: false
      },
      {
        source: 'meta',
        fallbackData: { insights: {}, posts: [] },
        maxRetries: 2,
        retryDelay: 2000,
        alertOnFailure: false
      }
    ];

    apiConfigs.forEach(config => {
      this.errorBoundaries.set(config.source, config);
    });
  }

  async isolateError(
    source: z.infer<typeof ErrorSource>,
    error: Error | unknown,
    context?: Record<string, any>
  ): Promise<{ fallbackData: any; errorId: string }> {
    const config = this.errorBoundaries.get(source);
    if (!config) {
      throw new Error(`No error boundary configured for source: ${source}`);
    }

    // Create error record
    const errorRecord: IsolatedError = {
      source,
      severity: this.determineSeverity(source, error),
      error_type: error instanceof Error ? error.constructor.name : 'UnknownError',
      message: error instanceof Error ? error.message : String(error),
      context,
      stack_trace: error instanceof Error ? error.stack : undefined,
      occurred_at: new Date().toISOString(),
      resolved: false,
      retry_count: 0,
      max_retries: config.maxRetries || 3,
      venue_id: context?.venueId
    };

    // Track error count
    const errorKey = `${source}_${errorRecord.error_type}`;
    const currentCount = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, currentCount + 1);
    this.lastErrors.set(errorKey, new Date());

    // Store error in database
    const { data, error: dbError } = await supabase
      .from('api_errors')
      .insert(errorRecord)
      .select()
      .single();

    if (dbError) {
      console.error('Failed to store error:', dbError);
    }

    const errorId = data?.id || 'unknown';

    // Generate alert if configured
    if (config.alertOnFailure) {
      await this.generateErrorAlert(source, errorRecord);
    }

    return {
      fallbackData: config.fallbackData || {},
      errorId
    };
  }

  private determineSeverity(
    source: z.infer<typeof ErrorSource>,
    error: Error | unknown
  ): z.infer<typeof ErrorSeverity> {
    // Critical APIs that directly impact revenue
    const criticalAPIs = ['toast', 'eventbrite', 'opendate'];
    
    if (criticalAPIs.includes(source)) {
      // Check if it's a complete failure
      if (error instanceof Error) {
        if (error.message.includes('ECONNREFUSED') || 
            error.message.includes('ETIMEDOUT') ||
            error.message.includes('500')) {
          return 'critical';
        }
      }
      return 'high';
    }

    // Secondary APIs
    return 'medium';
  }

  private async generateErrorAlert(
    source: z.infer<typeof ErrorSource>,
    error: IsolatedError
  ): Promise<void> {
    try {
      await supabase.from('alerts').insert({
        type: 'system_error',
        severity: error.severity,
        title: `${source.toUpperCase()} API Error`,
        message: `Failed to fetch data from ${source}: ${error.message}`,
        source: 'error_isolation',
        context: {
          errorId: error.id,
          errorType: error.error_type,
          source: error.source,
          retryCount: error.retry_count
        },
        created_at: new Date().toISOString()
      });
    } catch (alertError) {
      console.error('Failed to generate error alert:', alertError);
    }
  }

  async retryFailedOperation<T>(
    source: z.infer<typeof ErrorSource>,
    errorId: string,
    operation: () => Promise<T>
  ): Promise<T | null> {
    // Get error record
    const { data: errorRecord, error: fetchError } = await supabase
      .from('api_errors')
      .select('*')
      .eq('id', errorId)
      .single();

    if (fetchError || !errorRecord) {
      console.error('Failed to fetch error record:', fetchError);
      return null;
    }

    const config = this.errorBoundaries.get(source);
    if (!config || errorRecord.retry_count >= (config.maxRetries || 3)) {
      return null;
    }

    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, config.retryDelay || 1000));

    try {
      const result = await operation();
      
      // Mark error as resolved
      await supabase
        .from('api_errors')
        .update({
          resolved: true,
          resolution_notes: 'Retry successful'
        })
        .eq('id', errorId);

      return result;
    } catch (retryError) {
      // Update retry count
      await supabase
        .from('api_errors')
        .update({
          retry_count: errorRecord.retry_count + 1,
          last_retry_at: new Date().toISOString()
        })
        .eq('id', errorId);

      return null;
    }
  }

  async getRecentErrors(
    source?: z.infer<typeof ErrorSource>,
    limit: number = 50
  ): Promise<IsolatedError[]> {
    let query = supabase
      .from('api_errors')
      .select('*')
      .order('occurred_at', { ascending: false })
      .limit(limit);

    if (source) {
      query = query.eq('source', source);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch recent errors:', error);
      return [];
    }

    return data.map(record => IsolatedErrorSchema.parse(record));
  }

  async getErrorStats(): Promise<{
    bySource: Record<string, number>;
    bySeverity: Record<string, number>;
    unresolvedCount: number;
    last24Hours: number;
  }> {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const { data: errors, error } = await supabase
      .from('api_errors')
      .select('source, severity, resolved, occurred_at')
      .gte('occurred_at', yesterday.toISOString());

    if (error || !errors) {
      console.error('Failed to fetch error stats:', error);
      return {
        bySource: {},
        bySeverity: {},
        unresolvedCount: 0,
        last24Hours: 0
      };
    }

    const stats = {
      bySource: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      unresolvedCount: 0,
      last24Hours: errors.length
    };

    errors.forEach(err => {
      // Count by source
      stats.bySource[err.source] = (stats.bySource[err.source] || 0) + 1;
      
      // Count by severity
      stats.bySeverity[err.severity] = (stats.bySeverity[err.severity] || 0) + 1;
      
      // Count unresolved
      if (!err.resolved) {
        stats.unresolvedCount++;
      }
    });

    return stats;
  }

  getErrorBoundaryConfig(source: z.infer<typeof ErrorSource>): ErrorBoundaryConfig | undefined {
    return this.errorBoundaries.get(source);
  }

  clearErrorCounts(): void {
    this.errorCounts.clear();
    this.lastErrors.clear();
  }
}