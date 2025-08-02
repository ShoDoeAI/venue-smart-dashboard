import axios from 'axios';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { 
  createMockSupabaseClient, 
  createMockCredentials, 
  createMockConfig
} from '../test-utils';

import { OpenDateConnector } from './opendate-connector';
import type { 
  OpenDateArtist, 
  OpenDateConfirm, 
  OpenDateOrder,
  OpenDateTicket,
  OpenDateFan,
  OpenDateVenue,
  OpenDateSettlement,
  OpenDateAnalytics
} from './types';

vi.mock('axios', () => ({
  default: {
    create: vi.fn(),
    post: vi.fn(),
    isAxiosError: vi.fn(),
  },
}));

describe('OpenDateConnector', () => {
  let connector: OpenDateConnector;
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  let mockAxiosInstance: any;
  let responseInterceptorError: any;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    
    mockAxiosInstance = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      request: vi.fn(),
      defaults: {
        headers: {},
      },
      interceptors: {
        request: {
          use: vi.fn(),
        },
        response: {
          use: vi.fn((_success, error) => {
            responseInterceptorError = error;
          }),
        },
      },
    };
    
    (axios.create as any).mockReturnValue(mockAxiosInstance);
    
    const credentials = createMockCredentials('opendate', {
      credentials: {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        environment: 'production',
      },
    });
    
    connector = new OpenDateConnector(
      credentials,
      createMockConfig(),
      mockSupabase
    );
  });

  describe('constructor', () => {
    it('should initialize with correct base URL', () => {
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://api.opendate.io/v1',
        })
      );
    });

    it('should set authorization header with access token', () => {
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-access-token',
          }),
        })
      );
    });

    it('should set up request and response interceptors', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('testConnection', () => {
    it('should successfully test connection', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { 
          data: [{ id: 'venue1', name: 'Test Venue' }],
          success: true 
        },
        status: 200,
      });

      const result = await connector.testConnection();

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/venues');
    });

    it('should handle connection errors', async () => {
      mockAxiosInstance.get.mockRejectedValueOnce(new Error('Unauthorized'));

      const result = await connector.testConnection();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('fetchArtists', () => {
    it('should fetch artists with correct parameters', async () => {
      const mockArtists: OpenDateArtist[] = [{
        id: 'artist123',
        name: 'The Test Band',
        bio: 'An amazing test band',
        genre: 'Rock',
        website: 'https://testband.com',
        social_media: {
          facebook: 'https://facebook.com/testband',
          instagram: 'https://instagram.com/testband',
        },
        image_url: 'https://example.com/image.jpg',
        contact_email: 'booking@testband.com',
        contact_phone: '+1234567890',
        booking_fee: 5000,
        tech_rider: 'Standard PA system required',
        hospitality_rider: 'Water and snacks',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        is_active: true,
      }];

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          data: mockArtists,
          pagination: {
            page: 1,
            per_page: 100,
            total: 1,
            total_pages: 1,
            has_next: false,
            has_prev: false,
          },
        },
      });

      const result = await connector.fetchArtists();

      expect(result.success).toBe(true);
      expect(result.data?.data).toEqual(mockArtists);
      expect(result.data?.hasMore).toBe(false);
      expect(result.data?.total).toBe(1);
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/artists',
        {
          params: { per_page: 100 },
        }
      );
    });
  });

  describe('fetchConfirms', () => {
    it('should fetch confirms (events/shows) with correct parameters', async () => {
      const mockConfirms: OpenDateConfirm[] = [{
        id: 'confirm123',
        venue_id: 'venue123',
        venue_name: 'The Music Hall',
        artist_id: 'artist123',
        artist_name: 'The Test Band',
        show_date: '2024-06-01T19:00:00Z',
        show_time: '19:00',
        doors_time: '18:00',
        end_time: '22:00',
        status: 'confirmed',
        show_type: 'concert',
        capacity: 500,
        tickets_sold: 350,
        tickets_available: 150,
        ticket_sales_start: '2024-05-01T00:00:00Z',
        ticket_sales_end: '2024-06-01T18:00:00Z',
        guarantee: 3000,
        door_split: 80,
        bar_split: 20,
        merchandise_split: 85,
        total_gross: 10000,
        venue_expenses: 2000,
        artist_payout: 6000,
        venue_profit: 2000,
        age_restriction: '21+',
        description: 'An amazing night of rock music',
        promotional_text: 'Don\'t miss this show!',
        event_url: 'https://example.com/event',
        image_url: 'https://example.com/poster.jpg',
        sound_check_time: '16:00',
        load_in_time: '15:00',
        load_out_time: '23:00',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 'user123',
      }];

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          data: mockConfirms,
          pagination: {
            page: 1,
            per_page: 100,
            total: 1,
            total_pages: 1,
            has_next: false,
            has_prev: false,
          },
        },
      });

      const filters = {
        venue_id: 'venue123',
        start_date: '2024-06-01T00:00:00Z',
        end_date: '2024-06-30T23:59:59Z',
      };

      const result = await connector.fetchConfirms(filters);

      expect(result.success).toBe(true);
      expect(result.data?.data).toEqual(mockConfirms);
      expect(result.data?.hasMore).toBe(false);
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/confirms',
        {
          params: {
            per_page: 100,
            venue_id: 'venue123',
            start_date: '2024-06-01T00:00:00Z',
            end_date: '2024-06-30T23:59:59Z',
          },
        }
      );
    });
  });

  describe('fetchOrders', () => {
    it('should fetch orders with correct parameters', async () => {
      const mockTickets: OpenDateTicket[] = [{
        id: 'ticket123',
        ticket_type_id: 'type123',
        ticket_type_name: 'General Admission',
        order_id: 'order123',
        confirm_id: 'confirm123',
        barcode: 'BAR123456',
        qr_code: 'QR123456',
        status: 'valid',
        price: 25.00,
        fee: 3.50,
        total_price: 28.50,
        purchased_at: '2024-05-15T10:00:00Z',
        guest_name: 'John Doe',
        guest_email: 'john@example.com',
        guest_phone: '+1234567890',
        created_at: '2024-05-15T10:00:00Z',
        updated_at: '2024-05-15T10:00:00Z',
      }];

      const mockOrders: OpenDateOrder[] = [{
        id: 'order123',
        confirm_id: 'confirm123',
        customer_id: 'customer123',
        order_number: 'ORD-2024-001',
        status: 'completed',
        payment_status: 'paid',
        payment_method: 'card',
        customer_first_name: 'John',
        customer_last_name: 'Doe',
        customer_email: 'john@example.com',
        customer_phone: '+1234567890',
        subtotal: 50.00,
        fees: 7.00,
        taxes: 4.50,
        total: 61.50,
        amount_paid: 61.50,
        amount_refunded: 0,
        tickets: mockTickets,
        ticket_count: 2,
        ordered_at: '2024-05-15T10:00:00Z',
        paid_at: '2024-05-15T10:00:00Z',
        created_at: '2024-05-15T10:00:00Z',
        updated_at: '2024-05-15T10:00:00Z',
        source: 'online',
      }];

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          data: mockOrders,
          pagination: {
            page: 1,
            per_page: 100,
            total: 1,
            total_pages: 1,
            has_next: false,
            has_prev: false,
          },
        },
      });

      const filters = {
        confirm_id: 'confirm123',
        status: 'completed',
      };

      const result = await connector.fetchOrders(filters);

      expect(result.success).toBe(true);
      expect(result.data?.data).toEqual(mockOrders);
      expect(result.data?.hasMore).toBe(false);
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/orders',
        {
          params: {
            per_page: 100,
            confirm_id: 'confirm123',
            status: 'completed',
          },
        }
      );
    });
  });

  describe('fetchFans', () => {
    it('should fetch fans with correct parameters', async () => {
      const mockFans: OpenDateFan[] = [{
        id: 'fan123',
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane@example.com',
        phone: '+1234567890',
        date_of_birth: '1990-01-01',
        favorite_genres: ['Rock', 'Alternative'],
        marketing_opt_in: true,
        sms_opt_in: false,
        total_orders: 5,
        total_spent: 250.00,
        first_order_date: '2023-01-01T00:00:00Z',
        last_order_date: '2024-05-15T00:00:00Z',
        average_order_value: 50.00,
        lifetime_value: 250.00,
        shows_attended: 4,
        no_shows: 1,
        cancellations: 0,
        city: 'Los Angeles',
        state: 'CA',
        country: 'USA',
        zip_code: '90001',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2024-05-15T00:00:00Z',
        last_seen_at: '2024-05-15T00:00:00Z',
      }];

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          data: mockFans,
          pagination: {
            page: 1,
            per_page: 100,
            total: 1,
            total_pages: 1,
            has_next: false,
            has_prev: false,
          },
        },
      });

      const filters = {
        city: 'Los Angeles',
        min_spent: 100,
      };

      const result = await connector.fetchFans(filters);

      expect(result.success).toBe(true);
      expect(result.data?.data).toEqual(mockFans);
      expect(result.data?.hasMore).toBe(false);
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/fans',
        {
          params: {
            per_page: 100,
            city: 'Los Angeles',
            min_spent: 100,
          },
        }
      );
    });
  });

  describe('fetchVenues', () => {
    it('should fetch venues with correct parameters', async () => {
      const mockVenues: OpenDateVenue[] = [{
        id: 'venue123',
        name: 'The Music Hall',
        description: 'Premier live music venue',
        capacity: 500,
        address: {
          street: '123 Main St',
          city: 'Los Angeles',
          state: 'CA',
          zip_code: '90001',
          country: 'USA',
        },
        phone: '+1234567890',
        email: 'info@musichall.com',
        website: 'https://musichall.com',
        stage_info: {
          stage_width: 30,
          stage_depth: 20,
          ceiling_height: 25,
          power_available: '200A 3-phase',
          sound_system: 'Meyer Sound MILO',
          lighting_system: 'GrandMA3',
        },
        age_policy: '21+ after 9PM',
        parking_info: 'Valet and street parking available',
        accessibility_info: 'ADA compliant',
        default_door_split: 80,
        default_bar_split: 20,
        default_guarantee: 2000,
        created_at: '2020-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        is_active: true,
      }];

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          data: mockVenues,
          pagination: {
            page: 1,
            per_page: 100,
            total: 1,
            total_pages: 1,
            has_next: false,
            has_prev: false,
          },
        },
      });

      const result = await connector.fetchVenues();

      expect(result.success).toBe(true);
      expect(result.data?.data).toEqual(mockVenues);
      expect(result.data?.hasMore).toBe(false);
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/venues',
        {
          params: { per_page: 100 },
        }
      );
    });
  });

  describe('fetchSettlements', () => {
    it('should fetch settlements with correct parameters', async () => {
      const mockSettlements: OpenDateSettlement[] = [{
        id: 'settlement123',
        confirm_id: 'confirm123',
        venue_id: 'venue123',
        artist_id: 'artist123',
        settlement_date: '2024-06-05T00:00:00Z',
        period_start: '2024-06-01T00:00:00Z',
        period_end: '2024-06-01T23:59:59Z',
        ticket_revenue: 8000,
        bar_revenue: 3000,
        merchandise_revenue: 1000,
        other_revenue: 500,
        total_gross_revenue: 12500,
        venue_expenses: 2000,
        marketing_expenses: 500,
        production_expenses: 1000,
        other_expenses: 200,
        total_expenses: 3700,
        artist_guarantee: 3000,
        artist_door_percentage: 80,
        artist_bar_percentage: 20,
        artist_total_payout: 7000,
        venue_total_profit: 1800,
        payment_status: 'paid',
        payment_method: 'ACH',
        payment_date: '2024-06-10T00:00:00Z',
        payment_reference: 'PAY-2024-001',
        notes: 'Great show, sold out!',
        created_at: '2024-06-05T00:00:00Z',
        updated_at: '2024-06-10T00:00:00Z',
        created_by: 'user123',
      }];

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          data: mockSettlements,
          pagination: {
            page: 1,
            per_page: 100,
            total: 1,
            total_pages: 1,
            has_next: false,
            has_prev: false,
          },
        },
      });

      const result = await connector.fetchSettlements(
        'venue123',
        '2024-06-01T00:00:00Z',
        '2024-06-30T23:59:59Z'
      );

      expect(result.success).toBe(true);
      expect(result.data?.data).toEqual(mockSettlements);
      expect(result.data?.hasMore).toBe(false);
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/settlements',
        {
          params: {
            per_page: 100,
            venue_id: 'venue123',
            start_date: '2024-06-01T00:00:00Z',
            end_date: '2024-06-30T23:59:59Z',
          },
        }
      );
    });
  });

  describe('fetchAnalytics', () => {
    it('should fetch analytics with correct parameters', async () => {
      const mockAnalytics: OpenDateAnalytics = {
        period_start: '2024-01-01T00:00:00Z',
        period_end: '2024-06-30T23:59:59Z',
        venue_id: 'venue123',
        total_events: 50,
        total_capacity: 25000,
        total_tickets_sold: 18000,
        average_attendance_rate: 72,
        sold_out_shows: 8,
        total_revenue: 450000,
        ticket_revenue: 350000,
        bar_revenue: 80000,
        merchandise_revenue: 20000,
        average_revenue_per_show: 9000,
        total_customers: 15000,
        new_customers: 3000,
        returning_customers: 12000,
        average_order_value: 25,
        customer_retention_rate: 80,
        top_artists: [{
          artist_id: 'artist123',
          artist_name: 'The Test Band',
          shows_count: 5,
          total_revenue: 50000,
          average_attendance: 400,
        }],
        top_shows: [{
          confirm_id: 'confirm123',
          artist_name: 'The Test Band',
          show_date: '2024-06-01T19:00:00Z',
          tickets_sold: 500,
          revenue: 15000,
          attendance_rate: 100,
        }],
      };

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          data: mockAnalytics,
        },
      });

      const result = await connector.fetchAnalytics(
        'venue123',
        '2024-01-01T00:00:00Z',
        '2024-06-30T23:59:59Z'
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockAnalytics);
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/analytics/overview',
        {
          params: {
            venue_id: 'venue123',
            start_date: '2024-01-01T00:00:00Z',
            end_date: '2024-06-30T23:59:59Z',
          },
        }
      );
    });
  });

  describe('fetchAllTransactions', () => {
    it('should transform orders to transactions correctly', async () => {
      const mockOrders: OpenDateOrder[] = [{
        id: 'order123',
        confirm_id: 'confirm123',
        customer_id: 'customer123',
        order_number: 'ORD-2024-001',
        status: 'completed',
        payment_status: 'paid',
        payment_method: 'card',
        customer_first_name: 'John',
        customer_last_name: 'Doe',
        customer_email: 'john@example.com',
        subtotal: 50.00,
        fees: 7.00,
        taxes: 4.50,
        total: 61.50,
        amount_paid: 61.50,
        amount_refunded: 0,
        tickets: [{
          id: 'ticket123',
          ticket_type_id: 'type123',
          ticket_type_name: 'General Admission',
          order_id: 'order123',
          confirm_id: 'confirm123',
          barcode: 'BAR123456',
          status: 'valid',
          price: 25.00,
          fee: 3.50,
          total_price: 28.50,
          purchased_at: '2024-05-15T10:00:00Z',
          guest_name: 'John Doe',
          guest_email: 'john@example.com',
          created_at: '2024-05-15T10:00:00Z',
          updated_at: '2024-05-15T10:00:00Z',
        }],
        ticket_count: 1,
        ordered_at: '2024-05-15T10:00:00Z',
        paid_at: '2024-05-15T10:00:00Z',
        created_at: '2024-05-15T10:00:00Z',
        updated_at: '2024-05-15T10:00:00Z',
        source: 'online',
      }];

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          data: mockOrders,
          pagination: {
            page: 1,
            per_page: 100,
            total: 1,
            total_pages: 1,
            has_next: false,
            has_prev: false,
          },
        },
      });

      const result = await connector.fetchAllTransactions();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2); // Order + 1 ticket
      
      const orderTx = result.data![0];
      expect(orderTx.transaction_id).toBe('order_order123');
      expect(orderTx.amount).toBe(61.50);
      expect(orderTx.customer_name).toBe('John Doe');
      expect(orderTx.source).toBe('opendate');

      const ticketTx = result.data![1];
      expect(ticketTx.transaction_id).toBe('ticket_ticket123');
      expect(ticketTx.amount).toBe(28.50);
      expect(ticketTx.ticket_type).toBe('General Admission');
    });
  });

  describe('saveTransactions', () => {
    it('should save transactions to database', async () => {
      const transactions = [{
        transaction_id: 'order_123',
        order_id: 'order123',
        transaction_type: 'ticket_sale' as const,
        amount: 61.50,
        currency: 'USD',
        net_amount: 54.50,
        customer_name: 'John Doe',
        payment_status: 'paid',
        transaction_date: '2024-05-15T10:00:00Z',
        created_at: '2024-05-15T10:00:00Z',
        updated_at: '2024-05-15T10:00:00Z',
        source: 'opendate' as const,
      }];

      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.from = vi.fn().mockReturnValue({
        insert: mockInsert,
      });

      const result = await connector.saveTransactions(transactions, '2024-01-01T00:00:00Z');

      expect(result.success).toBe(true);
      expect(result.data).toBe(1);
      expect(mockSupabase.from).toHaveBeenCalledWith('opendate_transactions');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            transaction_id: 'order_123',
            snapshot_timestamp: '2024-01-01T00:00:00Z',
          }),
        ])
      );
    });

    it('should handle database errors', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ 
        error: { message: 'Database error' }
      });
      mockSupabase.from = vi.fn().mockReturnValue({
        insert: mockInsert,
      });

      const transactions = [{
        transaction_id: 'order_123',
        transaction_type: 'ticket_sale' as const,
        amount: 61.50,
        currency: 'USD',
        net_amount: 54.50,
        payment_status: 'paid',
        transaction_date: '2024-05-15T10:00:00Z',
        created_at: '2024-05-15T10:00:00Z',
        updated_at: '2024-05-15T10:00:00Z',
        source: 'opendate' as const,
      }];
      
      const result = await connector.saveTransactions(transactions, '2024-01-01T00:00:00Z');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('checkInTicket', () => {
    it('should check in a ticket', async () => {
      const mockTicket: OpenDateTicket = {
        id: 'ticket123',
        ticket_type_id: 'type123',
        ticket_type_name: 'General Admission',
        order_id: 'order123',
        confirm_id: 'confirm123',
        barcode: 'BAR123456',
        status: 'used',
        price: 25.00,
        fee: 3.50,
        total_price: 28.50,
        purchased_at: '2024-05-15T10:00:00Z',
        used_at: '2024-06-01T19:30:00Z',
        created_at: '2024-05-15T10:00:00Z',
        updated_at: '2024-06-01T19:30:00Z',
      };

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: mockTicket,
      });

      const result = await connector.checkInTicket('ticket123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTicket);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/tickets/ticket123/checkin');
    });
  });

  describe('OAuth token refresh', () => {
    it('should refresh token on 401 response', async () => {
      // Create a proper 401 error object
      const error401 = {
        response: { 
          status: 401,
          data: { error: 'Unauthorized' }
        },
        config: { 
          url: '/artists',
          headers: {},
          method: 'get'
        },
        isAxiosError: true,
      };

      // Mock the initial request to trigger interceptor
      mockAxiosInstance.get.mockImplementationOnce(() => {
        // Trigger the error interceptor with 401 error
        return responseInterceptorError(error401);
      });

      // Token refresh succeeds
      (axios.post as any).mockResolvedValueOnce({
        data: {
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
        },
      });

      // Retry request succeeds
      mockAxiosInstance.request.mockResolvedValueOnce({
        data: {
          data: [],
          pagination: {
            page: 1,
            per_page: 100,
            total: 0,
            total_pages: 0,
            has_next: false,
            has_prev: false,
          },
        },
      });

      // Make the request
      const result = await connector.fetchArtists();

      // Verify token refresh was called
      expect(axios.post).toHaveBeenCalledWith(
        'https://api.opendate.io/v1/auth/refresh',
        expect.objectContaining({
          refresh_token: 'test-refresh-token',
          client_id: 'test-client-id',
          client_secret: 'test-client-secret',
        })
      );
      
      // Verify authorization header was updated
      expect(mockAxiosInstance.defaults.headers['Authorization']).toBe('Bearer new-access-token');
      
      // Verify retry was attempted
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/artists',
          headers: expect.objectContaining({
            'Authorization': 'Bearer new-access-token'
          })
        })
      );
      
      // Verify result is successful
      expect(result.success).toBe(true);
      expect(result.data?.data).toEqual([]);
    });

    it('should handle token refresh failure', async () => {
      // Create a proper 401 error object
      const error401 = {
        response: { 
          status: 401,
          data: { error: 'Unauthorized' }
        },
        config: { 
          url: '/artists',
          headers: {},
          method: 'get'
        },
        isAxiosError: true,
      };

      // Mock the initial request to trigger interceptor
      mockAxiosInstance.get.mockImplementationOnce(() => {
        // Trigger the error interceptor with 401 error
        return responseInterceptorError(error401);
      });

      // Token refresh fails
      (axios.post as any).mockRejectedValueOnce(new Error('Refresh failed'));

      // Make the request
      const result = await connector.fetchArtists();

      // Verify token refresh was attempted
      expect(axios.post).toHaveBeenCalledWith(
        'https://api.opendate.io/v1/auth/refresh',
        expect.objectContaining({
          refresh_token: 'test-refresh-token',
          client_id: 'test-client-id',
          client_secret: 'test-client-secret',
        })
      );
      
      // Verify request was not retried
      expect(mockAxiosInstance.request).not.toHaveBeenCalled();
      
      // Verify result is failure
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});