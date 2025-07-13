import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

import { 
  createMockSupabaseClient, 
  createMockCredentials, 
  createMockConfig
} from '../test-utils';
import { WiskConnector } from './wisk-connector';
import type { 
  WiskInventoryItem, 
  WiskStockMovement, 
  WiskSupplier,
  WiskPurchaseOrder,
  WiskRecipe,
  WiskLocation,
  WiskWasteEntry,
  WiskInventoryAnalytics
} from './types';

vi.mock('axios', () => ({
  default: {
    create: vi.fn(),
    isAxiosError: vi.fn(),
  },
}));

describe.skip('WiskConnector', () => {
  let connector: WiskConnector;
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
    
    const credentials = createMockCredentials('wisk', {
      credentials: {
        apiKey: 'test-api-key',
        accountId: 'test-account-id',
        environment: 'production',
      },
    });
    
    connector = new WiskConnector(
      credentials,
      createMockConfig(),
      mockSupabase
    );
  });

  describe('constructor', () => {
    it('should initialize with correct base URL', () => {
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://api.wisk.ai/v1',
        })
      );
    });

    it('should set authorization header with API key', () => {
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key',
            'X-Account-ID': 'test-account-id',
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
        data: { success: true, message: 'Connection successful' },
        status: 200,
      });

      const result = await connector.testConnection();

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/auth/validate');
    });

    it('should handle connection errors', async () => {
      mockAxiosInstance.get.mockRejectedValueOnce(new Error('Unauthorized'));

      const result = await connector.testConnection();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('fetchInventoryItems', () => {
    it('should fetch inventory items with correct parameters', async () => {
      const mockItems: WiskInventoryItem[] = [{
        id: 'item123',
        name: 'Premium Vodka',
        description: 'High-quality vodka for cocktails',
        sku: 'VOD001',
        barcode: '1234567890123',
        category_id: 'cat123',
        category_name: 'Spirits',
        unit_of_measure: 'bottle',
        cost_per_unit: 25.99,
        supplier_id: 'sup123',
        supplier_name: 'Premium Spirits Co',
        current_stock: 24,
        minimum_stock: 5,
        maximum_stock: 50,
        reorder_point: 10,
        location_id: 'loc123',
        location_name: 'Main Bar',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        is_active: true,
        is_recipe_ingredient: true,
      }];

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: mockItems,
          pagination: {
            page: 1,
            limit: 100,
            total: 1,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          },
        },
      });

      const result = await connector.fetchInventoryItems('loc123');

      expect(result.success).toBe(true);
      expect(result.data?.data).toEqual(mockItems);
      expect(result.data?.hasMore).toBe(false);
      expect(result.data?.total).toBe(1);
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/inventory/items',
        {
          params: {
            page_size: 100,
            location_id: 'loc123',
          },
        }
      );
    });

    it('should handle API errors', async () => {
      mockAxiosInstance.get.mockRejectedValueOnce({
        response: {
          status: 401,
          data: {
            success: false,
            message: 'Invalid API key',
          },
        },
      });

      const result = await connector.fetchInventoryItems();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('fetchStockMovements', () => {
    it('should fetch stock movements with correct parameters', async () => {
      const mockMovements: WiskStockMovement[] = [{
        id: 'mov123',
        item_id: 'item123',
        item_name: 'Premium Vodka',
        movement_type: 'sale',
        quantity: -2,
        cost_per_unit: 25.99,
        total_cost: 51.98,
        reason: 'Customer order',
        reference_id: 'order456',
        location_id: 'loc123',
        location_name: 'Main Bar',
        user_id: 'user123',
        user_name: 'John Bartender',
        timestamp: '2024-01-01T20:00:00Z',
        created_at: '2024-01-01T20:00:00Z',
      }];

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: mockMovements,
          pagination: {
            page: 1,
            limit: 100,
            total: 1,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          },
        },
      });

      const filters = {
        start_date: '2024-01-01T00:00:00Z',
        end_date: '2024-01-02T00:00:00Z',
      };

      const result = await connector.fetchStockMovements(filters);

      expect(result.success).toBe(true);
      expect(result.data?.data).toEqual(mockMovements);
      expect(result.data?.hasMore).toBe(false);
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/inventory/movements',
        {
          params: {
            page_size: 100,
            start_date: '2024-01-01T00:00:00Z',
            end_date: '2024-01-02T00:00:00Z',
          },
        }
      );
    });
  });

  describe('fetchSuppliers', () => {
    it('should fetch suppliers with correct parameters', async () => {
      const mockSuppliers: WiskSupplier[] = [{
        id: 'sup123',
        name: 'Premium Spirits Co',
        contact_name: 'Jane Smith',
        email: 'jane@premiumspirits.com',
        phone: '+1234567890',
        address: {
          street: '123 Distillery Lane',
          city: 'Spirits City',
          state: 'CA',
          postal_code: '12345',
          country: 'USA',
        },
        payment_terms: 'Net 30',
        currency: 'USD',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }];

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: mockSuppliers,
          pagination: {
            page: 1,
            limit: 100,
            total: 1,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          },
        },
      });

      const result = await connector.fetchSuppliers();

      expect(result.success).toBe(true);
      expect(result.data?.data).toEqual(mockSuppliers);
      expect(result.data?.hasMore).toBe(false);
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/suppliers',
        {
          params: { page_size: 100 }
        }
      );
    });
  });

  describe('fetchPurchaseOrders', () => {
    it('should fetch purchase orders with correct parameters', async () => {
      const mockOrders: WiskPurchaseOrder[] = [{
        id: 'order123',
        supplier_id: 'sup123',
        supplier_name: 'Premium Spirits Co',
        order_number: 'PO-2024-001',
        status: 'received',
        order_date: '2024-01-01T00:00:00Z',
        expected_delivery_date: '2024-01-03T00:00:00Z',
        actual_delivery_date: '2024-01-03T10:00:00Z',
        subtotal: 500.00,
        tax_amount: 50.00,
        total_amount: 550.00,
        currency: 'USD',
        location_id: 'loc123',
        location_name: 'Main Bar',
        notes: 'Urgent delivery needed',
        items: [{
          id: 'poi123',
          item_id: 'item123',
          item_name: 'Premium Vodka',
          sku: 'VOD001',
          quantity_ordered: 20,
          quantity_received: 20,
          unit_cost: 25.00,
          total_cost: 500.00,
          unit_of_measure: 'bottle',
        }],
        created_by: 'user123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-03T10:00:00Z',
      }];

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: mockOrders,
          pagination: {
            page: 1,
            limit: 100,
            total: 1,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          },
        },
      });

      const result = await connector.fetchPurchaseOrders('loc123');

      expect(result.success).toBe(true);
      expect(result.data?.data).toEqual(mockOrders);
      expect(result.data?.hasMore).toBe(false);
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/orders/purchase',
        {
          params: {
            page_size: 100,
            location_id: 'loc123',
          }
        }
      );
    });
  });

  describe('fetchRecipes', () => {
    it('should fetch recipes with correct parameters', async () => {
      const mockRecipes: WiskRecipe[] = [{
        id: 'recipe123',
        name: 'Moscow Mule',
        description: 'Classic cocktail with vodka and ginger beer',
        category: 'Cocktails',
        serving_size: 1,
        cost_per_serving: 4.50,
        prep_time_minutes: 3,
        instructions: 'Mix vodka with ginger beer, add lime juice, serve in copper mug',
        ingredients: [{
          id: 'ing123',
          item_id: 'item123',
          item_name: 'Premium Vodka',
          quantity: 2,
          unit_of_measure: 'oz',
          cost_per_unit: 1.50,
          total_cost: 3.00,
          notes: 'Use premium vodka for best results',
        }],
        yield_quantity: 1,
        yield_unit: 'cocktail',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }];

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: mockRecipes,
          pagination: {
            page: 1,
            limit: 100,
            total: 1,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          },
        },
      });

      const result = await connector.fetchRecipes('loc123');

      expect(result.success).toBe(true);
      expect(result.data?.data).toEqual(mockRecipes);
      expect(result.data?.hasMore).toBe(false);
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/recipes',
        {
          params: {
            page_size: 100,
            location_id: 'loc123',
          }
        }
      );
    });
  });

  describe('fetchLocations', () => {
    it('should fetch locations with correct parameters', async () => {
      const mockLocations: WiskLocation[] = [{
        id: 'loc123',
        name: 'Main Bar',
        type: 'bar',
        address: {
          street: '456 Bar Street',
          city: 'Downtown',
          state: 'CA',
          postal_code: '12345',
          country: 'USA',
        },
        phone: '+1234567890',
        email: 'mainbar@venue.com',
        manager_name: 'Sarah Manager',
        timezone: 'America/Los_Angeles',
        currency: 'USD',
        is_active: true,
        settings: {
          auto_reorder: true,
          waste_tracking: true,
          recipe_costing: true,
          supplier_integration: true,
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }];

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: mockLocations,
          pagination: {
            page: 1,
            limit: 100,
            total: 1,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          },
        },
      });

      const result = await connector.fetchLocations();

      expect(result.success).toBe(true);
      expect(result.data?.data).toEqual(mockLocations);
      expect(result.data?.hasMore).toBe(false);
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/locations',
        {
          params: { page_size: 100 }
        }
      );
    });
  });

  describe('fetchWasteEntries', () => {
    it('should fetch waste entries with correct parameters', async () => {
      const mockWasteEntries: WiskWasteEntry[] = [{
        id: 'waste123',
        item_id: 'item123',
        item_name: 'Premium Vodka',
        quantity: 1,
        unit_of_measure: 'bottle',
        cost_per_unit: 25.99,
        total_cost: 25.99,
        reason: 'damage',
        description: 'Bottle broken during service',
        location_id: 'loc123',
        location_name: 'Main Bar',
        recorded_by: 'user123',
        recorded_at: '2024-01-01T20:00:00Z',
        created_at: '2024-01-01T20:00:00Z',
      }];

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: mockWasteEntries,
          pagination: {
            page: 1,
            limit: 100,
            total: 1,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          },
        },
      });

      const result = await connector.fetchWasteEntries(
        'loc123',
        '2024-01-01T00:00:00Z',
        '2024-01-02T00:00:00Z'
      );

      expect(result.success).toBe(true);
      expect(result.data?.data).toEqual(mockWasteEntries);
      expect(result.data?.hasMore).toBe(false);
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/waste/entries',
        {
          params: {
            page_size: 100,
            location_id: 'loc123',
            start_date: '2024-01-01T00:00:00Z',
            end_date: '2024-01-02T00:00:00Z',
          }
        }
      );
    });
  });

  describe('fetchInventoryAnalytics', () => {
    it('should fetch inventory analytics with correct parameters', async () => {
      const mockAnalytics: WiskInventoryAnalytics = {
        period_start: '2024-01-01T00:00:00Z',
        period_end: '2024-01-31T23:59:59Z',
        location_id: 'loc123',
        location_name: 'Main Bar',
        total_inventory_value: 15000.00,
        total_purchases: 8000.00,
        total_sales: 25000.00,
        total_waste: 500.00,
        waste_percentage: 2.0,
        top_selling_items: [{
          item_id: 'item123',
          item_name: 'Premium Vodka',
          quantity: 150,
          value: 3897.50,
          percentage_of_total: 15.59,
        }],
        top_waste_items: [{
          item_id: 'item456',
          item_name: 'Draft Beer',
          quantity: 5,
          value: 75.00,
          percentage_of_total: 15.0,
        }],
        low_stock_items: [],
        currency: 'USD',
      };

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: mockAnalytics,
        },
      });

      const result = await connector.fetchInventoryAnalytics(
        'loc123',
        '2024-01-01T00:00:00Z',
        '2024-01-31T23:59:59Z'
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockAnalytics);
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/inventory/analytics',
        {
          params: {
            location_id: 'loc123',
            start_date: '2024-01-01T00:00:00Z',
            end_date: '2024-01-31T23:59:59Z',
          }
        }
      );
    });
  });

  describe('fetchAllTransactions', () => {
    it('should transform stock movements to transactions correctly', async () => {
      const mockMovements: WiskStockMovement[] = [{
        id: 'mov123',
        item_id: 'item123',
        item_name: 'Premium Vodka',
        movement_type: 'sale',
        quantity: -2,
        cost_per_unit: 25.99,
        total_cost: 51.98,
        reason: 'Customer order',
        reference_id: 'order456',
        location_id: 'loc123',
        location_name: 'Main Bar',
        user_id: 'user123',
        user_name: 'John Bartender',
        timestamp: '2024-01-01T20:00:00Z',
        created_at: '2024-01-01T20:00:00Z',
      }];

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: mockMovements,
          pagination: {
            page: 1,
            limit: 100,
            total: 1,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          },
        },
      });

      const result = await connector.fetchAllTransactions('loc123');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      
      const transformed = result.data![0];
      expect(transformed.transaction_id).toBe('mov123');
      expect(transformed.item_id).toBe('item123');
      expect(transformed.item_name).toBe('Premium Vodka');
      expect(transformed.movement_type).toBe('sale');
      expect(transformed.quantity).toBe(-2);
      expect(transformed.unit_cost).toBe(25.99);
      expect(transformed.total_amount).toBe(51.98);
      expect(transformed.currency).toBe('USD');
      expect(transformed.location_id).toBe('loc123');
      expect(transformed.source).toBe('wisk');
    });
  });

  describe('saveTransactions', () => {
    it('should save transactions to database', async () => {
      const transactions = [{
        transaction_id: 'mov123',
        item_id: 'item123',
        item_name: 'Premium Vodka',
        movement_type: 'sale',
        quantity: -2,
        unit_cost: 25.99,
        total_amount: 51.98,
        currency: 'USD',
        location_id: 'loc123',
        location_name: 'Main Bar',
        timestamp: '2024-01-01T20:00:00Z',
        created_at: '2024-01-01T20:00:00Z',
        updated_at: '2024-01-01T20:00:00Z',
        source: 'wisk' as const,
      }];

      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.from = vi.fn().mockReturnValue({
        insert: mockInsert,
      });

      const result = await connector.saveTransactions(transactions, '2024-01-01T00:00:00Z');

      expect(result.success).toBe(true);
      expect(result.data).toBe(1);
      expect(mockSupabase.from).toHaveBeenCalledWith('wisk_transactions');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            transaction_id: 'mov123',
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
        transaction_id: 'mov123',
        item_id: 'item123',
        item_name: 'Premium Vodka',
        movement_type: 'sale',
        quantity: -2,
        unit_cost: 25.99,
        total_amount: 51.98,
        currency: 'USD',
        timestamp: '2024-01-01T20:00:00Z',
        created_at: '2024-01-01T20:00:00Z',
        updated_at: '2024-01-01T20:00:00Z',
        source: 'wisk' as const,
      }];
      
      const result = await connector.saveTransactions(transactions, '2024-01-01T00:00:00Z');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});