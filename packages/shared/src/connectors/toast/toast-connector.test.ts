import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

import { 
  createMockSupabaseClient, 
  createMockCredentials, 
  createMockConfig
} from '../test-utils';
import { ToastConnector } from './toast-connector';
import type { ToastOrder } from './types';

vi.mock('axios', () => ({
  default: {
    create: vi.fn(),
    post: vi.fn(),
  },
}));

describe('ToastConnector', () => {
  let connector: ToastConnector;
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  let mockAxiosInstance: any;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    
    mockAxiosInstance = {
      get: vi.fn(),
      post: vi.fn(),
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
    
    const credentials = createMockCredentials('toast', {
      credentials: {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        locationGuid: 'test-location-guid',
        environment: 'sandbox',
      },
    });
    
    connector = new ToastConnector(
      credentials,
      createMockConfig(),
      mockSupabase
    );
  });

  describe('constructor', () => {
    it('should initialize with sandbox URL when environment is sandbox', () => {
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://ws-sandbox-api.toasttab.com',
        })
      );
    });

    it('should initialize with production URL when environment is production', () => {
      const credentials = createMockCredentials('toast', {
        credentials: {
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
          locationGuid: 'test-location-guid',
          environment: 'production',
        },
      });
      
      new ToastConnector(credentials, createMockConfig(), mockSupabase);
      
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://ws-api.toasttab.com',
        })
      );
    });

    it('should set up request interceptors for OAuth authentication', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('testConnection', () => {
    it('should successfully test connection', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { locations: [{ id: 'loc1', name: 'Test Location' }] },
      });

      const result = await connector.testConnection();

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/config/v2/restaurants');
    });

    it('should handle connection errors', async () => {
      mockAxiosInstance.get.mockRejectedValueOnce(new Error('Network error'));

      const result = await connector.testConnection();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('fetchOrders', () => {
    it('should fetch orders with correct parameters', async () => {
      const mockOrders: ToastOrder[] = [{
        guid: 'order1',
        businessDate: 20240101,
        createdDate: '2024-01-01T00:00:00Z',
        modifiedDate: '2024-01-01T00:00:00Z',
        checks: [{
          guid: 'check1',
          amount: 10.00,
          payments: [{
            guid: 'payment1',
            amount: 10.00,
            tipAmount: 1.50,
            type: 'CREDIT',
          }],
        }],
      }];

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockOrders,
      });

      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-02T00:00:00Z');
      const result = await connector.fetchOrders('loc1', startTime, endTime);

      expect(result.success).toBe(true);
      expect(result.data?.data).toEqual(mockOrders);
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/orders/v2/orders', {
        params: {
          restaurantGuid: 'loc1',
          businessDate: '20231231',
          endBusinessDate: '20240101',
          pageSize: 100,
        },
      });
    });

    it('should handle Toast API errors', async () => {
      mockAxiosInstance.get.mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            error: 'Invalid restaurant GUID',
          },
        },
      });

      const result = await connector.fetchOrders('invalid', new Date(), new Date());

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('fetchAllTransactions', () => {
    it('should transform order and payment data correctly', async () => {
      const mockOrders: ToastOrder[] = [{
        guid: 'order1',
        businessDate: 20240101,
        createdDate: '2024-01-01T00:00:00Z',
        modifiedDate: '2024-01-01T00:00:00Z',
        checks: [{
          guid: 'check1',
          amount: 10.00,
          taxAmount: 0.80,
          appliedDiscountAmount: 0.50,
          appliedServiceCharges: [{ guid: 'sc1', name: 'Service Charge', amount: 0.20 }],
          selections: [{
            guid: 'item1',
            itemGroup: { guid: 'group1', name: 'Food' },
            item: { guid: 'item1', name: 'Burger' },
            quantity: 2,
          }],
          payments: [{
            guid: 'payment1',
            amount: 11.00,
            tipAmount: 1.00,
            type: 'CREDIT',
          }],
        }],
      }];

      // Mock auth token request
      (axios.post as any).mockResolvedValueOnce({
        data: {
          token: {
            accessToken: 'test-token',
            tokenType: 'Bearer',
            expiresIn: 3600,
            scope: 'read',
          },
        },
      });

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockOrders,
      });

      const result = await connector.fetchAllTransactions('loc1', new Date(), new Date());

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      
      const transformed = result.data![0];
      expect(transformed.transaction_id).toBe('payment1');
      expect(transformed.total_amount).toBe(1100); // $11.00 in cents
      expect(transformed.tip_amount).toBe(100); // $1.00 in cents
      expect(transformed.tax_amount).toBe(80); // $0.80 in cents
      expect(transformed.discount_amount).toBe(50); // $0.50 in cents
      expect(transformed.service_charge_amount).toBe(20); // $0.20 in cents
      expect(transformed.item_count).toBe(2);
      expect(transformed.unique_item_count).toBe(1);
    });
  });

  describe('saveTransactions', () => {
    it('should save transactions to database', async () => {
      const transactions = [{
        transaction_id: 'tx1',
        location_id: 'loc1',
        created_at: '2024-01-01T00:00:00Z',
        total_amount: 1000,
        tax_amount: 80,
        tip_amount: 100,
        discount_amount: 0,
        service_charge_amount: 0,
        source_type: 'CARD',
        status: 'COMPLETED',
        receipt_number: undefined,
        receipt_url: undefined,
        customer_id: undefined,
        customer_name: undefined,
        customer_email: undefined,
        team_member_id: undefined,
        device_id: undefined,
        item_count: 1,
        unique_item_count: 1,
        itemizations: undefined,
        payment_details: undefined,
        refunds: undefined,
      }];

      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.from = vi.fn().mockReturnValue({
        insert: mockInsert,
      });

      const result = await connector.saveTransactions(transactions, '2024-01-01T00:00:00Z');

      expect(result.success).toBe(true);
      expect(result.data).toBe(1);
      expect(mockSupabase.from).toHaveBeenCalledWith('toast_transactions');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            transaction_id: 'tx1',
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
        transaction_id: 'tx1',
        location_id: 'loc1',
        created_at: '2024-01-01T00:00:00Z',
        total_amount: 1000,
        tax_amount: 80,
        tip_amount: 100,
        discount_amount: 0,
        service_charge_amount: 0,
        source_type: 'CARD',
        status: 'COMPLETED',
        receipt_number: undefined,
        receipt_url: undefined,
        customer_id: undefined,
        customer_name: undefined,
        customer_email: undefined,
        team_member_id: undefined,
        device_id: undefined,
        item_count: 1,
        unique_item_count: 1,
        itemizations: undefined,
        payment_details: undefined,
        refunds: undefined,
      }];
      const result = await connector.saveTransactions(transactions, '2024-01-01T00:00:00Z');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});