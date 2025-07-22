import { BaseConnector } from '../base-connector';
import type { ConnectorConfig, FetchResult, ConnectorError } from '../../types/connector';
import type {
  AudienceRepublicConfig,
  AudienceRepublicCredentials,
  AudienceRepublicCampaign,
  AudienceRepublicContact,
  AudienceRepublicEvent,
  AudienceRepublicAnalytics,
  TransformedAudienceRepublicData,
} from './types';
import {
  audienceRepublicCampaignSchema,
  audienceRepublicContactSchema,
  audienceRepublicEventSchema,
  audienceRepublicAnalyticsSchema,
  audienceRepublicApiResponseSchema,
} from '../../schemas/audience-republic';
import { z } from 'zod';

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
export class AudienceRepublicConnector extends BaseConnector<AudienceRepublicCredentials> {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(config: ConnectorConfig<AudienceRepublicCredentials>) {
    super(config);
    this.baseUrl = (config as AudienceRepublicConfig).baseUrl || 'https://api.audiencerepublic.com/v1';
    this.headers = {
      'Content-Type': 'application/json',
      'X-API-Key': this.credentials.apiKey,
      'User-Agent': 'VenueSync/1.0',
    };
  }

  get serviceName(): string {
    return 'AudienceRepublic';
  }

  async validateCredentials(): Promise<boolean> {
    try {
      // Test API key by fetching account info
      const result = await this.fetchWithRetry('/account', {
        headers: this.headers,
      });
      return result.success;
    } catch {
      return false;
    }
  }

  async testConnection(): Promise<FetchResult<unknown>> {
    try {
      const result = await this.fetchWithRetry('/health', {
        headers: this.headers,
      });
      return {
        success: result.success,
        data: result.data || { status: 'ok', service: 'AudienceRepublic' },
        error: result.error,
      };
    } catch (error) {
      return this.handleError(error);
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
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        ...(startDate && { start_date: startDate.toISOString() }),
        ...(endDate && { end_date: endDate.toISOString() }),
      });

      const result = await this.fetchWithRetry(`/campaigns?${params}`, {
        headers: this.headers,
      });

      if (!result.success || !result.data) {
        return { success: false, data: null, error: result.error };
      }

      const responseSchema = audienceRepublicApiResponseSchema(
        z.array(audienceRepublicCampaignSchema)
      );
      const validated = responseSchema.parse(result.data);

      return {
        success: true,
        data: validated.data,
        error: null,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Fetch contacts/subscribers
   */
  async fetchContacts(
    limit = 100,
    offset = 0
  ): Promise<FetchResult<AudienceRepublicContact[]>> {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      const result = await this.fetchWithRetry(`/contacts?${params}`, {
        headers: this.headers,
      });

      if (!result.success || !result.data) {
        return { success: false, data: null, error: result.error };
      }

      const responseSchema = audienceRepublicApiResponseSchema(
        z.array(audienceRepublicContactSchema)
      );
      const validated = responseSchema.parse(result.data);

      return {
        success: true,
        data: validated.data,
        error: null,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Fetch synced events from ticketing platforms
   */
  async fetchEvents(
    startDate?: Date,
    endDate?: Date
  ): Promise<FetchResult<AudienceRepublicEvent[]>> {
    try {
      const params = new URLSearchParams({
        ...(startDate && { start_date: startDate.toISOString() }),
        ...(endDate && { end_date: endDate.toISOString() }),
      });

      const result = await this.fetchWithRetry(`/events?${params}`, {
        headers: this.headers,
      });

      if (!result.success || !result.data) {
        return { success: false, data: null, error: result.error };
      }

      const responseSchema = audienceRepublicApiResponseSchema(
        z.array(audienceRepublicEventSchema)
      );
      const validated = responseSchema.parse(result.data);

      return {
        success: true,
        data: validated.data,
        error: null,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Fetch analytics data
   */
  async fetchAnalytics(
    startDate: Date,
    endDate: Date
  ): Promise<FetchResult<AudienceRepublicAnalytics>> {
    try {
      const params = new URLSearchParams({
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      });

      const result = await this.fetchWithRetry(`/analytics?${params}`, {
        headers: this.headers,
      });

      if (!result.success || !result.data) {
        return { success: false, data: null, error: result.error };
      }

      const validated = audienceRepublicAnalyticsSchema.parse(result.data);

      return {
        success: true,
        data: validated,
        error: null,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Fetch all data and transform for VenueSync
   */
  async fetchAllData(
    startDate: Date,
    endDate: Date
  ): Promise<FetchResult<TransformedAudienceRepublicData>> {
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
        return { success: false, data: null, error: campaignsResult.error };
      }
      if (!contactsResult.success) {
        return { success: false, data: null, error: contactsResult.error };
      }
      if (!eventsResult.success) {
        return { success: false, data: null, error: eventsResult.error };
      }
      if (!analyticsResult.success) {
        return { success: false, data: null, error: analyticsResult.error };
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
        error: null,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Override fetchWithRetry to use full URL
   */
  protected async fetchWithRetry(
    endpoint: string,
    options?: RequestInit
  ): Promise<FetchResult<unknown>> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    return super.fetchWithRetry(url, options);
  }

  /**
   * Handle API-specific errors
   */
  private handleError(error: unknown): FetchResult<any> {
    const connectorError: ConnectorError = {
      code: 'UNKNOWN',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      service: this.serviceName,
      timestamp: new Date().toISOString(),
    };

    if (error instanceof z.ZodError) {
      connectorError.code = 'INVALID_RESPONSE';
      connectorError.message = 'Invalid response format from Audience Republic API';
      connectorError.details = error.errors;
    }

    return {
      success: false,
      data: null,
      error: connectorError,
    };
  }
}