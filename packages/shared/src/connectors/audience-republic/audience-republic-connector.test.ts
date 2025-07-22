import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AudienceRepublicConnector } from './audience-republic-connector';
import type { ConnectorConfig } from '../../types/connector';
import type { AudienceRepublicCredentials } from './types';

// Mock fetch
global.fetch = vi.fn();

describe('AudienceRepublicConnector', () => {
  let connector: AudienceRepublicConnector;
  const mockConfig: ConnectorConfig<AudienceRepublicCredentials> = {
    credentials: {
      apiKey: 'test-api-key',
    },
    options: {
      timeout: 5000,
      retryAttempts: 0, // Disable retries for tests
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset circuit breaker state
    vi.useFakeTimers();
    connector = new AudienceRepublicConnector(mockConfig);
    vi.runAllTimers();
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should initialize with correct service name', () => {
      expect(connector.serviceName).toBe('AudienceRepublic');
    });
  });

  describe('validateCredentials', () => {
    it('should return true for valid credentials', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ account: { id: '123', name: 'Test Venue' } }),
      });

      const result = await connector.validateCredentials();
      expect(result).toBe(true);
    });

    it('should return false for invalid credentials', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const result = await connector.validateCredentials();
      expect(result).toBe(false);
    });
  });

  describe('testConnection', () => {
    it('should return success for working connection', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'ok', service: 'AudienceRepublic' }),
      });

      const result = await connector.testConnection();
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ status: 'ok', service: 'AudienceRepublic' });
    });
  });

  describe('fetchCampaigns', () => {
    it('should fetch and parse campaigns correctly', async () => {
      const mockCampaigns = {
        data: [
          {
            id: 'camp-1',
            name: 'Summer Festival Promo',
            type: 'email',
            status: 'completed',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-15T00:00:00Z',
            stats: {
              sent: 1000,
              delivered: 950,
              opened: 400,
              clicked: 100,
              converted: 50,
              revenue: 2500,
              bounced: 50,
              unsubscribed: 5,
            },
            audience: {
              totalRecipients: 1000,
            },
            content: {
              subject: 'Get Your Summer Festival Tickets!',
            },
          },
        ],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCampaigns,
      });

      const result = await connector.fetchCampaigns();
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].name).toBe('Summer Festival Promo');
      expect(result.data?.[0].stats.revenue).toBe(2500);
    });

    it('should handle date range parameters', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      await connector.fetchCampaigns(startDate, endDate);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('start_date=2024-01-01'),
        expect.any(Object)
      );
    });
  });

  describe('fetchContacts', () => {
    it('should fetch and parse contacts correctly', async () => {
      const mockContacts = {
        data: [
          {
            id: 'contact-1',
            email: 'john@example.com',
            firstName: 'John',
            lastName: 'Doe',
            tags: ['vip', 'frequent'],
            customFields: {},
            subscriptions: [
              {
                channel: 'email',
                status: 'subscribed',
                subscribedAt: '2023-01-01T00:00:00Z',
              },
            ],
            engagement: {
              totalOpens: 25,
              totalClicks: 10,
              totalPurchases: 3,
              totalRevenue: 450,
              engagementScore: 85,
            },
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: '2024-01-15T00:00:00Z',
          },
        ],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockContacts,
      });

      const result = await connector.fetchContacts();
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].email).toBe('john@example.com');
      expect(result.data?.[0].engagement.engagementScore).toBe(85);
    });
  });

  describe('fetchEvents', () => {
    it('should fetch and parse events correctly', async () => {
      const mockEvents = {
        data: [
          {
            id: 'event-1',
            externalId: 'eb-12345',
            name: 'Summer Music Festival',
            date: '2024-07-15T18:00:00Z',
            venue: 'Central Park',
            ticketingPlatform: 'Eventbrite',
            syncedAt: '2024-01-01T00:00:00Z',
            stats: {
              totalTicketsSold: 500,
              totalRevenue: 25000,
              uniqueCustomers: 450,
              averageOrderValue: 50,
            },
          },
        ],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockEvents,
      });

      const result = await connector.fetchEvents();
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].name).toBe('Summer Music Festival');
      expect(result.data?.[0].stats.totalRevenue).toBe(25000);
    });
  });

  describe('fetchAnalytics', () => {
    it('should fetch and parse analytics correctly', async () => {
      const mockAnalytics = {
        dateRange: {
          start: '2024-01-01T00:00:00Z',
          end: '2024-01-31T00:00:00Z',
        },
        overview: {
          totalCampaigns: 10,
          totalContacts: 5000,
          totalRevenue: 50000,
          avgEngagementRate: 25.5,
        },
        campaigns: [],
        channels: [
          {
            channel: 'email',
            sent: 10000,
            delivered: 9500,
            engaged: 2500,
            revenue: 45000,
          },
          {
            channel: 'sms',
            sent: 2000,
            delivered: 1950,
            engaged: 500,
            revenue: 5000,
          },
        ],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalytics,
      });

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const result = await connector.fetchAnalytics(startDate, endDate);
      
      expect(result.success).toBe(true);
      expect(result.data?.overview.totalRevenue).toBe(50000);
      expect(result.data?.channels).toHaveLength(2);
    });
  });

  describe('fetchAllData', () => {
    it('should fetch all data and calculate aggregate metrics', async () => {
      // Mock all API responses
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [
              {
                id: 'camp-1',
                name: 'Campaign 1',
                type: 'email',
                status: 'completed',
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-15T00:00:00Z',
                stats: {
                  sent: 1000,
                  delivered: 950,
                  opened: 400,
                  clicked: 100,
                  converted: 50,
                  revenue: 2500,
                  bounced: 50,
                  unsubscribed: 5,
                },
                audience: { totalRecipients: 1000 },
                content: {},
              },
            ],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [
              {
                id: 'contact-1',
                email: 'test@example.com',
                tags: [],
                customFields: {},
                subscriptions: [],
                engagement: {
                  totalOpens: 10,
                  totalClicks: 5,
                  totalPurchases: 1,
                  totalRevenue: 100,
                  engagementScore: 75,
                },
                createdAt: '2023-01-01T00:00:00Z',
                updatedAt: '2024-01-15T00:00:00Z',
              },
            ],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            dateRange: {
              start: '2024-01-01T00:00:00Z',
              end: '2024-01-31T00:00:00Z',
            },
            overview: {
              totalCampaigns: 1,
              totalContacts: 1,
              totalRevenue: 2500,
              avgEngagementRate: 100,
            },
            campaigns: [],
            channels: [],
          }),
        });

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const result = await connector.fetchAllData(startDate, endDate);

      expect(result.success).toBe(true);
      expect(result.data?.totalRevenue).toBe(2500);
      expect(result.data?.totalContacts).toBe(1);
      expect(result.data?.engagementRate).toBe(100);
    });

    it('should handle partial failures', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        });

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const result = await connector.fetchAllData(startDate, endDate);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await connector.fetchCampaigns();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Network error');
    });

    it('should handle invalid response format', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: 'response' }),
      });

      const result = await connector.fetchCampaigns();
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_RESPONSE');
    });
  });
});