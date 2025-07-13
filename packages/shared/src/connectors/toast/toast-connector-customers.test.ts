import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { ToastConnector } from './toast-connector';
import { createMockSupabaseClient } from '../test-utils';
import type { ToastCustomer, ToastEmployee } from './types';

vi.mock('axios');

describe('ToastConnector - Customers and Team Members', () => {
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

  describe('fetchCustomers', () => {
    it('should return empty customers (Toast API limitation)', async () => {
      const result = await connector.fetchCustomers();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        data: [],
        hasMore: false,
      });
      // No API call expected as Toast doesn't have direct customer endpoint
    });

    it('should return empty customers with date filter', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await connector.fetchCustomers(undefined, { gte: startDate, lte: endDate });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        data: [],
        hasMore: false,
      });
    });

    it('should handle API limitations gracefully', async () => {
      const result = await connector.fetchCustomers();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        data: [],
        hasMore: false,
      });
    });
  });

  describe('fetchTeamMembers', () => {
    it('should fetch team members successfully', async () => {
      const mockTeamMembers: ToastEmployee[] = [
        {
          guid: 'TM123',
          entityType: 'Employee',
          firstName: 'Alice',
          lastName: 'Johnson',
          email: 'alice@example.com',
          createdDate: '2024-01-01T00:00:00Z',
        },
        {
          guid: 'TM456',
          entityType: 'Employee', 
          firstName: 'Bob',
          lastName: 'Owner',
          email: 'bob@example.com',
          createdDate: '2024-01-01T00:00:00Z',
        },
      ];

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockTeamMembers,
      });

      const result = await connector.fetchTeamMembers(['LOC123']);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        data: mockTeamMembers,
        hasMore: false,
        nextCursor: undefined,
      });
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/labor/v1/employees', {
        params: {
          restaurantGuid: 'test-location-guid',
        },
      });
    });

    it('should handle empty team members response', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: [],
      });

      const result = await connector.fetchTeamMembers(['LOC123']);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        data: [],
        hasMore: false,
      });
    });
  });

  // fetchAllCustomers not implemented for Toast (no direct customer API)

  // fetchAllTeamMembers not implemented for Toast (single request only)
});