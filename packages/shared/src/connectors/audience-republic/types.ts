/**
 * Audience Republic API Types
 * 
 * Note: This is a placeholder implementation based on common marketing platform patterns.
 * Contact support@audiencerepublic.com for official API documentation and access.
 */

export interface AudienceRepublicConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

export interface AudienceRepublicCredentials {
  apiKey: string;
}

// Campaign types
export interface AudienceRepublicCampaign {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'push' | 'gamified';
  status: 'draft' | 'scheduled' | 'active' | 'completed' | 'paused';
  createdAt: string;
  updatedAt: string;
  scheduledFor?: string;
  completedAt?: string;
  stats: CampaignStats;
  audience: CampaignAudience;
  content: CampaignContent;
}

export interface CampaignStats {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  converted: number;
  revenue: number;
  bounced: number;
  unsubscribed: number;
}

export interface CampaignAudience {
  segmentId?: string;
  segmentName?: string;
  totalRecipients: number;
  filters?: AudienceFilter[];
}

export interface AudienceFilter {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: string | number | string[];
}

export interface CampaignContent {
  subject?: string;
  previewText?: string;
  body?: string;
  smsMessage?: string;
  pushTitle?: string;
  pushMessage?: string;
  ctaUrl?: string;
  ctaText?: string;
}

// Contact types
export interface AudienceRepublicContact {
  id: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  tags: string[];
  customFields: Record<string, any>;
  subscriptions: ContactSubscription[];
  engagement: ContactEngagement;
  createdAt: string;
  updatedAt: string;
}

export interface ContactSubscription {
  channel: 'email' | 'sms' | 'push';
  status: 'subscribed' | 'unsubscribed' | 'pending';
  subscribedAt?: string;
  unsubscribedAt?: string;
}

export interface ContactEngagement {
  lastOpenedAt?: string;
  lastClickedAt?: string;
  totalOpens: number;
  totalClicks: number;
  totalPurchases: number;
  totalRevenue: number;
  engagementScore: number;
}

// Event integration types
export interface AudienceRepublicEvent {
  id: string;
  externalId: string;
  name: string;
  date: string;
  venue: string;
  ticketingPlatform: string;
  syncedAt: string;
  stats: EventStats;
}

export interface EventStats {
  totalTicketsSold: number;
  totalRevenue: number;
  uniqueCustomers: number;
  averageOrderValue: number;
}

// List/Segment types
export interface AudienceRepublicSegment {
  id: string;
  name: string;
  type: 'static' | 'dynamic';
  contactCount: number;
  createdAt: string;
  updatedAt: string;
  lastCalculatedAt?: string;
  rules?: SegmentRule[];
}

export interface SegmentRule {
  field: string;
  operator: string;
  value: string | number | boolean;
  logicalOperator?: 'AND' | 'OR';
}

// Analytics types
export interface AudienceRepublicAnalytics {
  dateRange: {
    start: string;
    end: string;
  };
  overview: {
    totalCampaigns: number;
    totalContacts: number;
    totalRevenue: number;
    avgEngagementRate: number;
  };
  campaigns: CampaignAnalytics[];
  channels: ChannelAnalytics[];
}

export interface CampaignAnalytics {
  campaignId: string;
  campaignName: string;
  metrics: {
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    conversionRate: number;
    revenue: number;
    roi: number;
  };
}

export interface ChannelAnalytics {
  channel: 'email' | 'sms' | 'push';
  sent: number;
  delivered: number;
  engaged: number;
  revenue: number;
}

// Webhook types
export interface AudienceRepublicWebhook {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  createdAt: string;
  lastTriggeredAt?: string;
}

export interface WebhookEvent {
  id: string;
  type: string;
  data: Record<string, any>;
  createdAt: string;
}

// API Response types
export interface AudienceRepublicApiResponse<T> {
  data: T;
  meta?: {
    page?: number;
    perPage?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface AudienceRepublicError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// Transform to VenueSync transaction format
export interface TransformedAudienceRepublicData {
  campaigns: AudienceRepublicCampaign[];
  contacts: AudienceRepublicContact[];
  events: AudienceRepublicEvent[];
  analytics: AudienceRepublicAnalytics;
  totalRevenue: number;
  totalContacts: number;
  engagementRate: number;
}