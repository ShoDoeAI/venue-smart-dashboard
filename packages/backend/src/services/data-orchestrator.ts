import { SupabaseClient } from '@supabase/supabase-js';
import { ToastConnector } from '@venuesync/shared/connectors/toast/toast-connector';
import { EventbriteConnector } from '@venuesync/shared/connectors/eventbrite/eventbrite-connector';
import { OpenDateConnector } from '@venuesync/shared/connectors/opendate/opendate-connector';
import type { Database } from '@venuesync/shared/types/database.generated';
import { SnapshotService } from './snapshot-service';

export interface OrchestratorConfig {
  venueId: string;
  locationId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  apis?: string[]; // Which APIs to fetch from
}

export interface OrchestratorResult {
  snapshotId: string;
  success: boolean;
  results: {
    [api: string]: {
      success: boolean;
      recordCount?: number;
      error?: string;
      duration?: number;
    };
  };
  metrics: {
    totalRevenue: number;
    transactionCount: number;
    averageTransaction: number;
    uniqueCustomers: number;
  };
  duration: number;
}

export class DataOrchestrator {
  private snapshotService: SnapshotService;

  constructor(private supabase: SupabaseClient<Database>) {
    this.snapshotService = new SnapshotService(supabase);
  }

  /**
   * Orchestrate data fetching from multiple APIs
   */
  async fetchAllData(config: OrchestratorConfig): Promise<OrchestratorResult> {
    const startTime = Date.now();
    const results: OrchestratorResult['results'] = {};
    
    // Create snapshot record
    const snapshot = await this.snapshotService.createSnapshot({
      venueId: config.venueId,
      source: 'manual',
    });

    try {
      // Default to last 7 days if no date range specified
      const dateRange = config.dateRange || {
        end: new Date(),
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      };

      // Determine which APIs to fetch from (MVP: 3 core APIs)
      const apisToFetch = config.apis || ['toast', 'eventbrite', 'opendate'];

      // Fetch data from each API in parallel
      const fetchPromises = apisToFetch.map(api => 
        this.fetchApiData(api, config.venueId, config.locationId, dateRange)
          .then(result => ({ api, result }))
          .catch(error => ({ 
            api, 
            result: { 
              success: false, 
              error: error.message 
            } 
          }))
      );

      const fetchResults = await Promise.allSettled(fetchPromises);

      // Process results
      fetchResults.forEach((promiseResult) => {
        if (promiseResult.status === 'fulfilled') {
          const { api, result } = promiseResult.value;
          results[api] = result;
        }
      });

      // Calculate aggregate metrics
      const metrics = await this.calculateAggregateMetrics(
        config.venueId, 
        snapshot.created_at
      );

      // Update snapshot with results
      await this.snapshotService.updateSnapshot({
        snapshotId: snapshot.id,
        status: 'completed',
        metrics,
        apiResults: {
          toast: results.toast?.success || false,
          eventbrite: results.eventbrite?.success || false,
          opendate: results.opendate?.success || false,
          wisk: false, // Placeholder - no public API docs
          resy: false, // Not used - replaced with OpenDate.io
        },
      });

      // Calculate daily summary
      await this.snapshotService.calculateDailySummary(
        config.venueId,
        new Date()
      );

      const duration = Date.now() - startTime;

      return {
        snapshotId: snapshot.id,
        success: true,
        results,
        metrics,
        duration,
      };

    } catch (error) {
      // Update snapshot as failed
      await this.snapshotService.updateSnapshot({
        snapshotId: snapshot.id,
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Fetch data from a specific API
   */
  private async fetchApiData(
    api: string,
    venueId: string,
    locationId?: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<OrchestratorResult['results'][string]> {
    const apiStartTime = Date.now();

    switch (api) {
      case 'toast':
        return this.fetchToastData(venueId, locationId, dateRange)
          .then(result => ({
            success: true,
            recordCount: result.recordCount,
            duration: Date.now() - apiStartTime,
          }))
          .catch(error => ({
            success: false,
            error: error.message,
            duration: Date.now() - apiStartTime,
          }));

      case 'eventbrite':
        return this.fetchEventbriteData(venueId, dateRange)
          .then(result => ({
            success: true,
            recordCount: result.recordCount,
            duration: Date.now() - apiStartTime,
          }))
          .catch(error => ({
            success: false,
            error: error.message,
            duration: Date.now() - apiStartTime,
          }));

      case 'opendate':
        return this.fetchOpenDateData(venueId, dateRange)
          .then(result => ({
            success: true,
            recordCount: result.recordCount,
            duration: Date.now() - apiStartTime,
          }))
          .catch(error => ({
            success: false,
            error: error.message,
            duration: Date.now() - apiStartTime,
          }));

      case 'wisk':
        // Placeholder - No public API documentation available
        return {
          success: false,
          error: 'WISK API integration pending - no public documentation',
        };

      default:
        return {
          success: false,
          error: `Unknown API: ${api}`,
        };
    }
  }

  /**
   * Fetch Toast data
   */
  private async fetchToastData(
    venueId: string,
    locationId?: string,
    dateRange?: { start: Date; end: Date }
  ) {
    // Get Toast credentials
    const { data: credentials, error } = await this.supabase
      .from('api_credentials')
      .select('*')
      .eq('venue_id', venueId)
      .eq('service', 'toast')
      .single();

    if (error || !credentials) {
      throw new Error('Toast credentials not found');
    }

    // Initialize connector
    const connector = new ToastConnector(
      credentials,
      {
        timeout: 30000,
        maxRetries: 3,
        retryDelay: 1000,
      },
      this.supabase
    );

    // Get location if not specified
    if (!locationId) {
      const locationsResult = await connector.fetchLocations();
      if (!locationsResult.success || !locationsResult.data?.length) {
        throw new Error('No Toast locations found');
      }
      locationId = locationsResult.data[0].id;
    }

    // Fetch transactions
    const result = await connector.fetchAllTransactions(
      locationId,
      dateRange?.start || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      dateRange?.end || new Date()
    );

    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to fetch Toast data');
    }

    const transactions = result.data || [];

    // Save transactions
    if (transactions.length > 0) {
      const saveResult = await connector.saveTransactions(
        transactions,
        new Date().toISOString()
      );

      if (!saveResult.success) {
        throw new Error('Failed to save Toast transactions');
      }
    }

    return {
      recordCount: transactions.length,
    };
  }

  /**
   * Fetch Eventbrite data
   */
  private async fetchEventbriteData(
    venueId: string,
    dateRange?: { start: Date; end: Date }
  ) {
    // Get Eventbrite credentials
    const { data: credentials, error } = await this.supabase
      .from('api_credentials')
      .select('*')
      .eq('venue_id', venueId)
      .eq('service', 'eventbrite')
      .single();

    if (error || !credentials) {
      throw new Error('Eventbrite credentials not found');
    }

    // Initialize connector
    const connector = new EventbriteConnector(
      credentials,
      {
        timeout: 30000,
        maxRetries: 3,
        retryDelay: 1000,
      },
      this.supabase
    );

    // Fetch events and attendees as transactions
    const result = await connector.fetchAllTransactions(
      undefined, // Will fetch all organizations
      dateRange?.start || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      dateRange?.end || new Date()
    );

    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to fetch Eventbrite data');
    }

    const transactions = result.data || [];

    // Save transactions
    if (transactions.length > 0) {
      const saveResult = await connector.saveTransactions(
        transactions,
        new Date().toISOString()
      );

      if (!saveResult.success) {
        throw new Error('Failed to save Eventbrite transactions');
      }
    }

    return {
      recordCount: transactions.length,
    };
  }

  /**
   * Fetch OpenDate.io data
   */
  private async fetchOpenDateData(
    venueId: string,
    dateRange?: { start: Date; end: Date }
  ) {
    // Get OpenDate credentials
    const { data: credentials, error } = await this.supabase
      .from('api_credentials')
      .select('*')
      .eq('venue_id', venueId)
      .eq('service', 'opendate')
      .single();

    if (error || !credentials) {
      throw new Error('OpenDate.io credentials not found');
    }

    // Initialize connector
    const connector = new OpenDateConnector(
      credentials,
      {
        timeout: 30000,
        maxRetries: 3,
        retryDelay: 1000,
      },
      this.supabase
    );

    // Fetch all transactions (orders and tickets)
    const result = await connector.fetchAllTransactions(
      undefined, // Will fetch all venues
      dateRange?.start?.toISOString() || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      dateRange?.end?.toISOString() || new Date().toISOString()
    );

    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to fetch OpenDate.io data');
    }

    const transactions = result.data || [];

    // Save transactions
    if (transactions.length > 0) {
      const saveResult = await connector.saveTransactions(
        transactions,
        new Date().toISOString()
      );

      if (!saveResult.success) {
        throw new Error('Failed to save OpenDate.io transactions');
      }
    }

    return {
      recordCount: transactions.length,
    };
  }

  /**
   * Calculate aggregate metrics from fetched data
   */
  private async calculateAggregateMetrics(
    venueId: string,
    snapshotTimestamp: string
  ) {
    // Get transactions from all sources for this snapshot
    const [toastResult, eventbriteResult, opendateResult] = await Promise.allSettled([
      this.supabase
        .from('toast_transactions')
        .select('*')
        .eq('snapshot_timestamp', snapshotTimestamp),
      this.supabase
        .from('eventbrite_transactions')
        .select('*')
        .eq('snapshot_timestamp', snapshotTimestamp),
      this.supabase
        .from('opendate_transactions')
        .select('*')
        .eq('snapshot_timestamp', snapshotTimestamp),
    ]);

    // Combine all transactions
    let allTransactions: any[] = [];
    
    if (toastResult.status === 'fulfilled' && !toastResult.value.error) {
      allTransactions = allTransactions.concat(toastResult.value.data || []);
    }
    
    if (eventbriteResult.status === 'fulfilled' && !eventbriteResult.value.error) {
      allTransactions = allTransactions.concat(eventbriteResult.value.data || []);
    }
    
    if (opendateResult.status === 'fulfilled' && !opendateResult.value.error) {
      allTransactions = allTransactions.concat(opendateResult.value.data || []);
    }

    const transactionCount = allTransactions.length;
    const totalRevenue = allTransactions.reduce((sum, tx) => {
      // Handle different amount fields across APIs
      const amount = tx.total_amount || tx.amount || 0;
      return sum + amount;
    }, 0);
    const averageTransaction = transactionCount > 0 ? totalRevenue / transactionCount : 0;
    
    // Count unique customers across all platforms
    const uniqueCustomers = new Set(
      allTransactions
        .map(tx => tx.customer_id || tx.customer_email)
        .filter(id => id !== null && id !== undefined)
    ).size;

    return {
      totalRevenue,
      transactionCount,
      averageTransaction,
      uniqueCustomers,
    };
  }

  /**
   * Check which APIs need updating
   */
  async getApiStatuses(venueId: string) {
    const latestSnapshot = await this.snapshotService.getLatestSnapshot(venueId);
    
    if (!latestSnapshot) {
      return {
        toast: { needsUpdate: true, lastFetch: null },
        eventbrite: { needsUpdate: true, lastFetch: null },
        wisk: { needsUpdate: true, lastFetch: null },
      };
    }

    const timeSinceSnapshot = Date.now() - new Date(latestSnapshot.created_at).getTime();
    const threeHours = 3 * 60 * 60 * 1000;

    return {
      toast: {
        needsUpdate: timeSinceSnapshot > threeHours || !latestSnapshot.toast_fetched,
        lastFetch: latestSnapshot.toast_fetched ? latestSnapshot.created_at : null,
      },
      eventbrite: {
        needsUpdate: timeSinceSnapshot > threeHours || !latestSnapshot.eventbrite_fetched,
        lastFetch: latestSnapshot.eventbrite_fetched ? latestSnapshot.created_at : null,
      },
      opendate: {
        needsUpdate: timeSinceSnapshot > threeHours || !latestSnapshot.opendate_fetched,
        lastFetch: latestSnapshot.opendate_fetched ? latestSnapshot.created_at : null,
      },
      wisk: {
        needsUpdate: false, // Placeholder - no public API
        lastFetch: null,
      },
    };
  }
}