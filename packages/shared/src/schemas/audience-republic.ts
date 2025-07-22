import { z } from 'zod';

/**
 * Audience Republic Zod Schemas
 * 
 * Note: This is a placeholder implementation based on common marketing platform patterns.
 * Contact support@audiencerepublic.com for official API documentation.
 */

// Campaign schemas
export const campaignStatsSchema = z.object({
  sent: z.number().int().min(0),
  delivered: z.number().int().min(0),
  opened: z.number().int().min(0),
  clicked: z.number().int().min(0),
  converted: z.number().int().min(0),
  revenue: z.number().min(0),
  bounced: z.number().int().min(0),
  unsubscribed: z.number().int().min(0),
});

export const audienceFilterSchema = z.object({
  field: z.string(),
  operator: z.enum(['equals', 'contains', 'greater_than', 'less_than', 'in', 'not_in']),
  value: z.union([z.string(), z.number(), z.array(z.string())]),
});

export const campaignAudienceSchema = z.object({
  segmentId: z.string().optional(),
  segmentName: z.string().optional(),
  totalRecipients: z.number().int().min(0),
  filters: z.array(audienceFilterSchema).optional(),
});

export const campaignContentSchema = z.object({
  subject: z.string().optional(),
  previewText: z.string().optional(),
  body: z.string().optional(),
  smsMessage: z.string().optional(),
  pushTitle: z.string().optional(),
  pushMessage: z.string().optional(),
  ctaUrl: z.string().url().optional(),
  ctaText: z.string().optional(),
});

export const audienceRepublicCampaignSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['email', 'sms', 'push', 'gamified']),
  status: z.enum(['draft', 'scheduled', 'active', 'completed', 'paused']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  scheduledFor: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  stats: campaignStatsSchema,
  audience: campaignAudienceSchema,
  content: campaignContentSchema,
});

// Contact schemas
export const contactSubscriptionSchema = z.object({
  channel: z.enum(['email', 'sms', 'push']),
  status: z.enum(['subscribed', 'unsubscribed', 'pending']),
  subscribedAt: z.string().datetime().optional(),
  unsubscribedAt: z.string().datetime().optional(),
});

export const contactEngagementSchema = z.object({
  lastOpenedAt: z.string().datetime().optional(),
  lastClickedAt: z.string().datetime().optional(),
  totalOpens: z.number().int().min(0),
  totalClicks: z.number().int().min(0),
  totalPurchases: z.number().int().min(0),
  totalRevenue: z.number().min(0),
  engagementScore: z.number().min(0).max(100),
});

export const audienceRepublicContactSchema = z.object({
  id: z.string(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  tags: z.array(z.string()),
  customFields: z.record(z.unknown()),
  subscriptions: z.array(contactSubscriptionSchema),
  engagement: contactEngagementSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Event schemas
export const eventStatsSchema = z.object({
  totalTicketsSold: z.number().int().min(0),
  totalRevenue: z.number().min(0),
  uniqueCustomers: z.number().int().min(0),
  averageOrderValue: z.number().min(0),
});

export const audienceRepublicEventSchema = z.object({
  id: z.string(),
  externalId: z.string(),
  name: z.string(),
  date: z.string().datetime(),
  venue: z.string(),
  ticketingPlatform: z.string(),
  syncedAt: z.string().datetime(),
  stats: eventStatsSchema,
});

// Segment schemas
export const segmentRuleSchema = z.object({
  field: z.string(),
  operator: z.string(),
  value: z.union([z.string(), z.number(), z.boolean()]),
  logicalOperator: z.enum(['AND', 'OR']).optional(),
});

export const audienceRepublicSegmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['static', 'dynamic']),
  contactCount: z.number().int().min(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastCalculatedAt: z.string().datetime().optional(),
  rules: z.array(segmentRuleSchema).optional(),
});

// Analytics schemas
export const campaignAnalyticsSchema = z.object({
  campaignId: z.string(),
  campaignName: z.string(),
  metrics: z.object({
    deliveryRate: z.number().min(0).max(100),
    openRate: z.number().min(0).max(100),
    clickRate: z.number().min(0).max(100),
    conversionRate: z.number().min(0).max(100),
    revenue: z.number().min(0),
    roi: z.number(),
  }),
});

export const channelAnalyticsSchema = z.object({
  channel: z.enum(['email', 'sms', 'push']),
  sent: z.number().int().min(0),
  delivered: z.number().int().min(0),
  engaged: z.number().int().min(0),
  revenue: z.number().min(0),
});

export const audienceRepublicAnalyticsSchema = z.object({
  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
  overview: z.object({
    totalCampaigns: z.number().int().min(0),
    totalContacts: z.number().int().min(0),
    totalRevenue: z.number().min(0),
    avgEngagementRate: z.number().min(0).max(100),
  }),
  campaigns: z.array(campaignAnalyticsSchema),
  channels: z.array(channelAnalyticsSchema),
});

// Webhook schemas
export const audienceRepublicWebhookSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  events: z.array(z.string()),
  active: z.boolean(),
  createdAt: z.string().datetime(),
  lastTriggeredAt: z.string().datetime().optional(),
});

export const webhookEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.record(z.unknown()),
  createdAt: z.string().datetime(),
});

// API Response schemas
export const audienceRepublicApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: dataSchema,
    meta: z
      .object({
        page: z.number().int().positive().optional(),
        perPage: z.number().int().positive().optional(),
        total: z.number().int().min(0).optional(),
        totalPages: z.number().int().min(0).optional(),
      })
      .optional(),
  });

export const audienceRepublicErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
});

// Transformed data schema
export const transformedAudienceRepublicDataSchema = z.object({
  campaigns: z.array(audienceRepublicCampaignSchema),
  contacts: z.array(audienceRepublicContactSchema),
  events: z.array(audienceRepublicEventSchema),
  analytics: audienceRepublicAnalyticsSchema,
  totalRevenue: z.number().min(0),
  totalContacts: z.number().int().min(0),
  engagementRate: z.number().min(0).max(100),
});