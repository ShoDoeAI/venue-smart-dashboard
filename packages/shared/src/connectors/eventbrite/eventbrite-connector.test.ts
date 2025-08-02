import axios from 'axios';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { 
  createMockSupabaseClient, 
  createMockCredentials, 
  createMockConfig
} from '../test-utils';

import { EventbriteConnector } from './eventbrite-connector';
import type { EventbriteEvent, EventbriteAttendee } from './types';

vi.mock('axios', () => ({
  default: {
    create: vi.fn(),
  },
}));

describe('EventbriteConnector', () => {
  let connector: EventbriteConnector;
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  let mockAxiosInstance: any;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    
    mockAxiosInstance = {
      get: vi.fn(),
      post: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: {
          use: vi.fn(),
        },
        response: {
          use: vi.fn(),
        },
      },
    };
    
    (axios.create as any).mockReturnValue(mockAxiosInstance);
    
    const credentials = createMockCredentials('eventbrite', {
      credentials: {
        accessToken: 'test-access-token',
        environment: 'production',
        organizationId: 'test-org-id',
      },
    });
    
    connector = new EventbriteConnector(
      credentials,
      createMockConfig(),
      mockSupabase
    );
  });

  describe('constructor', () => {
    it('should initialize with correct base URL', () => {
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://www.eventbriteapi.com/v3',
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

    it('should set up response interceptor for rate limiting', () => {
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('testConnection', () => {
    it('should successfully test connection', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { id: 'user123', name: 'Test User' },
        status: 200,
      });

      const result = await connector.testConnection();

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/users/me/');
    });

    it('should handle connection errors', async () => {
      mockAxiosInstance.get.mockRejectedValueOnce(new Error('Unauthorized'));

      const result = await connector.testConnection();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('fetchEvents', () => {
    it('should fetch events with correct parameters', async () => {
      const mockEvents: EventbriteEvent[] = [{
        id: 'event123',
        name: { text: 'Test Event', html: 'Test Event' },
        description: { text: 'Event description', html: 'Event description' },
        url: 'https://example.com/event',
        start: {
          timezone: 'America/New_York',
          local: '2024-06-01T19:00:00',
          utc: '2024-06-01T23:00:00Z',
        },
        end: {
          timezone: 'America/New_York',
          local: '2024-06-01T22:00:00',
          utc: '2024-06-02T02:00:00Z',
        },
        organization_id: 'org123',
        created: '2024-01-01T00:00:00Z',
        changed: '2024-01-01T00:00:00Z',
        published: '2024-01-01T00:00:00Z',
        status: 'live',
        currency: 'USD',
        listed: true,
        shareable: true,
        online_event: false,
        tx_time_limit: 480,
        hide_start_date: false,
        hide_end_date: false,
        locale: 'en_US',
        is_locked: false,
        privacy_setting: 'public',
        is_series: false,
        is_series_parent: false,
        inventory_type: 'limited',
        is_reserved_seating: false,
        show_pick_a_seat: false,
        show_seatmap_thumbnail: false,
        show_colors_in_seatmap_thumbnail: false,
        source: 'create_2.0',
        is_free: false,
        version: '3.0.0',
        summary: 'Event summary',
        organizer_id: 'organizer123',
        resource_uri: 'https://www.eventbriteapi.com/v3/events/event123/',
        is_externally_ticketed: false,
      }];

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          events: mockEvents,
          pagination: {
            object_count: 1,
            page_number: 1,
            page_size: 100,
            page_count: 1,
            has_more_items: false,
          },
        },
      });

      const result = await connector.fetchEvents('org123');

      expect(result.success).toBe(true);
      expect(result.data?.data).toEqual(mockEvents);
      expect(result.data?.hasMore).toBe(false);
      expect(result.data?.total).toBe(1);
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/organizations/org123/events/',
        {
          params: {
            page_size: 100,
            order_by: 'created_desc',
            organization_id: 'org123',
          },
        }
      );
    });

    it('should handle Eventbrite API errors', async () => {
      mockAxiosInstance.get.mockRejectedValueOnce({
        response: {
          status: 401,
          data: {
            error: 'INVALID_AUTH',
            error_description: 'Invalid access token',
          },
        },
      });

      const result = await connector.fetchEvents();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('fetchEventAttendees', () => {
    it('should fetch attendees with correct parameters', async () => {
      const mockAttendees: EventbriteAttendee[] = [{
        id: 'attendee123',
        created: '2024-01-01T00:00:00Z',
        changed: '2024-01-01T00:00:00Z',
        ticket_class_id: 'ticket123',
        ticket_class_name: 'General Admission',
        event_id: 'event123',
        order_id: 'order123',
        status: 'attending',
        source: 'eventbrite',
        checked_in: false,
        cancelled: false,
        refunded: false,
        profile: {
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          name: 'John Doe',
        },
        costs: {
          base_price: { currency: 'USD', value: 2500, major_value: '25.00' },
          eventbrite_fee: { currency: 'USD', value: 275, major_value: '2.75' },
          gross: { currency: 'USD', value: 2775, major_value: '27.75' },
          payment_fee: { currency: 'USD', value: 0, major_value: '0.00' },
          tax: { currency: 'USD', value: 0, major_value: '0.00' },
        },
        resource_uri: 'https://www.eventbriteapi.com/v3/events/event123/attendees/attendee123/',
        delivery_method: 'electronic',
      }];

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          attendees: mockAttendees,
          pagination: {
            object_count: 1,
            page_number: 1,
            page_size: 100,
            page_count: 1,
            has_more_items: false,
          },
        },
      });

      const result = await connector.fetchEventAttendees('event123');

      expect(result.success).toBe(true);
      expect(result.data?.data).toEqual(mockAttendees);
      expect(result.data?.hasMore).toBe(false);
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/events/event123/attendees/',
        {
          params: {
            page_size: 100,
          },
        }
      );
    });
  });

  describe('fetchAllTransactions', () => {
    it('should transform attendees to transactions correctly', async () => {
      const mockEvent: EventbriteEvent = {
        id: 'event123',
        name: { text: 'Test Event', html: 'Test Event' },
        description: { text: 'Event description', html: 'Event description' },
        url: 'https://example.com/event',
        start: {
          timezone: 'America/New_York',
          local: '2024-06-01T19:00:00',
          utc: '2024-06-01T23:00:00Z',
        },
        end: {
          timezone: 'America/New_York',
          local: '2024-06-01T22:00:00',
          utc: '2024-06-02T02:00:00Z',
        },
        organization_id: 'org123',
        created: '2024-01-01T00:00:00Z',
        changed: '2024-01-01T00:00:00Z',
        published: '2024-01-01T00:00:00Z',
        status: 'live',
        currency: 'USD',
        listed: true,
        shareable: true,
        online_event: false,
        tx_time_limit: 480,
        hide_start_date: false,
        hide_end_date: false,
        locale: 'en_US',
        is_locked: false,
        privacy_setting: 'public',
        is_series: false,
        is_series_parent: false,
        inventory_type: 'limited',
        is_reserved_seating: false,
        show_pick_a_seat: false,
        show_seatmap_thumbnail: false,
        show_colors_in_seatmap_thumbnail: false,
        source: 'create_2.0',
        is_free: false,
        version: '3.0.0',
        summary: 'Event summary',
        organizer_id: 'organizer123',
        resource_uri: 'https://www.eventbriteapi.com/v3/events/event123/',
        is_externally_ticketed: false,
        organizer: {
          id: 'organizer123',
          name: 'Test Organizer',
          description: { text: '', html: '' },
          long_description: { text: '', html: '' },
          resource_uri: '',
          url: '',
          num_past_events: 0,
          num_future_events: 0,
        },
      };

      const mockAttendees: EventbriteAttendee[] = [{
        id: 'attendee123',
        created: '2024-01-01T00:00:00Z',
        changed: '2024-01-01T00:00:00Z',
        ticket_class_id: 'ticket123',
        ticket_class_name: 'General Admission',
        event_id: 'event123',
        order_id: 'order123',
        status: 'attending',
        source: 'eventbrite',
        checked_in: true,
        cancelled: false,
        refunded: false,
        profile: {
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          name: 'John Doe',
          cell_phone: '+1234567890',
        },
        costs: {
          base_price: { currency: 'USD', value: 2500, major_value: '25.00' },
          eventbrite_fee: { currency: 'USD', value: 275, major_value: '2.75' },
          gross: { currency: 'USD', value: 2775, major_value: '27.75' },
          payment_fee: { currency: 'USD', value: 100, major_value: '1.00' },
          tax: { currency: 'USD', value: 250, major_value: '2.50' },
        },
        resource_uri: 'https://www.eventbriteapi.com/v3/events/event123/attendees/attendee123/',
        delivery_method: 'electronic',
        barcodes: [{ barcode: 'ABC123', status: 'unused', created: '', changed: '', checkin_type: 1, is_printed: false }],
      }];

      // Mock event details fetch
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockEvent,
      });

      // Mock attendees fetch
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          attendees: mockAttendees,
          pagination: {
            object_count: 1,
            page_number: 1,
            page_size: 100,
            page_count: 1,
            has_more_items: false,
          },
        },
      });

      const result = await connector.fetchAllTransactions('event123');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      
      const transformed = result.data![0];
      expect(transformed.transaction_id).toBe('attendee123');
      expect(transformed.event_id).toBe('event123');
      expect(transformed.attendee_name).toBe('John Doe');
      expect(transformed.total_amount).toBe(2775); // Already in cents
      expect(transformed.base_price).toBe(2500);
      expect(transformed.eventbrite_fee).toBe(275);
      expect(transformed.payment_fee).toBe(100);
      expect(transformed.tax_amount).toBe(250);
      expect(transformed.checked_in).toBe(true);
      expect(transformed.barcode).toBe('ABC123');
      expect(transformed.event_details?.event_name).toBe('Test Event');
      expect(transformed.event_details?.organizer_name).toBe('Test Organizer');
    });
  });

  describe('saveTransactions', () => {
    it('should save transactions to database', async () => {
      const transactions = [{
        transaction_id: 'attendee123',
        event_id: 'event123',
        order_id: 'order123',
        attendee_id: 'attendee123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        status: 'attending',
        total_amount: 2775,
        base_price: 2500,
        eventbrite_fee: 275,
        payment_fee: 100,
        tax_amount: 250,
        currency: 'USD',
        ticket_class_id: 'ticket123',
        ticket_class_name: 'General Admission',
        attendee_name: 'John Doe',
        attendee_email: 'john@example.com',
        attendee_phone: '+1234567890',
        checked_in: true,
        cancelled: false,
        refunded: false,
        barcode: 'ABC123',
        delivery_method: 'electronic',
        source: 'eventbrite',
      }];

      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.from = vi.fn().mockReturnValue({
        insert: mockInsert,
      });

      const result = await connector.saveTransactions(transactions, '2024-01-01T00:00:00Z');

      expect(result.success).toBe(true);
      expect(result.data).toBe(1);
      expect(mockSupabase.from).toHaveBeenCalledWith('eventbrite_transactions');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            transaction_id: 'attendee123',
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
        transaction_id: 'attendee123',
        event_id: 'event123',
        order_id: 'order123',
        attendee_id: 'attendee123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        status: 'attending',
        total_amount: 2775,
        base_price: 2500,
        eventbrite_fee: 275,
        payment_fee: 100,
        tax_amount: 250,
        currency: 'USD',
        ticket_class_id: 'ticket123',
        ticket_class_name: 'General Admission',
        checked_in: false,
        cancelled: false,
        refunded: false,
        delivery_method: 'electronic',
        source: 'eventbrite',
      }];
      
      const result = await connector.saveTransactions(transactions, '2024-01-01T00:00:00Z');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});