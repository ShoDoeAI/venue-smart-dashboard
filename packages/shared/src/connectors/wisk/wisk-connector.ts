/**
 * WISK Inventory Management Connector
 * 
 * Integrates with WISK restaurant and bar inventory management system.
 * WISK helps restaurants manage inventory, track waste, cost recipes, and automate ordering.
 * 
 * Note: WISK API documentation is not publicly available. This implementation
 * is based on common inventory management API patterns and WISK's documented features.
 * For official API documentation, contact support@wisk.ai
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
  WiskCredentials,
  WiskInventoryItem,
  WiskStockMovement,
  WiskSupplier,
  WiskPurchaseOrder,
  WiskRecipe,
  WiskLocation,
  WiskWasteEntry,
  WiskTransaction,
  WiskInventoryFilters,
  WiskMovementFilters,
  WiskApiResponse,
  WiskInventoryAnalytics,
} from './types';

import {
  WiskCredentialsSchema,
  // WiskInventoryItemsResponseSchema,
  WiskStockMovementsResponseSchema,
  WiskSuppliersResponseSchema,
  WiskPurchaseOrdersResponseSchema,
  WiskRecipesResponseSchema,
  WiskLocationsResponseSchema,
  WiskWasteEntriesResponseSchema,
  WiskTransactionSchema,
  WiskAnalyticsResponseSchema,
} from '../../schemas/wisk';

import { WISK_API_ENDPOINTS } from './types';

export class WiskConnector extends BaseConnector {
  get serviceName(): string {
    return 'wisk';
  }
  private client: AxiosInstance;
  private wiskCredentials: WiskCredentials;

  constructor(
    credentials: ConnectorCredentials,
    config: ConnectorConfig,
    supabase: SupabaseClient
  ) {
    super(credentials, config, supabase);

    // Validate WISK-specific credentials
    const validatedCredentials = WiskCredentialsSchema.parse(credentials.credentials);
    this.wiskCredentials = validatedCredentials;

    // Create axios client with WISK configuration
    this.client = axios.create({
      baseURL: WISK_API_ENDPOINTS.BASE,
      headers: {
        'Authorization': `Bearer ${this.wiskCredentials.apiKey}`,
        'Content-Type': 'application/json',
        'X-Account-ID': this.wiskCredentials.accountId,
      },
      timeout: this.config.timeout || 30000,
    });

    // Set up request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        this.log('debug', 'WISK API Request', {
          method: config.method?.toUpperCase(),
          url: config.url,
          params: config.params,
        });
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Set up response interceptor for error handling and rate limiting
    this.client.interceptors.response.use(
      (response) => {
        this.log('debug', 'WISK API Response', {
          status: response.status,
          url: response.config.url,
          dataLength: Array.isArray(response.data?.data) ? response.data.data.length : 'single',
        });
        return response;
      },
      async (error: AxiosError) => {
        if (error.response?.status === 429) {
          // Rate limiting - wait and retry
          const retryAfter = parseInt(error.response.headers['retry-after'] || '60', 10);
          this.log('warn', `WISK API rate limited. Waiting ${retryAfter} seconds.`);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          return this.client.request(error.config!);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Test connection to WISK API
   */
  async testConnection(): Promise<FetchResult<any>> {
    const startTime = Date.now();
    
    try {
      this.log('info', 'Testing WISK API connection');
      
      const response = await this.client.get(WISK_API_ENDPOINTS.AUTH.VALIDATE);
      
      return {
        success: true,
        data: response.data,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const connectorError = this.handleError(error, 'test-connection');
      return {
        success: false,
        error: connectorError,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Validate WISK credentials
   */
  async validateCredentials(): Promise<boolean> {
    try {
      const result = await this.testConnection();
      return result.success;
    } catch (error) {
      this.log('error', 'Failed to validate WISK credentials', { error });
      return false;
    }
  }

  /**
   * Fetch inventory items from WISK
   */
  async fetchInventoryItems(
    locationId?: string,
    filters?: WiskInventoryFilters
  ): Promise<FetchResult<{ data: WiskInventoryItem[]; hasMore: boolean; total: number }>> {
    return this.fetchWithRetry(
      async () => {
        this.log('info', 'Fetching WISK inventory items', { locationId, filters });

        const params: any = {
          page_size: 100,
          ...filters,
        };

        if (locationId) {
          params.location_id = locationId;
        }

        const response = await this.client.get(WISK_API_ENDPOINTS.INVENTORY.ITEMS, { params });
        const responseData = response.data as WiskApiResponse<WiskInventoryItem[]>;

        if (!responseData.success || !responseData.data) {
          throw new Error(responseData.message || 'Failed to fetch inventory items');
        }

        return {
          data: responseData.data,
          hasMore: responseData.pagination?.hasNext || false,
          total: responseData.pagination?.total || responseData.data.length,
        };
      },
      'fetch-inventory-items'
    );
  }

  /**
   * Fetch stock movements from WISK
   */
  async fetchStockMovements(
    filters?: WiskMovementFilters
  ): Promise<FetchResult<{ data: WiskStockMovement[]; hasMore: boolean; total: number }>> {
    const startTime = Date.now();
    
    try {
      this.log('info', 'Fetching WISK stock movements', { filters });

      const params: any = {
        page_size: 100,
        ...filters,
      };

      const response = await this.client.get(WISK_API_ENDPOINTS.INVENTORY.MOVEMENTS, { params });
      const validatedData = WiskStockMovementsResponseSchema.parse(response.data);

      if (!validatedData.success || !validatedData.data) {
        throw new Error(validatedData.message || 'Failed to fetch stock movements');
      }

      return {
        success: true,
        data: {
          data: validatedData.data,
          hasMore: validatedData.pagination?.hasNext || false,
          total: validatedData.pagination?.total || validatedData.data.length,
        },
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const connectorError = this.handleError(error, 'fetch-stock-movements');
      return {
        success: false,
        error: connectorError,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Fetch suppliers from WISK
   */
  async fetchSuppliers(): Promise<FetchResult<{ data: WiskSupplier[]; hasMore: boolean; total: number }>> {
    const startTime = Date.now();
    
    try {
      this.log('info', 'Fetching WISK suppliers');

      const response = await this.client.get(WISK_API_ENDPOINTS.SUPPLIERS.LIST, {
        params: { page_size: 100 }
      });
      const validatedData = WiskSuppliersResponseSchema.parse(response.data);

      if (!validatedData.success || !validatedData.data) {
        throw new Error(validatedData.message || 'Failed to fetch suppliers');
      }

      return {
        success: true,
        data: {
          data: validatedData.data,
          hasMore: validatedData.pagination?.hasNext || false,
          total: validatedData.pagination?.total || validatedData.data.length,
        },
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const connectorError = this.handleError(error, 'fetch-suppliers');
      return {
        success: false,
        error: connectorError,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Fetch purchase orders from WISK
   */
  async fetchPurchaseOrders(
    locationId?: string
  ): Promise<FetchResult<{ data: WiskPurchaseOrder[]; hasMore: boolean; total: number }>> {
    const startTime = Date.now();
    
    try {
      this.log('info', 'Fetching WISK purchase orders', { locationId });

      const params: any = { page_size: 100 };
      if (locationId) {
        params.location_id = locationId;
      }

      const response = await this.client.get(WISK_API_ENDPOINTS.ORDERS.PURCHASE_ORDERS, { params });
      const validatedData = WiskPurchaseOrdersResponseSchema.parse(response.data);

      if (!validatedData.success || !validatedData.data) {
        throw new Error(validatedData.message || 'Failed to fetch purchase orders');
      }

      return {
        success: true,
        data: {
          data: validatedData.data,
          hasMore: validatedData.pagination?.hasNext || false,
          total: validatedData.pagination?.total || validatedData.data.length,
        },
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const connectorError = this.handleError(error, 'fetch-purchase-orders');
      return {
        success: false,
        error: connectorError,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Fetch recipes from WISK
   */
  async fetchRecipes(
    locationId?: string
  ): Promise<FetchResult<{ data: WiskRecipe[]; hasMore: boolean; total: number }>> {
    const startTime = Date.now();
    
    try {
      this.log('info', 'Fetching WISK recipes', { locationId });

      const params: any = { page_size: 100 };
      if (locationId) {
        params.location_id = locationId;
      }

      const response = await this.client.get(WISK_API_ENDPOINTS.RECIPES.LIST, { params });
      const validatedData = WiskRecipesResponseSchema.parse(response.data);

      if (!validatedData.success || !validatedData.data) {
        throw new Error(validatedData.message || 'Failed to fetch recipes');
      }

      return {
        success: true,
        data: {
          data: validatedData.data,
          hasMore: validatedData.pagination?.hasNext || false,
          total: validatedData.pagination?.total || validatedData.data.length,
        },
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const connectorError = this.handleError(error, 'fetch-recipes');
      return {
        success: false,
        error: connectorError,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Fetch locations from WISK
   */
  async fetchLocations(): Promise<FetchResult<{ data: WiskLocation[]; hasMore: boolean; total: number }>> {
    const startTime = Date.now();
    
    try {
      this.log('info', 'Fetching WISK locations');

      const response = await this.client.get(WISK_API_ENDPOINTS.LOCATIONS.LIST, {
        params: { page_size: 100 }
      });
      const validatedData = WiskLocationsResponseSchema.parse(response.data);

      if (!validatedData.success || !validatedData.data) {
        throw new Error(validatedData.message || 'Failed to fetch locations');
      }

      return {
        success: true,
        data: {
          data: validatedData.data,
          hasMore: validatedData.pagination?.hasNext || false,
          total: validatedData.pagination?.total || validatedData.data.length,
        },
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const connectorError = this.handleError(error, 'fetch-locations');
      return {
        success: false,
        error: connectorError,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Fetch waste entries from WISK
   */
  async fetchWasteEntries(
    locationId?: string,
    startDate?: string,
    endDate?: string
  ): Promise<FetchResult<{ data: WiskWasteEntry[]; hasMore: boolean; total: number }>> {
    const startTime = Date.now();
    
    try {
      this.log('info', 'Fetching WISK waste entries', { locationId, startDate, endDate });

      const params: any = { page_size: 100 };
      if (locationId) params.location_id = locationId;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const response = await this.client.get(WISK_API_ENDPOINTS.WASTE.ENTRIES, { params });
      const validatedData = WiskWasteEntriesResponseSchema.parse(response.data);

      if (!validatedData.success || !validatedData.data) {
        throw new Error(validatedData.message || 'Failed to fetch waste entries');
      }

      return {
        success: true,
        data: {
          data: validatedData.data,
          hasMore: validatedData.pagination?.hasNext || false,
          total: validatedData.pagination?.total || validatedData.data.length,
        },
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const connectorError = this.handleError(error, 'fetch-waste-entries');
      return {
        success: false,
        error: connectorError,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Fetch inventory analytics from WISK
   */
  async fetchInventoryAnalytics(
    locationId?: string,
    startDate?: string,
    endDate?: string
  ): Promise<FetchResult<WiskInventoryAnalytics>> {
    const startTime = Date.now();
    
    try {
      this.log('info', 'Fetching WISK inventory analytics', { locationId, startDate, endDate });

      const params: any = {};
      if (locationId) params.location_id = locationId;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const response = await this.client.get(WISK_API_ENDPOINTS.INVENTORY.ANALYTICS, { params });
      const validatedData = WiskAnalyticsResponseSchema.parse(response.data);

      if (!validatedData.success || !validatedData.data) {
        throw new Error(validatedData.message || 'Failed to fetch inventory analytics');
      }

      return {
        success: true,
        data: validatedData.data,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const connectorError = this.handleError(error, 'fetch-inventory-analytics');
      return {
        success: false,
        error: connectorError,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Transform stock movements to transactions for VenueSync compatibility
   */
  async fetchAllTransactions(
    locationId?: string,
    startDate?: string,
    endDate?: string
  ): Promise<FetchResult<WiskTransaction[]>> {
    const startTime = Date.now();
    
    try {
      this.log('info', 'Fetching all WISK transactions (transformed from stock movements)', { 
        locationId, startDate, endDate 
      });

      // Fetch stock movements
      const movementsResult = await this.fetchStockMovements({
        location_id: locationId,
        start_date: startDate,
        end_date: endDate,
      });

      if (!movementsResult.success || !movementsResult.data) {
        throw new Error('Failed to fetch stock movements for transaction transformation');
      }

      // Transform stock movements to transactions
      const transactions: WiskTransaction[] = movementsResult.data.data.map((movement) => {
        const transaction: WiskTransaction = {
          transaction_id: movement.id,
          item_id: movement.item_id,
          item_name: movement.item_name,
          movement_type: movement.movement_type,
          quantity: movement.quantity,
          unit_cost: movement.cost_per_unit || 0,
          total_amount: movement.total_cost || 0,
          currency: 'USD', // Default, should be from location settings
          location_id: movement.location_id,
          location_name: movement.location_name,
          reference_type: movement.movement_type,
          reference_id: movement.reference_id,
          user_id: movement.user_id,
          user_name: movement.user_name,
          notes: movement.reason,
          timestamp: movement.timestamp,
          created_at: movement.created_at,
          updated_at: movement.created_at,
          source: 'wisk' as const,
        };

        // Validate the transaction
        return WiskTransactionSchema.parse(transaction);
      });

      this.log('info', `Transformed ${transactions.length} stock movements to transactions`);

      return {
        success: true,
        data: transactions,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const connectorError = this.handleError(error, 'fetch-all-transactions');
      return {
        success: false,
        error: connectorError,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Save transactions to database
   */
  async saveTransactions(
    transactions: WiskTransaction[],
    snapshotTimestamp: string
  ): Promise<FetchResult<number>> {
    const startTime = Date.now();
    
    try {
      this.log('info', `Saving ${transactions.length} WISK transactions to database`);

      // Add snapshot timestamp to each transaction
      const transactionsWithSnapshot = transactions.map(transaction => ({
        ...transaction,
        snapshot_timestamp: snapshotTimestamp,
      }));

      const { error } = await this.supabase
        .from('wisk_transactions')
        .insert(transactionsWithSnapshot);

      if (error) {
        throw error;
      }

      this.log('info', `Successfully saved ${transactions.length} WISK transactions`);

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
   * Handle WISK-specific errors
   */
  protected handleError(error: any, operation: string): ConnectorError {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      
      // Handle WISK-specific error responses
      if (axiosError.response?.data && typeof axiosError.response.data === 'object') {
        const errorData = axiosError.response.data as any;
        
        return {
          message: errorData.message || errorData.error || axiosError.message,
          code: errorData.code || `WISK_${axiosError.response.status}`,
          details: { ...errorData, operation },
          timestamp: new Date(),
          retryable: axiosError.response.status >= 500 || axiosError.response.status === 429,
        };
      }
    }

    return super.handleError(error, operation);
  }
}