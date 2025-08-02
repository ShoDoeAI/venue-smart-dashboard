import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

import {
  audienceRepublicCampaignSchema,
  audienceRepublicContactSchema,
  audienceRepublicEventSchema,
  audienceRepublicAnalyticsSchema,
  audienceRepublicApiResponseSchema,
} from '../../schemas/audience-republic';
import type { Database } from '../../types/database.generated';
import { BaseConnector } from '../base-connector';
import type { ConnectorConfig, FetchResult, ConnectorError, ConnectorCredentials } from '../types';

import type {
  AudienceRepublicCredentials,
  AudienceRepublicCampaign,
  AudienceRepublicContact,
  AudienceRepublicEvent,
  AudienceRepublicAnalytics,
  TransformedAudienceRepublicData,
} from './types';



/**
 * Audience Republic Connector
 * 
 * Note: This is a placeholder implementation. 
 * Contact support@audiencerepublic.com for official API documentation and access.
 * 
 * Expected API endpoints (based on common patterns):
 * - GET /api/v1/campaigns
 * - GET /api/v1/contacts
 * - GET /api/v1/events
 * - GET /api/v1/analytics
 * - GET /api/v1/segments
 */
export class AudienceRepublicConnector extends BaseConnector {
  private baseUrl: string;
  private headers: Record<string, string>;
  private audienceRepublicCredentials: AudienceRepublicCredentials;

  constructor(
    credentials: ConnectorCredentials,
    config: ConnectorConfig,
    supabase: SupabaseClient<Database>
  ) {
    super(credentials, config, supabase);
    this.audienceRepublicCredentials = credentials.credentials as unknown as AudienceRepublicCredentials;
    this.baseUrl = 'https://api.audiencerepublic.com/v1';
    this.headers = {
      'Content-Type': 'application/json',
      'X-API-Key': this.audienceRepublicCredentials.apiKey,
      'User-Agent': 'VenueSync/1.0',
    };
  }

  get serviceName(): string {
    return 'AudienceRepublic';
  }

  async validateCredentials(): Promise<boolean> {
    try {
      // Test API key by fetching account info
      const result = await this.makeApiRequest('/account');
      return result.success;
    } catch {
      return false;
    }
  }

  async testConnection(): Promise<FetchResult<unknown>> {
    const startTime = Date.now();
    try {
      const result = await this.makeApiRequest('/health');
      return {
        success: result.success,
        data: result.data || { status: 'ok', service: 'AudienceRepublic' },
        error: result.error,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return this.createErrorResult(error, startTime);
    }
  }

  /**
   * Fetch marketing campaigns
   */
  async fetchCampaigns(
    startDate?: Date,
    endDate?: Date,
    limit = 100
  ): Promise<FetchResult<AudienceRepublicCampaign[]>> {
    const startTime = Date.now();
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        ...(startDate && { start_date: startDate.toISOString() }),
        ...(endDate && { end_date: endDate.toISOString() }),
      });

      const result = await this.makeApiRequest(`/campaigns?${params.toString()}`);

      if (!result.success || !result.data) {
        return this.createErrorResult(result.error || new Error('No data received'), startTime);
      }

      const responseSchema = audienceRepublicApiResponseSchema(
        z.array(audienceRepublicCampaignSchema)
      );
      const validated = responseSchema.parse(result.data);

      return {
        success: true,
        data: validated.data,
        error: undefined,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return this.createErrorResult(error, startTime);
    }
  }

  /**
   * Fetch contacts/subscribers
   */
  async fetchContacts(
    limit = 100,
    offset = 0
  ): Promise<FetchResult<AudienceRepublicContact[]>> {
    const startTime = Date.now();
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      const result = await this.makeApiRequest(`/contacts?${params.toString()}`);

      if (!result.success || !result.data) {
        return this.createErrorResult(result.error || new Error('No data received'), startTime);
      }

      const responseSchema = audienceRepublicApiResponseSchema(
        z.array(audienceRepublicContactSchema)
      );
      const validated = responseSchema.parse(result.data);

      return {
        success: true,
        data: validated.data,
        error: undefined,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return this.createErrorResult(error, startTime);
    }
  }

  /**
   * Fetch synced events from ticketing platforms
   */
  async fetchEvents(
    startDate?: Date,
    endDate?: Date
  ): Promise<FetchResult<AudienceRepublicEvent[]>> {
    const startTime = Date.now();
    try {
      const params = new URLSearchParams({
        ...(startDate && { start_date: startDate.toISOString() }),
        ...(endDate && { end_date: endDate.toISOString() }),
      });

      const result = await this.makeApiRequest(`/events?${params.toString()}`);

      if (!result.success || !result.data) {
        return this.createErrorResult(result.error || new Error('No data received'), startTime);
      }

      const responseSchema = audienceRepublicApiResponseSchema(
        z.array(audienceRepublicEventSchema)
      );
      const validated = responseSchema.parse(result.data);

      return {
        success: true,
        data: validated.data,
        error: undefined,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return this.createErrorResult(error, startTime);
    }
  }

  /**
   * Fetch analytics data
   */
  async fetchAnalytics(
    startDate: Date,
    endDate: Date
  ): Promise<FetchResult<AudienceRepublicAnalytics>> {
    const startTime = Date.now();
    try {
      const params = new URLSearchParams({
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      });

      const result = await this.makeApiRequest(`/analytics?${params.toString()}`);

      if (!result.success || !result.data) {
        return this.createErrorResult(result.error || new Error('No data received'), startTime);
      }

      const validated = audienceRepublicAnalyticsSchema.parse(result.data);

      return {
        success: true,
        data: validated,
        error: undefined,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return this.createErrorResult(error, startTime);
    }
  }

  /**
   * Fetch all data and transform for VenueSync
   */
  async fetchAllData(
    startDate: Date,
    endDate: Date
  ): Promise<FetchResult<TransformedAudienceRepublicData>> {
    const startTime = Date.now();
    try {
      // Fetch all data in parallel
      const [campaignsResult, contactsResult, eventsResult, analyticsResult] = await Promise.all([
        this.fetchCampaigns(startDate, endDate),
        this.fetchContacts(1000), // Get more contacts
        this.fetchEvents(startDate, endDate),
        this.fetchAnalytics(startDate, endDate),
      ]);

      // Check for failures
      if (!campaignsResult.success) {
        return this.createErrorResult(campaignsResult.error || new Error('Failed to fetch campaigns'), startTime);
      }
      if (!contactsResult.success) {
        return this.createErrorResult(contactsResult.error || new Error('Failed to fetch contacts'), startTime);
      }
      if (!eventsResult.success) {
        return this.createErrorResult(eventsResult.error || new Error('Failed to fetch events'), startTime);
      }
      if (!analyticsResult.success) {
        return this.createErrorResult(analyticsResult.error || new Error('Failed to fetch analytics'), startTime);
      }

      // Calculate aggregate metrics
      const campaigns = campaignsResult.data || [];
      const contacts = contactsResult.data || [];
      const analytics = analyticsResult.data;

      const totalRevenue = campaigns.reduce((sum, campaign) => sum + campaign.stats.revenue, 0);
      const totalContacts = contacts.length;
      const engagedContacts = contacts.filter(c => c.engagement.totalOpens > 0).length;
      const engagementRate = totalContacts > 0 ? (engagedContacts / totalContacts) * 100 : 0;

      const transformedData: TransformedAudienceRepublicData = {
        campaigns,
        contacts,
        events: eventsResult.data || [],
        analytics: analytics || {
          dateRange: { start: startDate.toISOString(), end: endDate.toISOString() },
          overview: {
            totalCampaigns: campaigns.length,
            totalContacts,
            totalRevenue,
            avgEngagementRate: engagementRate,
          },
          campaigns: [],
          channels: [],
        },
        totalRevenue,
        totalContacts,
        engagementRate,
      };

      return {
        success: true,
        data: transformedData,
        error: undefined,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return this.createErrorResult(error, startTime);
    }
  }

  /**
   * Helper method to make API requests
   */
  private async makeApiRequest(
    endpoint: string,
    options?: RequestInit
  ): Promise<FetchResult<unknown>> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    
    return super.fetchWithRetry(
      async () => {
        const response = await fetch(url, {
          ...options,
          headers: {
            ...this.headers,
            ...options?.headers,
          },
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return data;
      },
      'makeApiRequest'
    );
  }

  /**
   * Create error result with proper typing
   */
  private createErrorResult<T = unknown>(error: unknown, startTime: number): FetchResult<T> {
    const connectorError: ConnectorError = {
      code: 'UNKNOWN',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date(),
      retryable: false,
    };

    if (error instanceof z.ZodError) {
      connectorError.code = 'INVALID_RESPONSE';
      connectorError.message = 'Invalid response format from Audience Republic API';
      connectorError.details = error.errors;
    }

    return {
      success: false,
      data: undefined,
      error: connectorError,
      timestamp: new Date(),
      duration: Date.now() - startTime,
    };
  }
}