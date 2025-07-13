import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { ToastConnector } from './toast-connector';
import { createMockSupabaseClient } from '../test-utils';
import type { ToastPayment, ToastOrder, ToastCustomer } from './types';

vi.mock('axios');

describe('ToastConnector - Performance Tests', () => {
  let connector: ToastConnector;
  let mockAxiosInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
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
    
    const mockSupabase = createMockSupabaseClient();
    
    connector = new ToastConnector(
      {
        id: 'test-id',
        service: 'toast',
        credentials: {
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
          locationGuid: 'test-location-guid',
          environment: 'sandbox',
        },
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {},
      mockSupabase
    );
  });

  describe('Large Dataset Handling', () => {
    it('should handle fetching 10,000 payments across multiple pages', async () => {
      const paymentsPerPage = 100;
      const totalPayments = 10000;
      const pageCount = totalPayments / paymentsPerPage;
      
      // Track memory usage
      const startMemory = process.memoryUsage().heapUsed;
      
      // Mock auth token for Toast
      (axios.post as any).mockResolvedValue({
        data: {
          token: {
            accessToken: 'test-token',
            tokenType: 'Bearer',
            expiresIn: 3600,
            scope: 'read',
          },
        },
      });

      // Mock all responses at once since fetchAllTransactions will paginate
      const allOrders: any[] = Array.from({ length: totalPayments }, (_, j) => ({
        guid: `ORDER${j}`,
        entityType: 'Order',
        createdDate: new Date().toISOString(),
        checks: [{
          guid: `CHECK${j}`,
          entityType: 'Check',
          payments: [{
            guid: `PAY${j}`,
            entityType: 'Payment',
            amount: 10.00,
            tipAmount: 0,
            type: 'CREDIT',
          }],
        }],
      }));
      
      // Mock the first page with 100 items (pageSize)
      for (let i = 0; i < pageCount; i++) {
        const startIdx = i * paymentsPerPage;
        const endIdx = Math.min(startIdx + paymentsPerPage, totalPayments);
        const pageOrders = allOrders.slice(startIdx, endIdx);
        
        mockAxiosInstance.get.mockResolvedValueOnce({
          data: pageOrders,
        });
      }
      
      const startTime = Date.now();
      const result = await connector.fetchAllTransactions(
        'LOC123',
        new Date('2024-01-01'),
        new Date('2024-12-31')
      );
      const duration = Date.now() - startTime;
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(totalPayments);
      expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
      
      // Check memory usage didn't explode
      const endMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (endMemory - startMemory) / 1024 / 1024; // MB
      expect(memoryIncrease).toBeLessThan(100); // Should use less than 100MB
    });

    it('should handle fetching large orders with many line items', async () => {
      const ordersWithManyItems = Array.from({ length: 100 }, (_, i) => ({
        guid: `ORDER${i}`,
        entityType: 'Order',
        createdDate: new Date().toISOString(),
        checks: [{
          guid: `CHECK${i}`,
          entityType: 'Check',
          selections: Array.from({ length: 50 }, (_, j) => ({
            guid: `ITEM${i}-${j}`,
            entityType: 'Selection',
            quantity: 1,
          })),
          payments: [{
            guid: `PAY${i}`,
            entityType: 'Payment',
            amount: 500.00,
            type: 'CREDIT',
          }],
        }],
      }));

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: ordersWithManyItems,
      });

      const startTime = Date.now();
      const result = await connector.fetchOrders(
        'LOC123',
        new Date('2024-01-01'),
        new Date('2024-12-31')
      );
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.data?.data).toHaveLength(100);
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle multiple concurrent API calls efficiently', async () => {
      // Mock responses for different endpoints
      mockAxiosInstance.get.mockImplementation((url: string) => {
        if (url === '/orders/v2/orders') {
          return Promise.resolve({
            data: Array.from({ length: 100 }, (_, i) => ({
              guid: `ORDER${i}`,
              entityType: 'Order',
              createdDate: new Date().toISOString(),
              checks: [{
                guid: `CHECK${i}`,
                entityType: 'Check',
                payments: [{
                  guid: `PAY${i}`,
                  entityType: 'Payment',
                  amount: 10.00,
                  type: 'CREDIT',
                }],
              }],
            })),
          });
        } else if (url === '/labor/v1/employees') {
          return Promise.resolve({
            data: Array.from({ length: 20 }, (_, i) => ({
              guid: `EMP${i}`,
              entityType: 'Employee',
              firstName: `Employee${i}`,
              lastName: 'Test',
              email: `emp${i}@example.com`,
            })),
          });
        }
        return Promise.resolve({ data: [] });
      });

      // Mock auth token
      (axios.post as any).mockResolvedValue({
        data: {
          token: {
            accessToken: 'test-token',
            tokenType: 'Bearer',
            expiresIn: 3600,
            scope: 'read',
          },
        },
      });

      const startTime = Date.now();
      
      // Execute multiple API calls concurrently
      const [orders, customers, teamMembers] = await Promise.all([
        connector.fetchOrders('LOC123', new Date('2024-01-01'), new Date('2024-12-31')),
        connector.fetchCustomers(),
        connector.fetchTeamMembers(['LOC123']),
      ]);
      
      const duration = Date.now() - startTime;

      expect(orders.success).toBe(true);
      expect(customers.success).toBe(true);
      expect(teamMembers.success).toBe(true);
      
      // All concurrent requests should complete quickly
      expect(duration).toBeLessThan(500); // Should complete in under 500ms
    });
  });

  describe('Memory Efficiency', () => {
    it('should not accumulate memory when processing large datasets', async () => {
      const iterations = 10;
      const memoryUsages: number[] = [];
      
      for (let iter = 0; iter < iterations; iter++) {
        // Mock returns empty for Toast (no customer API)
        // No mock needed as fetchCustomers returns static empty result
        
        await connector.fetchCustomers();
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
        
        memoryUsages.push(process.memoryUsage().heapUsed);
      }
      
      // Memory usage should stabilize and not continuously grow
      const firstHalf = memoryUsages.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
      const secondHalf = memoryUsages.slice(5).reduce((a, b) => a + b, 0) / 5;
      const memoryGrowth = (secondHalf - firstHalf) / firstHalf;
      
      // Memory growth should be less than 20%
      expect(memoryGrowth).toBeLessThan(0.2);
    });
  });

  describe('Error Recovery Performance', () => {
    it('should handle intermittent failures without significant performance degradation', async () => {
      let callCount = 0;
      let failureCount = 0;
      mockAxiosInstance.get.mockImplementation(() => {
        callCount++;
        // Fail on specific calls to test retry logic, but not too many
        if (callCount === 2 || callCount === 5) {
          failureCount++;
          if (failureCount <= 2) { // Only fail twice per call to allow retries to succeed
            return Promise.reject({ 
              code: 'ECONNREFUSED',
              message: 'Network error' 
            });
          }
        }
        return Promise.resolve({
          data: Array.from({ length: 50 }, (_, i) => ({
            guid: `ORDER${callCount}-${i}`,
            entityType: 'Order',
            createdDate: new Date().toISOString(),
            checks: [{
              guid: `CHECK${callCount}-${i}`,
              entityType: 'Check',
              payments: [{
                guid: `PAY${callCount}-${i}`,
                entityType: 'Payment',
                amount: 10.00,
                type: 'CREDIT',
              }],
            }],
          })),
        });
      });
      
      const startTime = Date.now();
      const result = await connector.fetchAllTransactions(
        'LOC123',
        new Date('2024-01-01'),
        new Date('2024-12-31')
      );
      const duration = Date.now() - startTime;
      
      expect(result.success).toBe(true);
      // Despite failures and retries, should still complete reasonably quickly
      expect(duration).toBeLessThan(10000); // 10 seconds with retries
    });
  });

  describe('Rate Limit Handling Performance', () => {
    it('should handle rate limit responses efficiently', async () => {
      let callCount = 0;
      mockAxiosInstance.get.mockImplementation(() => {
        callCount++;
        // Simulate rate limit on every 5th call
        if (callCount % 5 === 0) {
          return Promise.reject({
            response: { 
              status: 429,
              headers: {
                'retry-after': '1',
              },
            },
          });
        }
        return Promise.resolve({
          data: Array.from({ length: 100 }, (_, i) => ({
            guid: `ORDER${callCount}-${i}`,
            entityType: 'Order',
            createdDate: new Date().toISOString(),
            checks: [{
              guid: `CHECK${callCount}-${i}`,
              entityType: 'Check',
              payments: [{
                guid: `PAY${callCount}-${i}`,
                entityType: 'Payment',
                amount: 10.00,
                type: 'CREDIT',
              }],
            }],
          })),
        });
      });
      
      const startTime = Date.now();
      const result = await connector.fetchOrders(
        'LOC123',
        new Date('2024-01-01'),
        new Date('2024-12-31')
      );
      const duration = Date.now() - startTime;
      
      expect(result.success).toBe(true);
      // Should handle rate limits gracefully
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});