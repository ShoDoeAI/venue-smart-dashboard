/**
 * Meta Business Suite (Facebook/Instagram) API Types
 * 
 * Integrates with Facebook Graph API for page insights, post performance,
 * and audience analytics.
 */

export interface MetaConfig {
  accessToken: string;
  pageId: string;
  baseUrl?: string;
  apiVersion?: string;
  timeout?: number;
}

export interface MetaCredentials {
  accessToken: string;
  pageId: string;
}

// Page Insights types
export interface MetaPageInsights {
  id: string;
  name: string;
  period: 'day' | 'week' | 'days_28' | 'lifetime';
  values: InsightValue[];
  title: string;
  description: string;
}

export interface InsightValue {
  value: number | Record<string, any>;
  endTime?: string;
}

// Page metrics
export interface MetaPageMetrics {
  pageViews: number;
  pageFans: number;
  pageFansAdds: number;
  pageFansRemoves: number;
  pageImpressions: number;
  pageEngagedUsers: number;
  pagePostEngagements: number;
  pageVideoViews: number;
  pageVideoCompleteViews: number;
  pageCTAClicks: number;
}

// Post types
export interface MetaPost {
  id: string;
  message?: string;
  createdTime: string;
  updatedTime?: string;
  type: 'link' | 'status' | 'photo' | 'video' | 'offer';
  permalink?: string;
  insights?: MetaPostInsights;
  reactions?: MetaReactions;
  comments?: MetaComments;
  shares?: { count: number };
}

export interface MetaPostInsights {
  impressions: number;
  reach: number;
  engagement: number;
  reactions: number;
  comments: number;
  shares: number;
  clicks: number;
  videoViews?: number;
  videoCompleteViews?: number;
}

export interface MetaReactions {
  like: number;
  love: number;
  wow: number;
  haha: number;
  sad: number;
  angry: number;
  total: number;
}

export interface MetaComments {
  count: number;
  data?: Array<{
    id: string;
    message: string;
    createdTime: string;
    from: {
      id: string;
      name: string;
    };
  }>;
}

// Audience Demographics
export interface MetaAudienceDemographics {
  ageGenderDistribution: Record<string, number>;
  countryDistribution: Record<string, number>;
  cityDistribution: Record<string, number>;
  languageDistribution: Record<string, number>;
  fansByLikeSource: Record<string, number>;
}

// Ad Insights (if running ads)
export interface MetaAdInsights {
  campaignId?: string;
  campaignName?: string;
  impressions: number;
  reach: number;
  clicks: number;
  spend: number;
  cpm: number;
  cpc: number;
  ctr: number;
  conversions?: number;
  conversionValue?: number;
  roas?: number;
}

// Video Insights
export interface MetaVideoInsights {
  videoId: string;
  title?: string;
  views: number;
  uniqueViews: number;
  averageWatchTime: number;
  totalWatchTime: number;
  completionRate: number;
  retention: Record<string, number>; // percentage -> retention rate
}

// Stories Insights
export interface MetaStoriesInsights {
  impressions: number;
  reach: number;
  exits: number;
  replies: number;
  linkClicks: number;
  completionRate: number;
}

// Aggregated Analytics
export interface MetaAnalytics {
  dateRange: {
    start: string;
    end: string;
  };
  page: {
    fans: number;
    newFans: number;
    lostFans: number;
    engagement: number;
    reach: number;
    impressions: number;
  };
  posts: {
    totalPosts: number;
    totalReach: number;
    totalEngagement: number;
    avgEngagementRate: number;
    topPosts: MetaPost[];
  };
  audience: MetaAudienceDemographics;
  bestPostingTimes: Array<{
    dayOfWeek: number;
    hour: number;
    engagementRate: number;
  }>;
}

// API Response types
export interface MetaApiResponse<T> {
  data: T;
  paging?: {
    cursors?: {
      before: string;
      after: string;
    };
    next?: string;
    previous?: string;
  };
  error?: MetaError;
}

export interface MetaError {
  message: string;
  type: string;
  code: number;
  errorSubcode?: number;
  fbtraceId?: string;
}

// Transform to VenueSync format
export interface TransformedMetaData {
  pageMetrics: MetaPageMetrics;
  posts: MetaPost[];
  analytics: MetaAnalytics;
  audienceDemographics: MetaAudienceDemographics;
  totalEngagement: number;
  avgEngagementRate: number;
  topPerformingContent: Array<{
    postId: string;
    message?: string;
    engagement: number;
    reach: number;
  }>;
}