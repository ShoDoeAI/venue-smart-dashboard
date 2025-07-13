import type { SupabaseClient } from '@supabase/supabase-js';
import axios, { AxiosInstance } from 'axios';

import type { Database } from '../../types/database.generated';
import { BaseConnector } from '../base-connector';
import type { 
  ConnectorConfig, 
  FetchResult, 
  PaginatedResponse,
  ConnectorCredentials
} from '../types';
import { API_ENDPOINTS } from '../../constants';

import type {
  EventbriteCredentials,
  EventbriteEvent,
  EventbriteOrder,
  EventbriteAttendee,
  EventbriteOrganization,
  EventbriteTicketClass,
  TransformedEventbriteTransaction,
  EventbriteApiResponse
} from './types';

export class EventbriteConnector extends BaseConnector {
  private client: AxiosInstance;
  private eventbriteCredentials: EventbriteCredentials;

  constructor(
    credentials: ConnectorCredentials,
    config: ConnectorConfig,
    supabase: SupabaseClient<Database>
  ) {
    super(credentials, config, supabase);
    
    this.eventbriteCredentials = credentials.credentials as EventbriteCredentials;
    
    this.client = axios.create({
      baseURL: API_ENDPOINTS.EVENTBRITE.BASE,
      headers: {
        'Authorization': `Bearer ${this.eventbriteCredentials.accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: this.config.timeout || 30000,
    });

    // Add response interceptor for rate limit handling
    this.client.interceptors.response.use(
      response => {
        // Extract rate limit info from headers if available
        const remaining = response.headers['x-ratelimit-remaining'] as string | undefined;
        const limit = response.headers['x-ratelimit-limit'] as string | undefined;
        const reset = response.headers['x-ratelimit-reset'] as string | undefined;
        
        if (limit && remaining && reset) {
          this.rateLimitInfo = {
            limit: parseInt(limit),
            remaining: parseInt(remaining),
            reset: new Date(parseInt(reset) * 1000),
          };
        }
        
        return response;
      },
      error => Promise.reject(error)
    );
  }

  get serviceName(): string {
    return 'eventbrite';
  }

  async validateCredentials(): Promise<boolean> {
    try {
      const response = await this.client.get('/users/me/');
      return response.status === 200;
    } catch {
      return false;
    }
  }

  async testConnection(): Promise<FetchResult<unknown>> {
    return this.fetchWithRetry(
      async () => {
        const response = await this.client.get('/users/me/');
        return response.data as unknown;
      },
      'test-connection'
    );
  }

  async fetchOrganizations(): Promise<FetchResult<EventbriteOrganization[]>> {
    return this.fetchWithRetry(
      async () => {
        const response = await this.client.get<EventbriteApiResponse<EventbriteOrganization>>(
          '/users/me/organizations/'
        );
        return response.data.organizations || [];
      },
      'fetch-organizations'
    );
  }

  async fetchEvents(
    organizationId?: string,
    status?: string,
    cursor?: string
  ): Promise<FetchResult<PaginatedResponse<EventbriteEvent>>> {
    return this.fetchWithRetry(
      async () => {
        const params: Record<string, unknown> = {
          page_size: 100,
          order_by: 'created_desc',
        };

        if (organizationId) {
          params.organization_id = organizationId;
        }

        if (status) {
          params.status = status;
        }

        if (cursor) {
          params.continuation = cursor;
        }

        const endpoint = organizationId 
          ? `/organizations/${organizationId}/events/`
          : '/users/me/events/';

        const response = await this.client.get<EventbriteApiResponse<EventbriteEvent>>(
          endpoint,
          { params }
        );
        
        const events = response.data.events || [];
        const pagination = response.data.pagination;
        
        return {
          data: events,
          hasMore: pagination.has_more_items,
          nextCursor: pagination.continuation,
          total: pagination.object_count,
        };
      },
      'fetch-events'
    );
  }

  async fetchEventDetails(eventId: string): Promise<FetchResult<EventbriteEvent>> {
    return this.fetchWithRetry(
      async () => {
        const response = await this.client.get<EventbriteEvent>(
          `/events/${eventId}/`,
          {
            params: {
              expand: 'venue,organizer,ticket_availability,logo'
            }
          }
        );
        return response.data;
      },
      'fetch-event-details'
    );
  }

  async fetchEventOrders(
    eventId: string,
    status?: string,
    cursor?: string
  ): Promise<FetchResult<PaginatedResponse<EventbriteOrder>>> {
    return this.fetchWithRetry(
      async () => {
        const params: Record<string, unknown> = {
          page_size: 100,
        };

        if (status) {
          params.status = status;
        }

        if (cursor) {
          params.continuation = cursor;
        }

        const response = await this.client.get<EventbriteApiResponse<EventbriteOrder>>(
          `/events/${eventId}/orders/`,
          { params }
        );
        
        const orders = response.data.orders || [];
        const pagination = response.data.pagination;
        
        return {
          data: orders,
          hasMore: pagination.has_more_items,
          nextCursor: pagination.continuation,
          total: pagination.object_count,
        };
      },
      'fetch-event-orders'
    );
  }

  async fetchEventAttendees(
    eventId: string,
    status?: string,
    cursor?: string
  ): Promise<FetchResult<PaginatedResponse<EventbriteAttendee>>> {
    return this.fetchWithRetry(
      async () => {
        const params: Record<string, unknown> = {
          page_size: 100,
        };

        if (status) {
          params.status = status;
        }

        if (cursor) {
          params.continuation = cursor;
        }

        const response = await this.client.get<EventbriteApiResponse<EventbriteAttendee>>(
          `/events/${eventId}/attendees/`,
          { params }
        );
        
        const attendees = response.data.attendees || [];
        const pagination = response.data.pagination;
        
        return {
          data: attendees,
          hasMore: pagination.has_more_items,
          nextCursor: pagination.continuation,
          total: pagination.object_count,
        };
      },
      'fetch-event-attendees'
    );
  }

  async fetchTicketClasses(eventId: string): Promise<FetchResult<EventbriteTicketClass[]>> {
    return this.fetchWithRetry(
      async () => {
        const response = await this.client.get<{ ticket_classes: EventbriteTicketClass[] }>(
          `/events/${eventId}/ticket_classes/`
        );
        return response.data.ticket_classes || [];
      },
      'fetch-ticket-classes'
    );
  }

  async fetchAllTransactions(
    eventId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<FetchResult<TransformedEventbriteTransaction[]>> {
    const transactions: TransformedEventbriteTransaction[] = [];
    let cursor: string | undefined;

    // First, get event details for context
    const eventResult = await this.fetchEventDetails(eventId);
    if (!eventResult.success) {
      return eventResult as FetchResult<TransformedEventbriteTransaction[]>;
    }

    const event = eventResult.data!;

    // Fetch all attendees for the event (which contain transaction info)
    do {
      const attendeesResult = await this.fetchEventAttendees(eventId, undefined, cursor);
      if (!attendeesResult.success) {
        return attendeesResult as FetchResult<TransformedEventbriteTransaction[]>;
      }

      const attendees = attendeesResult.data?.data || [];
      cursor = attendeesResult.data?.nextCursor;

      // Transform attendees to transactions
      for (const attendee of attendees) {
        // Filter by date if specified
        if (startDate || endDate) {
          const attendeeDate = new Date(attendee.created);
          if (startDate && attendeeDate < startDate) continue;
          if (endDate && attendeeDate > endDate) continue;
        }

        const transformed = this.transformAttendeeToTransaction(attendee, event);
        transactions.push(transformed);
      }
    } while (cursor);

    return {
      success: true,
      data: transactions,
      timestamp: new Date(),
      duration: 0, // Will be set by fetchWithRetry
    };
  }

  private transformAttendeeToTransaction(
    attendee: EventbriteAttendee,
    event: EventbriteEvent
  ): TransformedEventbriteTransaction {
    return {
      transaction_id: attendee.id,
      event_id: attendee.event_id,
      order_id: attendee.order_id,
      attendee_id: attendee.id,
      created_at: attendee.created,
      updated_at: attendee.changed,
      status: attendee.status,
      total_amount: Math.round(attendee.costs.gross.value), // Already in cents from Eventbrite
      base_price: Math.round(attendee.costs.base_price.value),
      eventbrite_fee: Math.round(attendee.costs.eventbrite_fee.value),
      payment_fee: Math.round(attendee.costs.payment_fee.value),
      tax_amount: Math.round(attendee.costs.tax.value),
      currency: attendee.costs.gross.currency,
      ticket_class_id: attendee.ticket_class_id,
      ticket_class_name: attendee.ticket_class_name,
      attendee_name: attendee.profile.name || 
        `${attendee.profile.first_name || ''} ${attendee.profile.last_name || ''}`.trim() || 
        undefined,
      attendee_email: attendee.profile.email,
      attendee_phone: attendee.profile.cell_phone || attendee.profile.work_phone,
      checked_in: attendee.checked_in,
      cancelled: attendee.cancelled,
      refunded: attendee.refunded,
      barcode: attendee.barcodes?.[0]?.barcode,
      delivery_method: attendee.delivery_method,
      source: attendee.source,
      event_details: {
        event_name: event.name.text,
        event_start: event.start.utc,
        event_end: event.end.utc,
        venue_name: event.venue?.name,
        organizer_name: event.organizer?.name || '',
      },
      answers: attendee.answers,
    };
  }

  async saveTransactions(
    transactions: TransformedEventbriteTransaction[],
    snapshotTimestamp: string
  ): Promise<FetchResult<number>> {
    try {
      const { error } = await this.supabase
        .from('eventbrite_transactions')
        .insert(
          transactions.map(tx => ({
            ...tx,
            snapshot_timestamp: snapshotTimestamp,
          }))
        );

      if (error) {
        throw new Error(`Failed to save transactions: ${error.message}`);
      }

      return {
        success: true,
        data: transactions.length,
        timestamp: new Date(),
        duration: 0,
      };
    } catch (error) {
      const connectorError = this.handleError(error, 'save-transactions');
      return {
        success: false,
        error: connectorError,
        timestamp: new Date(),
        duration: 0,
      };
    }
  }

  async fetchUserOrders(): Promise<FetchResult<PaginatedResponse<EventbriteOrder>>> {
    return this.fetchWithRetry(
      async () => {
        const response = await this.client.get<EventbriteApiResponse<EventbriteOrder>>(
          '/users/me/orders/'
        );
        
        const orders = response.data.orders || [];
        const pagination = response.data.pagination;
        
        return {
          data: orders,
          hasMore: pagination.has_more_items,
          nextCursor: pagination.continuation,
          total: pagination.object_count,
        };
      },
      'fetch-user-orders'
    );
  }

  async createWebhook(
    endpoint: string,
    actions: string[]
  ): Promise<FetchResult<{ webhook_id: string }>> {
    return this.fetchWithRetry(
      async () => {
        const response = await this.client.post('/webhooks/', {
          endpoint_url: endpoint,
          actions: actions.join(','),
        });
        return { webhook_id: response.data.id };
      },
      'create-webhook'
    );
  }

  async deleteWebhook(webhookId: string): Promise<FetchResult<void>> {
    return this.fetchWithRetry(
      async () => {
        await this.client.delete(`/webhooks/${webhookId}/`);
        return undefined;
      },
      'delete-webhook'
    );
  }
}