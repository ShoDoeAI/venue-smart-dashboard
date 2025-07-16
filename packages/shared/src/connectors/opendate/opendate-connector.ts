/**
 * OpenDate.io Live Music Venue Management Connector
 * 
 * Integrates with OpenDate.io's comprehensive platform for booking, ticketing,
 * and marketing in live music venues.
 * 
 * API Documentation: https://opendate.readme.io
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import type { SupabaseClient } from '@supabase/supabase-js';

import { BaseConnector } from '../base-connector';
import type { 
  ConnectorCredentials, 
  ConnectorConfig, 
  FetchResult,
  ConnectorError 
} from '../types';

import type {
  OpenDateCredentials,
  OpenDateArtist,
  OpenDateConfirm,
  OpenDateOrder,
  OpenDateTicket,
  OpenDateFan,
  OpenDateVenue,
  OpenDateSettlement,
  OpenDateTransaction,
  OpenDateAnalytics,
  OpenDateConfirmFilters,
  OpenDateOrderFilters,
  OpenDateFanFilters
  // OpenDateApiResponse
} from './types';

import {
  OpenDateCredentialsSchema,
  OpenDateArtistsResponseSchema,
  OpenDateConfirmsResponseSchema,
  OpenDateOrdersResponseSchema,
  OpenDateFansResponseSchema,
  OpenDateVenuesResponseSchema,
  OpenDateSettlementsResponseSchema,
  OpenDateAnalyticsResponseSchema,
  OpenDateTransactionSchema,
} from '../../schemas/opendate';

import { OPENDATE_API_ENDPOINTS } from './types';

export class OpenDateConnector extends BaseConnector {
  get serviceName(): string {
    return 'opendate';
  }
  private client: AxiosInstance;
  private openDateCredentials: OpenDateCredentials;
  private refreshToken?: string;

  constructor(
    credentials: ConnectorCredentials,
    config: ConnectorConfig,
    supabase: SupabaseClient
  ) {
    super(credentials, config, supabase);

    // Validate OpenDate-specific credentials
    const validatedCredentials = OpenDateCredentialsSchema.parse(credentials.credentials);
    this.openDateCredentials = validatedCredentials;
    this.refreshToken = validatedCredentials.refreshToken;

    // Create axios client with OpenDate configuration
    this.client = axios.create({
      baseURL: OPENDATE_API_ENDPOINTS.BASE,
      headers: {
        'Authorization': `Bearer ${this.openDateCredentials.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: this.config.timeout || 30000,
    });

    // Set up request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        this.log('debug', 'OpenDate API Request', {
          method: config.method?.toUpperCase(),
          url: config.url,
          params: config.params,
        });
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Set up response interceptor for token refresh and error handling
    this.client.interceptors.response.use(
      (response) => {
        this.log('debug', 'OpenDate API Response', {
          status: response.status,
          url: response.config.url,
          dataLength: Array.isArray(response.data?.data) ? response.data.data.length : 'single',
        });
        return response;
      },
      async (error: AxiosError) => {
        // Handle 401 Unauthorized - attempt token refresh
        if (error.response?.status === 401 && this.refreshToken) {
          this.log('info', 'Access token expired, attempting refresh...');
          
          try {
            const refreshResponse = await axios.post(
              `${OPENDATE_API_ENDPOINTS.BASE}${OPENDATE_API_ENDPOINTS.AUTH.REFRESH}`,
              { 
                refresh_token: this.refreshToken,
                client_id: this.openDateCredentials.clientId,
                client_secret: this.openDateCredentials.clientSecret,
              }
            );

            const newAccessToken = refreshResponse.data.access_token;
            const newRefreshToken = refreshResponse.data.refresh_token;

            // Update stored tokens
            this.openDateCredentials.accessToken = newAccessToken;
            this.refreshToken = newRefreshToken;

            // Update axios instance headers
            this.client.defaults.headers['Authorization'] = `Bearer ${newAccessToken}`;

            // Retry original request
            if (error.config) {
              error.config.headers['Authorization'] = `Bearer ${newAccessToken}`;
              return this.client.request(error.config);
            }
          } catch (refreshError) {
            this.log('error', 'Token refresh failed', { error: refreshError });
            return Promise.reject(error);
          }
        }

        // Handle rate limiting
        if (error.response?.status === 429) {
          const retryAfter = parseInt(error.response.headers['retry-after'] || '60', 10);
          this.log('warn', `OpenDate API rate limited. Waiting ${retryAfter} seconds.`);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          return this.client.request(error.config!);
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Test connection to OpenDate API
   */
  async testConnection(): Promise<FetchResult<any>> {
    return this.fetchWithRetry(
      async () => {
        this.log('info', 'Testing OpenDate API connection');
        
        // Use the venues endpoint as a simple test
        const response = await this.client.get(OPENDATE_API_ENDPOINTS.VENUES.LIST);
        
        return response.data;
      },
      'test-connection'
    );
  }

  /**
   * Validate OpenDate credentials
   */
  async validateCredentials(): Promise<boolean> {
    try {
      const result = await this.testConnection();
      return result.success;
    } catch (error) {
      this.log('error', 'Failed to validate OpenDate credentials', { error });
      return false;
    }
  }

  /**
   * Fetch artists from OpenDate
   */
  async fetchArtists(): Promise<FetchResult<{ data: OpenDateArtist[]; hasMore: boolean; total: number }>> {
    return this.fetchWithRetry(
      async () => {
        this.log('info', 'Fetching OpenDate artists');

        const response = await this.client.get(OPENDATE_API_ENDPOINTS.ARTISTS.LIST, {
          params: { per_page: 100 }
        });
        
        const validatedData = OpenDateArtistsResponseSchema.parse(response.data);

        return {
          data: validatedData.data || [],
          hasMore: validatedData.pagination?.has_next || false,
          total: validatedData.pagination?.total || 0,
        };
      },
      'fetch-artists'
    );
  }

  /**
   * Fetch events/shows (confirms) from OpenDate
   */
  async fetchConfirms(
    filters?: OpenDateConfirmFilters
  ): Promise<FetchResult<{ data: OpenDateConfirm[]; hasMore: boolean; total: number }>> {
    return this.fetchWithRetry(
      async () => {
        this.log('info', 'Fetching OpenDate confirms (events/shows)', { filters });

        const params: any = {
          per_page: 100,
          ...filters,
        };

        const response = await this.client.get(OPENDATE_API_ENDPOINTS.CONFIRMS.LIST, { params });
        const validatedData = OpenDateConfirmsResponseSchema.parse(response.data);

        return {
          data: validatedData.data || [],
          hasMore: validatedData.pagination?.has_next || false,
          total: validatedData.pagination?.total || 0,
        };
      },
      'fetch-confirms'
    );
  }

  /**
   * Fetch single event/show details
   */
  async fetchConfirmDetails(confirmId: string): Promise<FetchResult<OpenDateConfirm>> {
    return this.fetchWithRetry(
      async () => {
        this.log('info', 'Fetching OpenDate confirm details', { confirmId });

        const response = await this.client.get(
          OPENDATE_API_ENDPOINTS.CONFIRMS.DETAIL.replace(':id', confirmId)
        );
        
        const validatedData = OpenDateConfirmsResponseSchema.parse(response.data);
        
        if (!validatedData.data || Array.isArray(validatedData.data)) {
          throw new Error('Invalid confirm details response');
        }

        return validatedData.data;
      },
      'fetch-confirm-details'
    );
  }

  /**
   * Fetch profit/loss for an event
   */
  async fetchConfirmProfitLoss(confirmId: string): Promise<FetchResult<any>> {
    return this.fetchWithRetry(
      async () => {
        this.log('info', 'Fetching profit/loss for confirm', { confirmId });

        const response = await this.client.get(
          OPENDATE_API_ENDPOINTS.CONFIRMS.PROFIT_LOSS.replace(':id', confirmId)
        );

        return response.data;
      },
      'fetch-confirm-profit-loss'
    );
  }

  /**
   * Fetch orders from OpenDate
   */
  async fetchOrders(
    filters?: OpenDateOrderFilters
  ): Promise<FetchResult<{ data: OpenDateOrder[]; hasMore: boolean; total: number }>> {
    return this.fetchWithRetry(
      async () => {
        this.log('info', 'Fetching OpenDate orders', { filters });

        const params: any = {
          per_page: 100,
          ...filters,
        };

        const response = await this.client.get(OPENDATE_API_ENDPOINTS.ORDERS.LIST, { params });
        const validatedData = OpenDateOrdersResponseSchema.parse(response.data);

        return {
          data: validatedData.data || [],
          hasMore: validatedData.pagination?.has_next || false,
          total: validatedData.pagination?.total || 0,
        };
      },
      'fetch-orders'
    );
  }

  /**
   * Fetch fans/customers from OpenDate
   */
  async fetchFans(
    filters?: OpenDateFanFilters
  ): Promise<FetchResult<{ data: OpenDateFan[]; hasMore: boolean; total: number }>> {
    return this.fetchWithRetry(
      async () => {
        this.log('info', 'Fetching OpenDate fans', { filters });

        const params: any = {
          per_page: 100,
          ...filters,
        };

        const response = await this.client.get(OPENDATE_API_ENDPOINTS.FANS.LIST, { params });
        const validatedData = OpenDateFansResponseSchema.parse(response.data);

        return {
          data: validatedData.data || [],
          hasMore: validatedData.pagination?.has_next || false,
          total: validatedData.pagination?.total || 0,
        };
      },
      'fetch-fans'
    );
  }

  /**
   * Fetch venues from OpenDate
   */
  async fetchVenues(): Promise<FetchResult<{ data: OpenDateVenue[]; hasMore: boolean; total: number }>> {
    return this.fetchWithRetry(
      async () => {
        this.log('info', 'Fetching OpenDate venues');

        const response = await this.client.get(OPENDATE_API_ENDPOINTS.VENUES.LIST, {
          params: { per_page: 100 }
        });
        
        const validatedData = OpenDateVenuesResponseSchema.parse(response.data);

        return {
          data: validatedData.data || [],
          hasMore: validatedData.pagination?.has_next || false,
          total: validatedData.pagination?.total || 0,
        };
      },
      'fetch-venues'
    );
  }

  /**
   * Fetch settlements from OpenDate
   */
  async fetchSettlements(
    venueId?: string,
    startDate?: string,
    endDate?: string
  ): Promise<FetchResult<{ data: OpenDateSettlement[]; hasMore: boolean; total: number }>> {
    return this.fetchWithRetry(
      async () => {
        this.log('info', 'Fetching OpenDate settlements', { venueId, startDate, endDate });

        const params: any = { per_page: 100 };
        if (venueId) params.venue_id = venueId;
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;

        const response = await this.client.get(OPENDATE_API_ENDPOINTS.SETTLEMENTS.LIST, { params });
        const validatedData = OpenDateSettlementsResponseSchema.parse(response.data);

        return {
          data: validatedData.data || [],
          hasMore: validatedData.pagination?.has_next || false,
          total: validatedData.pagination?.total || 0,
        };
      },
      'fetch-settlements'
    );
  }

  /**
   * Fetch analytics from OpenDate
   */
  async fetchAnalytics(
    venueId?: string,
    startDate?: string,
    endDate?: string
  ): Promise<FetchResult<OpenDateAnalytics>> {
    return this.fetchWithRetry(
      async () => {
        this.log('info', 'Fetching OpenDate analytics', { venueId, startDate, endDate });

        const params: any = {};
        if (venueId) params.venue_id = venueId;
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;

        const response = await this.client.get(OPENDATE_API_ENDPOINTS.ANALYTICS.OVERVIEW, { params });
        const validatedData = OpenDateAnalyticsResponseSchema.parse(response.data);

        if (!validatedData.data) {
          throw new Error('No analytics data available');
        }

        return validatedData.data;
      },
      'fetch-analytics'
    );
  }

  /**
   * Transform orders to transactions for VenueSync compatibility
   */
  async fetchAllTransactions(
    venueId?: string,
    startDate?: string,
    endDate?: string
  ): Promise<FetchResult<OpenDateTransaction[]>> {
    return this.fetchWithRetry(
      async () => {
        this.log('info', 'Fetching all OpenDate transactions (transformed from orders)', { 
          venueId, startDate, endDate 
        });

        // Fetch orders with filters
        const ordersResult = await this.fetchOrders({
          start_date: startDate,
          end_date: endDate,
        });

        if (!ordersResult.data) {
          throw new Error('Failed to fetch orders for transaction transformation');
        }

        const transactions: OpenDateTransaction[] = [];

        // Transform each order to transactions
        for (const order of ordersResult.data.data) {
          // Main order transaction
          const orderTransaction: OpenDateTransaction = {
            transaction_id: `order_${order.id}`,
            order_id: order.id,
            confirm_id: order.confirm_id,
            
            transaction_type: order.status === 'refunded' ? 'refund' : 'ticket_sale',
            amount: order.total,
            currency: 'USD',
            fee_amount: order.fees,
            net_amount: order.total - order.fees,
            
            show_date: undefined, // Would need to fetch confirm details
            quantity: order.ticket_count,
            
            customer_id: order.customer_id,
            customer_name: order.customer_first_name && order.customer_last_name
              ? `${order.customer_first_name} ${order.customer_last_name}`
              : undefined,
            customer_email: order.customer_email,
            
            payment_method: order.payment_method,
            payment_status: order.payment_status,
            
            transaction_date: order.ordered_at,
            created_at: order.created_at,
            updated_at: order.updated_at,
            
            source: 'opendate' as const,
            notes: order.notes,
          };

          transactions.push(OpenDateTransactionSchema.parse(orderTransaction));

          // Individual ticket transactions if needed
          if (order.tickets && order.tickets.length > 0) {
            for (const ticket of order.tickets) {
              const ticketTransaction: OpenDateTransaction = {
                transaction_id: `ticket_${ticket.id}`,
                order_id: order.id,
                ticket_id: ticket.id,
                confirm_id: order.confirm_id,
                
                transaction_type: ticket.status === 'refunded' ? 'refund' : 'ticket_sale',
                amount: ticket.total_price,
                currency: 'USD',
                fee_amount: ticket.fee,
                net_amount: ticket.price,
                
                ticket_type: ticket.ticket_type_name,
                quantity: 1,
                
                customer_name: ticket.guest_name,
                customer_email: ticket.guest_email,
                
                payment_status: ticket.status,
                
                transaction_date: ticket.purchased_at,
                created_at: ticket.created_at,
                updated_at: ticket.updated_at,
                
                source: 'opendate' as const,
                notes: ticket.special_notes,
              };

              transactions.push(OpenDateTransactionSchema.parse(ticketTransaction));
            }
          }
        }

        this.log('info', `Transformed ${ordersResult.data.data.length} orders to ${transactions.length} transactions`);

        return transactions;
      },
      'fetch-all-transactions'
    );
  }

  /**
   * Save transactions to database
   */
  async saveTransactions(
    transactions: OpenDateTransaction[],
    snapshotTimestamp: string
  ): Promise<FetchResult<number>> {
    const startTime = Date.now();
    
    try {
      this.log('info', `Saving ${transactions.length} OpenDate transactions to database`);

      // Add snapshot timestamp to each transaction
      const transactionsWithSnapshot = transactions.map(transaction => ({
        ...transaction,
        snapshot_timestamp: snapshotTimestamp,
      }));

      const { error } = await this.supabase
        .from('opendate_transactions')
        .insert(transactionsWithSnapshot);

      if (error) {
        throw error;
      }

      this.log('info', `Successfully saved ${transactions.length} OpenDate transactions`);

      return {
        success: true,
        data: transactions.length,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const connectorError = this.handleError(error, 'save-transactions');
      return {
        success: false,
        error: connectorError,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Check in a ticket
   */
  async checkInTicket(ticketId: string): Promise<FetchResult<OpenDateTicket>> {
    return this.fetchWithRetry(
      async () => {
        this.log('info', 'Checking in ticket', { ticketId });

        const response = await this.client.post(
          OPENDATE_API_ENDPOINTS.TICKETS.CHECKIN.replace(':id', ticketId)
        );

        return response.data;
      },
      'check-in-ticket'
    );
  }

  /**
   * Handle OpenDate-specific errors
   */
  protected handleError(error: any, operation: string): ConnectorError {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      
      // Handle OpenDate-specific error responses
      if (axiosError.response?.data && typeof axiosError.response.data === 'object') {
        const errorData = axiosError.response.data as any;
        
        return {
          message: errorData.error || errorData.message || axiosError.message,
          code: `OPENDATE_${axiosError.response.status}`,
          details: { ...errorData, operation },
          timestamp: new Date(),
          retryable: axiosError.response.status >= 500 || axiosError.response.status === 429,
        };
      }
    }

    return super.handleError(error, operation);
  }

  /**
   * Update show capacity
   */
  async updateShowCapacity(confirmId: string, newCapacity: number): Promise<any> {
    try {
      const response = await this.client.patch(
        `/confirms/${confirmId}`,
        { capacity: newCapacity }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'update-show-capacity');
    }
  }

  /**
   * Update ticket tier
   */
  async updateTicketTier(
    confirmId: string,
    tierId: string,
    updates: { price?: number; quantity?: number }
  ): Promise<any> {
    try {
      const response = await this.client.patch(
        `/confirms/${confirmId}/ticket-tiers/${tierId}`,
        updates
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'update-ticket-tier');
    }
  }

  /**
   * Send fan message
   */
  async sendFanMessage(params: {
    segment: string;
    criteria?: any;
    subject: string;
    message: string;
    promoCode?: string;
  }): Promise<any> {
    try {
      const response = await this.client.post(
        '/marketing/campaigns',
        {
          segment: params.segment,
          criteria: params.criteria,
          subject: params.subject,
          message: params.message,
          promo_code: params.promoCode,
        }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'send-fan-message');
    }
  }

  /**
   * Update artist payout terms
   */
  async updateArtistPayout(
    confirmId: string,
    terms: { guarantee?: number; doorSplit?: number }
  ): Promise<any> {
    try {
      const response = await this.client.patch(
        `/confirms/${confirmId}/payout-terms`,
        {
          artist_guarantee: terms.guarantee,
          door_split_percentage: terms.doorSplit,
        }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'update-artist-payout');
    }
  }
}