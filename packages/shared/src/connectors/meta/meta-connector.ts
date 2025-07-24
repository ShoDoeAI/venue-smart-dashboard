import { BaseConnector } from '../base-connector';
import type { ConnectorConfig, FetchResult, ConnectorError, ConnectorCredentials } from '../types';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database.generated';
import type {
  MetaCredentials,
  MetaPageInsights,
  MetaPageMetrics,
  MetaPost,
  MetaAudienceDemographics,
  MetaAnalytics,
  TransformedMetaData,
} from './types';
import {
  metaPageInsightsSchema,
  metaApiResponseSchema,
} from '../../schemas/meta';
import { z } from 'zod';

/**
 * Meta Business Suite Connector
 * 
 * Integrates with Facebook Graph API to fetch page insights,
 * post performance, and audience analytics.
 * 
 * Required permissions:
 * - pages_show_list
 * - pages_read_engagement
 * - pages_read_user_content
 * - read_insights
 * - business_management (for ad insights)
 */
export class MetaConnector extends BaseConnector {
  private baseUrl: string;
  private apiVersion: string;
  private headers: Record<string, string>;
  private metaCredentials: MetaCredentials;

  constructor(
    credentials: ConnectorCredentials,
    config: ConnectorConfig,
    supabase: SupabaseClient<Database>
  ) {
    super(credentials, config, supabase);
    
    this.metaCredentials = credentials.credentials as unknown as MetaCredentials;
    this.apiVersion = 'v18.0';
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
    
    this.headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'VenueSync/1.0',
    };
  }

  get serviceName(): string {
    return 'Meta Business Suite';
  }

  async validateCredentials(): Promise<boolean> {
    try {
      const result = await this.fetchWithRetry(
        () => this.makeApiRequest(
          `/${this.metaCredentials.pageId}?access_token=${this.metaCredentials.accessToken}`,
          { headers: this.headers }
        ),
        'validateCredentials'
      );
      return result.success && result.data && !result.data?.error;
    } catch {
      return false;
    }
  }

  async testConnection(): Promise<FetchResult<unknown>> {
    const startTime = Date.now();
    try {
      const response = await fetch(
        `${this.baseUrl}/${this.metaCredentials.pageId}?fields=id,name,category&access_token=${this.metaCredentials.accessToken}`,
        { headers: this.headers }
      );
      const data = await response.json();
      return {
        success: response.ok,
        data,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error as ConnectorError,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Fetch page insights
   */
  async fetchPageInsights(
    metrics: string[],
    period: 'day' | 'week' | 'days_28' = 'day',
    since?: Date,
    until?: Date
  ): Promise<FetchResult<MetaPageInsights[]>> {
    const startTime = Date.now();
    try {
      const params = new URLSearchParams({
        access_token: this.metaCredentials.accessToken,
        metric: metrics.join(','),
        period,
        ...(since && { since: Math.floor(since.getTime() / 1000).toString() }),
        ...(until && { until: Math.floor(until.getTime() / 1000).toString() }),
      });

      const result = await this.fetchWithRetry(
        () => this.makeApiRequest(
          `/${this.metaCredentials.pageId}/insights?${params}`,
          { headers: this.headers }
        ),
        'fetchPageInsights'
      );

      if (!result.success || !result.data) {
        return { 
          success: false, 
          data: undefined, 
          error: result.error,
          timestamp: new Date(),
          duration: Date.now() - startTime,
        };
      }

      const responseSchema = metaApiResponseSchema(
        z.array(metaPageInsightsSchema)
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
      const errorResult = this.handleError(error);
      return {
        success: false,
        data: undefined,
        error: errorResult,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Fetch page posts
   */
  async fetchPosts(
    limit = 25,
    since?: Date,
    until?: Date
  ): Promise<FetchResult<MetaPost[]>> {
    const startTime = Date.now();
    try {
      const params = new URLSearchParams({
        access_token: this.metaCredentials.accessToken,
        fields: 'id,message,created_time,updated_time,type,permalink,shares,reactions.summary(true),comments.summary(true)',
        limit: limit.toString(),
        ...(since && { since: Math.floor(since.getTime() / 1000).toString() }),
        ...(until && { until: Math.floor(until.getTime() / 1000).toString() }),
      });

      const result = await this.fetchWithRetry(
        () => this.makeApiRequest(
          `/${this.metaCredentials.pageId}/posts?${params}`,
          { headers: this.headers }
        ),
        'fetchPosts'
      );

      if (!result.success || !result.data) {
        return { 
          success: false, 
          data: undefined, 
          error: result.error,
          timestamp: new Date(),
          duration: Date.now() - startTime,
        };
      }

      const posts: MetaPost[] = [];
      const rawPosts = result.data.data || [];

      // Process each post to match our schema
      for (const rawPost of rawPosts) {
        const post: MetaPost = {
          id: rawPost.id,
          message: rawPost.message,
          createdTime: rawPost.created_time,
          updatedTime: rawPost.updated_time,
          type: rawPost.type || 'status',
          permalink: rawPost.permalink,
          shares: rawPost.shares,
          reactions: rawPost.reactions?.summary ? {
            like: rawPost.reactions.summary.total_count || 0,
            love: 0,
            wow: 0,
            haha: 0,
            sad: 0,
            angry: 0,
            total: rawPost.reactions.summary.total_count || 0,
          } : undefined,
          comments: rawPost.comments?.summary ? {
            count: rawPost.comments.summary.total_count || 0,
          } : undefined,
        };

        // Fetch insights for this post
        const insightsResult = await this.fetchPostInsights(post.id);
        if (insightsResult.success && insightsResult.data) {
          post.insights = insightsResult.data;
        }

        posts.push(post);
      }

      return {
        success: true,
        data: posts,
        error: undefined,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const errorResult = this.handleError(error);
      return {
        success: false,
        data: undefined,
        error: errorResult,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Fetch insights for a specific post
   */
  private async fetchPostInsights(postId: string): Promise<FetchResult<any>> {
    const startTime = Date.now();
    try {
      const params = new URLSearchParams({
        access_token: this.metaCredentials.accessToken,
        metric: 'post_impressions,post_impressions_unique,post_engaged_users,post_clicks',
      });

      const result = await this.fetchWithRetry(
        () => this.makeApiRequest(
          `/${postId}/insights?${params}`,
          { headers: this.headers }
        ),
        'fetchPostInsights'
      );

      if (!result.success || !result.data?.data) {
        return { 
          success: false, 
          data: undefined, 
          error: result.error,
          timestamp: new Date(),
          duration: Date.now() - startTime,
        };
      }

      // Transform insights data
      const insights: any = {
        impressions: 0,
        reach: 0,
        engagement: 0,
        clicks: 0,
      };

      for (const insight of result.data.data) {
        const value = insight.values?.[0]?.value || 0;
        switch (insight.name) {
          case 'post_impressions':
            insights.impressions = value;
            break;
          case 'post_impressions_unique':
            insights.reach = value;
            break;
          case 'post_engaged_users':
            insights.engagement = value;
            break;
          case 'post_clicks':
            insights.clicks = value;
            break;
        }
      }

      return {
        success: true,
        data: insights,
        error: undefined,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const errorResult = this.handleError(error);
      return {
        success: false,
        data: undefined,
        error: errorResult,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Fetch audience demographics
   */
  async fetchAudienceDemographics(): Promise<FetchResult<MetaAudienceDemographics>> {
    const startTime = Date.now();
    try {
      const params = new URLSearchParams({
        access_token: this.metaCredentials.accessToken,
        metric: 'page_fans_gender_age,page_fans_country,page_fans_city,page_fans_locale',
        period: 'lifetime',
      });

      const result = await this.fetchWithRetry(
        () => this.makeApiRequest(
          `/${this.metaCredentials.pageId}/insights?${params}`,
          { headers: this.headers }
        ),
        'fetchAudienceDemographics'
      );

      if (!result.success || !result.data?.data) {
        return { 
          success: false, 
          data: undefined, 
          error: result.error,
          timestamp: new Date(),
          duration: Date.now() - startTime,
        };
      }

      const demographics: MetaAudienceDemographics = {
        ageGenderDistribution: {},
        countryDistribution: {},
        cityDistribution: {},
        languageDistribution: {},
        fansByLikeSource: {},
      };

      // Process insights data
      for (const insight of result.data.data) {
        const value = insight.values?.[0]?.value || {};
        switch (insight.name) {
          case 'page_fans_gender_age':
            demographics.ageGenderDistribution = value;
            break;
          case 'page_fans_country':
            demographics.countryDistribution = value;
            break;
          case 'page_fans_city':
            demographics.cityDistribution = value;
            break;
          case 'page_fans_locale':
            demographics.languageDistribution = value;
            break;
        }
      }

      return {
        success: true,
        data: demographics,
        error: undefined,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const errorResult = this.handleError(error);
      return {
        success: false,
        data: undefined,
        error: errorResult,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Calculate aggregated page metrics
   */
  private async calculatePageMetrics(
    insights: MetaPageInsights[]
  ): Promise<MetaPageMetrics> {
    const metrics: MetaPageMetrics = {
      pageViews: 0,
      pageFans: 0,
      pageFansAdds: 0,
      pageFansRemoves: 0,
      pageImpressions: 0,
      pageEngagedUsers: 0,
      pagePostEngagements: 0,
      pageVideoViews: 0,
      pageVideoCompleteViews: 0,
      pageCTAClicks: 0,
    };

    for (const insight of insights) {
      const value = insight.values?.[0]?.value || 0;
      const numValue = typeof value === 'number' ? value : 0;

      switch (insight.name) {
        case 'page_views_total':
          metrics.pageViews = numValue;
          break;
        case 'page_fans':
          metrics.pageFans = numValue;
          break;
        case 'page_fan_adds':
          metrics.pageFansAdds = numValue;
          break;
        case 'page_fan_removes':
          metrics.pageFansRemoves = numValue;
          break;
        case 'page_impressions':
          metrics.pageImpressions = numValue;
          break;
        case 'page_engaged_users':
          metrics.pageEngagedUsers = numValue;
          break;
        case 'page_post_engagements':
          metrics.pagePostEngagements = numValue;
          break;
        case 'page_video_views':
          metrics.pageVideoViews = numValue;
          break;
        case 'page_video_complete_views_30s':
          metrics.pageVideoCompleteViews = numValue;
          break;
        case 'page_cta_clicks_logged_in':
          metrics.pageCTAClicks = numValue;
          break;
      }
    }

    return metrics;
  }

  /**
   * Fetch all data and transform for VenueSync
   */
  async fetchAllData(
    startDate: Date,
    endDate: Date
  ): Promise<FetchResult<TransformedMetaData>> {
    const startTime = Date.now();
    try {
      // Define metrics to fetch
      const pageMetrics = [
        'page_views_total',
        'page_fans',
        'page_fan_adds',
        'page_fan_removes',
        'page_impressions',
        'page_engaged_users',
        'page_post_engagements',
        'page_video_views',
        'page_video_complete_views_30s',
        'page_cta_clicks_logged_in',
      ];

      // Fetch all data in parallel
      const [insightsResult, postsResult, demographicsResult] = await Promise.all([
        this.fetchPageInsights(pageMetrics, 'day', startDate, endDate),
        this.fetchPosts(100, startDate, endDate),
        this.fetchAudienceDemographics(),
      ]);

      // Check for failures
      if (!insightsResult.success) {
        return { 
          success: false, 
          data: undefined, 
          error: insightsResult.error,
          timestamp: new Date(),
          duration: Date.now() - startTime,
        };
      }
      if (!postsResult.success) {
        return { 
          success: false, 
          data: undefined, 
          error: postsResult.error,
          timestamp: new Date(),
          duration: Date.now() - startTime,
        };
      }
      if (!demographicsResult.success) {
        return { 
          success: false, 
          data: undefined, 
          error: demographicsResult.error,
          timestamp: new Date(),
          duration: Date.now() - startTime,
        };
      }

      const insights = insightsResult.data || [];
      const posts = postsResult.data || [];
      const demographics = demographicsResult.data || {
        ageGenderDistribution: {},
        countryDistribution: {},
        cityDistribution: {},
        languageDistribution: {},
        fansByLikeSource: {},
      };

      // Calculate metrics
      const pageMetricsData = await this.calculatePageMetrics(insights);

      // Calculate engagement metrics
      let totalEngagement = 0;
      let totalReach = 0;

      for (const post of posts) {
        if (post.insights) {
          totalEngagement += post.insights.engagement || 0;
          totalReach += post.insights.reach || 0;
        } else if (post.reactions) {
          // If no insights available, use reactions as engagement
          totalEngagement += post.reactions.total || 0;
        }
      }

      const avgEngagementRate = totalReach > 0 
        ? (totalEngagement / totalReach) * 100 
        : 0;

      // Get top performing content
      const topPerformingContent = posts
        .filter(post => post.insights)
        .sort((a, b) => (b.insights?.engagement || 0) - (a.insights?.engagement || 0))
        .slice(0, 10)
        .map(post => ({
          postId: post.id,
          message: post.message,
          engagement: post.insights?.engagement || 0,
          reach: post.insights?.reach || 0,
        }));

      // Build analytics object
      const analytics: MetaAnalytics = {
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        page: {
          fans: pageMetricsData.pageFans,
          newFans: pageMetricsData.pageFansAdds,
          lostFans: pageMetricsData.pageFansRemoves,
          engagement: pageMetricsData.pageEngagedUsers,
          reach: totalReach,
          impressions: pageMetricsData.pageImpressions,
        },
        posts: {
          totalPosts: posts.length,
          totalReach,
          totalEngagement,
          avgEngagementRate,
          topPosts: posts.slice(0, 5),
        },
        audience: demographics,
        bestPostingTimes: [], // Would need historical analysis to calculate
      };

      const transformedData: TransformedMetaData = {
        pageMetrics: pageMetricsData,
        posts,
        analytics,
        audienceDemographics: demographics,
        totalEngagement,
        avgEngagementRate,
        topPerformingContent,
      };

      return {
        success: true,
        data: transformedData,
        error: undefined,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const errorResult = this.handleError(error);
      return {
        success: false,
        data: undefined,
        error: errorResult,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Helper method to make API requests
   */
  private async makeApiRequest(
    endpoint: string,
    options?: RequestInit
  ): Promise<any> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, options);
    const data = await response.json() as any;
    
    // Check for Facebook API errors
    if (data.error) {
      throw data.error;
    }
    
    return data;
  }

  /**
   * Parse Meta API errors
   */
  private parseError(error: any): ConnectorError {
    const connectorError: ConnectorError = {
      code: 'UNKNOWN',
      message: 'Unknown error occurred',
      timestamp: new Date(),
      retryable: false,
    };

    if (error) {
      connectorError.message = error.message || connectorError.message;
      
      // Map Facebook error codes
      switch (error.code) {
        case 190:
          connectorError.code = 'AUTH_FAILED';
          connectorError.message = 'Invalid access token';
          break;
        case 32:
        case 4:
        case 17:
          connectorError.code = 'RATE_LIMIT';
          connectorError.message = 'Rate limit exceeded';
          connectorError.retryable = true;
          break;
        case 1:
        case 2:
          connectorError.code = 'NETWORK_ERROR';
          connectorError.retryable = true;
          break;
        default:
          connectorError.code = 'API_ERROR';
      }
      
      connectorError.details = error;
    }

    return connectorError;
  }

  /**
   * Override handleError to parse Meta-specific errors
   */
  protected handleError(error: unknown, context?: string): ConnectorError {
    // Check if it's a Facebook API error
    if (typeof error === 'object' && error !== null && 'message' in error && 'code' in error) {
      return this.parseError(error as any);
    }
    
    // Check for Zod validation errors
    if (error instanceof z.ZodError) {
      return {
        code: 'INVALID_RESPONSE',
        message: 'Invalid response format from Meta API',
        service: this.serviceName,
        timestamp: new Date(),
        details: error.errors,
        retryable: false,
      } as ConnectorError;
    }
    
    // Use base class error handling
    return super.handleError(error, context || 'unknown');
  }
}