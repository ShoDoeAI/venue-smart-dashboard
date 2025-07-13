import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@venuesync/shared/types/database.generated';

export interface SnapshotMetrics {
  transactionCount: number;
  totalRevenue: number;
  averageTransaction: number;
  uniqueCustomers: number;
  topSellingItems?: Array<{ name: string; count: number; revenue: number }>;
  hourlyBreakdown?: Array<{ hour: number; transactions: number; revenue: number }>;
}

export interface CreateSnapshotOptions {
  venueId: string;
  source: 'manual' | 'scheduled' | 'webhook';
}

export interface UpdateSnapshotOptions {
  snapshotId: string;
  status: 'completed' | 'failed';
  errorMessage?: string;
  metrics?: Partial<SnapshotMetrics>;
  apiResults?: {
    toast?: boolean;
    eventbrite?: boolean;
    wisk?: boolean;
    resy?: boolean;
    audienceRepublic?: boolean;
    meta?: boolean;
    openTable?: boolean;
  };
}

export class SnapshotService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Create a new snapshot record
   */
  async createSnapshot(options: CreateSnapshotOptions) {
    const { data, error } = await this.supabase
      .from('venue_snapshots')
      .insert({
        venue_id: options.venueId,
        started_at: new Date().toISOString(),
        status: 'in_progress',
        source: options.source,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create snapshot: ${error.message}`);
    }

    return data;
  }

  /**
   * Update snapshot with completion status and metrics
   */
  async updateSnapshot(options: UpdateSnapshotOptions) {
    const updates: any = {
      status: options.status,
      completed_at: new Date().toISOString(),
    };

    if (options.errorMessage) {
      updates.error_message = options.errorMessage;
    }

    if (options.metrics) {
      updates.transaction_count = options.metrics.transactionCount;
      updates.total_revenue = options.metrics.totalRevenue;
      updates.unique_customers = options.metrics.uniqueCustomers;
    }

    if (options.apiResults) {
      Object.entries(options.apiResults).forEach(([api, success]) => {
        updates[`${api}_fetched`] = success;
      });
    }

    const { error } = await this.supabase
      .from('venue_snapshots')
      .update(updates)
      .eq('id', options.snapshotId);

    if (error) {
      throw new Error(`Failed to update snapshot: ${error.message}`);
    }
  }

  /**
   * Calculate daily summary from snapshots
   */
  async calculateDailySummary(venueId: string, date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all completed snapshots for the day
    const { data: snapshots, error } = await this.supabase
      .from('venue_snapshots')
      .select('*')
      .eq('venue_id', venueId)
      .eq('status', 'completed')
      .gte('completed_at', startOfDay.toISOString())
      .lte('completed_at', endOfDay.toISOString());

    if (error) {
      throw new Error(`Failed to fetch snapshots: ${error.message}`);
    }

    if (!snapshots || snapshots.length === 0) {
      return null;
    }

    // Calculate aggregated metrics
    const totalRevenue = snapshots.reduce((sum, s) => sum + (s.total_revenue || 0), 0);
    const totalTransactions = snapshots.reduce((sum, s) => sum + (s.transaction_count || 0), 0);
    const avgTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    // Get unique customers (would need to query transaction data for accuracy)
    const uniqueCustomers = Math.max(...snapshots.map(s => s.unique_customers || 0));

    // Check if we already have a summary for this day
    const { data: existingSummary } = await this.supabase
      .from('daily_summaries')
      .select('id')
      .eq('venue_id', venueId)
      .eq('summary_date', startOfDay.toISOString())
      .single();

    const summaryData = {
      venue_id: venueId,
      summary_date: startOfDay.toISOString(),
      total_revenue: totalRevenue,
      transaction_count: totalTransactions,
      average_transaction: avgTransaction,
      unique_customers: uniqueCustomers,
      snapshot_count: snapshots.length,
      updated_at: new Date().toISOString(),
    };

    if (existingSummary) {
      // Update existing summary
      await this.supabase
        .from('daily_summaries')
        .update(summaryData)
        .eq('id', existingSummary.id);
    } else {
      // Create new summary
      await this.supabase
        .from('daily_summaries')
        .insert(summaryData);
    }

    return summaryData;
  }

  /**
   * Get latest snapshot for a venue
   */
  async getLatestSnapshot(venueId: string) {
    const { data, error } = await this.supabase
      .from('venue_snapshots')
      .select('*')
      .eq('venue_id', venueId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw new Error(`Failed to fetch latest snapshot: ${error.message}`);
    }

    return data;
  }

  /**
   * Check if a snapshot is needed based on frequency settings
   */
  async isSnapshotNeeded(venueId: string, frequencyMinutes: number = 180): boolean {
    const latestSnapshot = await this.getLatestSnapshot(venueId);
    
    if (!latestSnapshot) {
      return true; // No snapshots exist
    }

    const lastSnapshotTime = new Date(latestSnapshot.created_at).getTime();
    const now = Date.now();
    const timeSinceLastSnapshot = now - lastSnapshotTime;
    const frequencyMs = frequencyMinutes * 60 * 1000;

    return timeSinceLastSnapshot >= frequencyMs;
  }

  /**
   * Clean up old snapshots (keep last 30 days)
   */
  async cleanupOldSnapshots(venueId: string, daysToKeep: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const { error } = await this.supabase
      .from('venue_snapshots')
      .delete()
      .eq('venue_id', venueId)
      .lt('created_at', cutoffDate.toISOString());

    if (error) {
      throw new Error(`Failed to cleanup old snapshots: ${error.message}`);
    }
  }
}