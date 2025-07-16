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
  ToastAuthToken,
  ToastAuthResponse,
  ToastCredentials,
  ToastOrder,
  ToastPayment,
  ToastCustomer,
  ToastEmployee,
  TransformedToastTransaction,
  ToastLocation
} from './types';

export class ToastConnector extends BaseConnector {
  private client: AxiosInstance;
  private toastCredentials: ToastCredentials;
  private authToken?: ToastAuthToken;
  private tokenExpiresAt?: Date;

  constructor(
    credentials: ConnectorCredentials,
    config: ConnectorConfig,
    supabase: SupabaseClient<Database>
  ) {
    super(credentials, config, supabase);
    
    this.toastCredentials = credentials.credentials as unknown as ToastCredentials;
    
    const baseURL = this.toastCredentials.environment === 'sandbox'
      ? API_ENDPOINTS.TOAST.SANDBOX
      : API_ENDPOINTS.TOAST.PRODUCTION;

    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: this.config.timeout || 30000,
    });

    // Add request interceptor to add auth token
    this.client.interceptors.request.use(
      async (config) => {
        const token = await this.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token.access_token}`;
        }
        // Add Toast-specific headers
        config.headers['Toast-Restaurant-External-ID'] = this.toastCredentials.locationGuid;
        return config;
      },
      error => Promise.reject(error)
    );

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
    return 'toast';
  }

  /**
   * Get or refresh authentication token
   */
  private async getAuthToken(): Promise<ToastAuthToken | undefined> {
    // Check if we have a valid token
    if (this.authToken && this.tokenExpiresAt && this.tokenExpiresAt > new Date()) {
      return this.authToken;
    }

    // Refresh the token
    try {
      const response = await axios.post<ToastAuthResponse>(
        API_ENDPOINTS.TOAST.AUTH,
        {
          clientId: this.toastCredentials.clientId,
          clientSecret: this.toastCredentials.clientSecret,
          userAccessType: 'TOAST_MACHINE_CLIENT'
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      const tokenData = response.data.token;
      this.authToken = {
        access_token: tokenData.accessToken,
        token_type: tokenData.tokenType,
        expires_in: tokenData.expiresIn,
        scope: tokenData.scope,
        created_at: Date.now(),
      };
      
      // Set expiration time (subtract 5 minutes for safety)
      this.tokenExpiresAt = new Date(Date.now() + (tokenData.expiresIn - 300) * 1000);
      
      return this.authToken;
    } catch (error) {
      console.error('Failed to get Toast auth token', error);
      return undefined;
    }
  }

  async validateCredentials(): Promise<boolean> {
    try {
      const token = await this.getAuthToken();
      return !!token;
    } catch {
      return false;
    }
  }

  async testConnection(): Promise<FetchResult<unknown>> {
    return this.fetchWithRetry(
      async () => {
        const response = await this.client.get('/config/v2/restaurants');
        return response.data as unknown;
      },
      'test-connection'
    );
  }

  async fetchLocations(): Promise<FetchResult<ToastLocation[]>> {
    return this.fetchWithRetry(
      async () => {
        const response = await this.client.get<ToastLocation[]>('/config/v2/restaurants');
        return response.data || [];
      },
      'fetch-locations'
    );
  }

  async fetchOrders(
    locationId: string,
    startDate: Date,
    endDate: Date,
    cursor?: string
  ): Promise<FetchResult<PaginatedResponse<ToastOrder>>> {
    return this.fetchWithRetry(
      async () => {
        const params: Record<string, unknown> = {
          restaurantGuid: locationId,
          businessDate: this.formatBusinessDate(startDate),
          endBusinessDate: this.formatBusinessDate(endDate),
          pageSize: 100,
        };

        if (cursor) {
          params.page = cursor;
        }

        const response = await this.client.get<ToastOrder[]>('/orders/v2/orders', { params });
        
        // Toast API typically returns arrays directly
        const orders = Array.isArray(response.data) ? response.data : [];
        
        return {
          data: orders,
          hasMore: orders.length === 100, // Assume more if full page
          nextCursor: orders.length === 100 ? String((parseInt(cursor || '1') + 1)) : undefined,
        };
      },
      'fetch-orders'
    );
  }

  async fetchAllTransactions(
    locationId: string,
    startTime: Date,
    endTime: Date
  ): Promise<FetchResult<TransformedToastTransaction[]>> {
    const transactions: TransformedToastTransaction[] = [];
    let cursor: string | undefined;

    // Fetch all orders (which contain payment information)
    do {
      const ordersResult = await this.fetchOrders(locationId, startTime, endTime, cursor);
      if (!ordersResult.success) {
        return ordersResult as unknown as FetchResult<TransformedToastTransaction[]>;
      }

      const orders = ordersResult.data?.data || [];
      cursor = ordersResult.data?.nextCursor as string | undefined;

      // Transform orders to transactions
      for (const order of orders) {
        // Each check in an order can have payments
        for (const check of order.checks || []) {
          for (const payment of check.payments || []) {
            const transformed = this.transformTransaction(order, check, payment);
            transactions.push(transformed);
          }
        }
      }
    } while (cursor);

    return {
      success: true,
      data: transactions,
      timestamp: new Date(),
      duration: 0, // Will be set by fetchWithRetry
    };
  }

  private transformTransaction(
    order: ToastOrder,
    check: ToastOrder['checks'][0],
    payment: ToastPayment
  ): TransformedToastTransaction {
    const itemizations = check.selections || [];
    
    return {
      transaction_id: payment.guid,
      location_id: this.toastCredentials.locationGuid,
      created_at: order.createdDate,
      total_amount: Math.round(payment.amount * 100), // Convert to cents
      tax_amount: Math.round((check.taxAmount || 0) * 100),
      tip_amount: Math.round((payment.tipAmount || 0) * 100),
      discount_amount: Math.round((check.appliedDiscountAmount || 0) * 100),
      service_charge_amount: Math.round(
        (check.appliedServiceCharges?.reduce((sum, sc) => sum + sc.amount, 0) || 0) * 100
      ),
      source_type: payment.type || undefined,
      status: payment.refundStatus || 'COMPLETED',
      receipt_number: order.guid,
      receipt_url: undefined,
      customer_id: check.customer?.guid || undefined,
      customer_name: check.customer 
        ? `${check.customer.firstName || ''} ${check.customer.lastName || ''}`.trim() 
        : undefined,
      customer_email: check.customer?.email || undefined,
      team_member_id: order.server?.guid || undefined,
      device_id: undefined,
      item_count: itemizations.reduce((sum, item) => sum + item.quantity, 0),
      unique_item_count: itemizations.length,
      itemizations: itemizations.length > 0 ? itemizations : undefined,
      payment_details: {
        payment_guid: payment.guid,
        type: payment.type,
        card_type: payment.cardType,
        last_4: payment.last4Digits,
      },
      refunds: undefined,
    };
  }

  async saveTransactions(
    transactions: TransformedToastTransaction[],
    snapshotTimestamp: string
  ): Promise<FetchResult<number>> {
    try {
      const { error } = await this.supabase
        .from('toast_transactions')
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

  async fetchCustomers(
    _cursor?: string,
    _createdAt?: { gte?: Date; lte?: Date }
  ): Promise<FetchResult<PaginatedResponse<ToastCustomer>>> {
    // Toast API doesn't have a direct customer endpoint
    // Customers are associated with orders/checks
    return {
      success: true,
      data: {
        data: [],
        hasMore: false,
      },
      timestamp: new Date(),
      duration: 0,
    };
  }

  async fetchTeamMembers(
    _locationIds: string[]
  ): Promise<FetchResult<PaginatedResponse<ToastEmployee>>> {
    return this.fetchWithRetry(
      async () => {
        const response = await this.client.get<ToastEmployee[]>(
          '/labor/v1/employees',
          {
            params: {
              restaurantGuid: this.toastCredentials.locationGuid,
            },
          }
        );
        
        const employees = Array.isArray(response.data) ? response.data : [];
        
        return {
          data: employees,
          hasMore: false,
        };
      },
      'fetch-team-members'
    );
  }

  /**
   * Format date for Toast business date parameter (YYYYMMDD)
   */
  private formatBusinessDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  /**
   * Update menu item price
   */
  async updateMenuItemPrice(itemGuid: string, newPrice: number): Promise<any> {
    try {
      const response = await this.client.put(
        `/menuItems/${itemGuid}`,
        { price: newPrice }
      );
      return response;
    } catch (error) {
      throw this.handleError(error, 'update-menu-item-price');
    }
  }

  /**
   * Update menu item availability
   */
  async updateMenuItemAvailability(itemGuid: string, available: boolean): Promise<any> {
    try {
      const response = await this.client.put(
        `/menuItems/${itemGuid}`,
        { available }
      );
      return response;
    } catch (error) {
      throw this.handleError(error, 'update-menu-item-availability');
    }
  }

  /**
   * Create discount
   */
  async createDiscount(discount: {
    name: string;
    type: 'percent' | 'fixed';
    amount: number;
    startDate?: string;
    endDate?: string;
  }): Promise<any> {
    try {
      const response = await this.client.post(
        '/discounts',
        discount
      );
      return response;
    } catch (error) {
      throw this.handleError(error, 'create-discount');
    }
  }

  /**
   * Update modifier price
   */
  async updateModifierPrice(modifierGuid: string, newPrice: number): Promise<any> {
    try {
      const response = await this.client.put(
        `/modifiers/${modifierGuid}`,
        { price: newPrice }
      );
      return response;
    } catch (error) {
      throw this.handleError(error, 'update-modifier-price');
    }
  }
}