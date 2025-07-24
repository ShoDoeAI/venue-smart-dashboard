import { z } from 'zod';

/**
 * Meta Business Suite (Facebook/Instagram) Zod Schemas
 */

// Insight value schema
export const insightValueSchema = z.object({
  value: z.union([z.number(), z.record(z.any())]),
  endTime: z.string().optional(),
});

// Page insights schema
export const metaPageInsightsSchema = z.object({
  id: z.string(),
  name: z.string(),
  period: z.enum(['day', 'week', 'days_28', 'lifetime']),
  values: z.array(insightValueSchema),
  title: z.string(),
  description: z.string(),
});

// Page metrics schema
export const metaPageMetricsSchema = z.object({
  pageViews: z.number().int().min(0),
  pageFans: z.number().int().min(0),
  pageFansAdds: z.number().int().min(0),
  pageFansRemoves: z.number().int().min(0),
  pageImpressions: z.number().int().min(0),
  pageEngagedUsers: z.number().int().min(0),
  pagePostEngagements: z.number().int().min(0),
  pageVideoViews: z.number().int().min(0),
  pageVideoCompleteViews: z.number().int().min(0),
  pageCTAClicks: z.number().int().min(0),
});

// Reactions schema
export const metaReactionsSchema = z.object({
  like: z.number().int().min(0),
  love: z.number().int().min(0),
  wow: z.number().int().min(0),
  haha: z.number().int().min(0),
  sad: z.number().int().min(0),
  angry: z.number().int().min(0),
  total: z.number().int().min(0),
});

// Comments schema
export const metaCommentsSchema = z.object({
  count: z.number().int().min(0),
  data: z.array(z.object({
    id: z.string(),
    message: z.string(),
    createdTime: z.string(),
    from: z.object({
      id: z.string(),
      name: z.string(),
    }),
  })).optional(),
});

// Post insights schema
export const metaPostInsightsSchema = z.object({
  impressions: z.number().int().min(0),
  reach: z.number().int().min(0),
  engagement: z.number().int().min(0),
  reactions: z.number().int().min(0),
  comments: z.number().int().min(0),
  shares: z.number().int().min(0),
  clicks: z.number().int().min(0),
  videoViews: z.number().int().min(0).optional(),
  videoCompleteViews: z.number().int().min(0).optional(),
});

// Post schema
export const metaPostSchema = z.object({
  id: z.string(),
  message: z.string().optional(),
  createdTime: z.string(),
  updatedTime: z.string().optional(),
  type: z.enum(['link', 'status', 'photo', 'video', 'offer']),
  permalink: z.string().url().optional(),
  insights: metaPostInsightsSchema.optional(),
  reactions: metaReactionsSchema.optional(),
  comments: metaCommentsSchema.optional(),
  shares: z.object({ count: z.number().int().min(0) }).optional(),
});

// Audience demographics schema
export const metaAudienceDemographicsSchema = z.object({
  ageGenderDistribution: z.record(z.number()),
  countryDistribution: z.record(z.number()),
  cityDistribution: z.record(z.number()),
  languageDistribution: z.record(z.number()),
  fansByLikeSource: z.record(z.number()),
});

// Ad insights schema
export const metaAdInsightsSchema = z.object({
  campaignId: z.string().optional(),
  campaignName: z.string().optional(),
  impressions: z.number().int().min(0),
  reach: z.number().int().min(0),
  clicks: z.number().int().min(0),
  spend: z.number().min(0),
  cpm: z.number().min(0),
  cpc: z.number().min(0),
  ctr: z.number().min(0).max(100),
  conversions: z.number().int().min(0).optional(),
  conversionValue: z.number().min(0).optional(),
  roas: z.number().min(0).optional(),
});

// Video insights schema
export const metaVideoInsightsSchema = z.object({
  videoId: z.string(),
  title: z.string().optional(),
  views: z.number().int().min(0),
  uniqueViews: z.number().int().min(0),
  averageWatchTime: z.number().min(0),
  totalWatchTime: z.number().min(0),
  completionRate: z.number().min(0).max(100),
  retention: z.record(z.number()),
});

// Stories insights schema
export const metaStoriesInsightsSchema = z.object({
  impressions: z.number().int().min(0),
  reach: z.number().int().min(0),
  exits: z.number().int().min(0),
  replies: z.number().int().min(0),
  linkClicks: z.number().int().min(0),
  completionRate: z.number().min(0).max(100),
});

// Analytics schema
export const metaAnalyticsSchema = z.object({
  dateRange: z.object({
    start: z.string(),
    end: z.string(),
  }),
  page: z.object({
    fans: z.number().int().min(0),
    newFans: z.number().int().min(0),
    lostFans: z.number().int().min(0),
    engagement: z.number().int().min(0),
    reach: z.number().int().min(0),
    impressions: z.number().int().min(0),
  }),
  posts: z.object({
    totalPosts: z.number().int().min(0),
    totalReach: z.number().int().min(0),
    totalEngagement: z.number().int().min(0),
    avgEngagementRate: z.number().min(0).max(100),
    topPosts: z.array(metaPostSchema),
  }),
  audience: metaAudienceDemographicsSchema,
  bestPostingTimes: z.array(z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    hour: z.number().int().min(0).max(23),
    engagementRate: z.number().min(0).max(100),
  })),
});

// API Response schema
export const metaApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: dataSchema,
    paging: z.object({
      cursors: z.object({
        before: z.string(),
        after: z.string(),
      }).optional(),
      next: z.string().optional(),
      previous: z.string().optional(),
    }).optional(),
    error: z.object({
      message: z.string(),
      type: z.string(),
      code: z.number(),
      errorSubcode: z.number().optional(),
      fbtraceId: z.string().optional(),
    }).optional(),
  });

// Graph API single object response
export const metaGraphObjectSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.intersection(
    dataSchema,
    z.object({
      error: z.object({
        message: z.string(),
        type: z.string(),
        code: z.number(),
        errorSubcode: z.number().optional(),
        fbtraceId: z.string().optional(),
      }).optional(),
    })
  );

// Transformed data schema
export const transformedMetaDataSchema = z.object({
  pageMetrics: metaPageMetricsSchema,
  posts: z.array(metaPostSchema),
  analytics: metaAnalyticsSchema,
  audienceDemographics: metaAudienceDemographicsSchema,
  totalEngagement: z.number().int().min(0),
  avgEngagementRate: z.number().min(0).max(100),
  topPerformingContent: z.array(z.object({
    postId: z.string(),
    message: z.string().optional(),
    engagement: z.number().int().min(0),
    reach: z.number().int().min(0),
  })),
});