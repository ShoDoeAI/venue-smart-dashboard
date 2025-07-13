import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { 
  createMockSupabaseClient, 
  createMockCredentials, 
  createMockConfig,
  TestConnector,
  mockDateNow
} from './test-utils';
import { ConnectorErrorCode } from './types';

describe('BaseConnector', () => {
  let connector: TestConnector;
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  let restoreDateNow: () => void;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    connector = new TestConnector(
      createMockCredentials('toast'),
      createMockConfig(),
      mockSupabase
    );
    restoreDateNow = mockDateNow(1000);
  });

  afterEach(() => {
    restoreDateNow();
    vi.clearAllMocks();
  });

  describe('fetchWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const mockData = { result: 'success' };
      const fetchFn = vi.fn().mockResolvedValue(mockData);

      const result = await connector.testFetchWithRetry(fetchFn, 'test');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on network error', async () => {
      const mockData = { result: 'success' };
      const networkError = new Error('Network error') as Error & { code: string };
      networkError.code = 'ENOTFOUND';
      
      const fetchFn = vi.fn()
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(mockData);

      const result = await connector.testFetchWithRetry(fetchFn, 'test');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(fetchFn).toHaveBeenCalledTimes(2);
    });

    it('should not retry on auth error', async () => {
      const authError = {
        response: { status: 401, data: 'Unauthorized' }
      };
      
      const fetchFn = vi.fn().mockRejectedValue(authError);

      const result = await connector.testFetchWithRetry(fetchFn, 'test');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ConnectorErrorCode.AUTH_FAILED);
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it('should respect max retries', async () => {
      const networkError = new Error('Network error') as Error & { code: string };
      networkError.code = 'ENOTFOUND';
      
      const fetchFn = vi.fn().mockRejectedValue(networkError);

      const result = await connector.testFetchWithRetry(fetchFn, 'test');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ConnectorErrorCode.NETWORK_ERROR);
      // Initial attempt fails, attempt becomes 1, shouldRetry returns true
      // Second attempt fails, attempt becomes 2, shouldRetry returns false
      // Loop also continues while attempt <= maxRetries, but we still get initial + 2 retries
      expect(fetchFn).toHaveBeenCalledTimes(3);
    });

    it('should handle timeout errors', async () => {
      const fetchFn = vi.fn().mockImplementation(
        () => new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      connector = new TestConnector(
        createMockCredentials('toast'),
        createMockConfig({ timeout: 50 }),
        mockSupabase
      );

      const result = await connector.testFetchWithRetry(fetchFn, 'test');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ConnectorErrorCode.TIMEOUT);
    });
  });

  describe('retry delay calculation', () => {
    it('should calculate exponential backoff correctly', () => {
      expect(connector.testCalculateRetryDelay(1)).toBe(100); // initialDelay
      expect(connector.testCalculateRetryDelay(2)).toBe(200); // 100 * 2^1
      expect(connector.testCalculateRetryDelay(3)).toBe(400); // 100 * 2^2
      expect(connector.testCalculateRetryDelay(4)).toBe(800); // 100 * 2^3
    });

    it('should respect max delay', () => {
      connector = new TestConnector(
        createMockCredentials('toast'),
        createMockConfig({ retryDelay: 10000 }),
        mockSupabase
      );

      // Should be capped at maxDelay (30000ms)
      expect(connector.testCalculateRetryDelay(5)).toBe(30000);
    });
  });

  describe('error handling', () => {
    it('should handle rate limit errors', () => {
      const error = {
        response: { status: 429, data: { message: 'Too many requests' } }
      };

      const result = connector.testHandleError(error, 'test');

      expect(result.code).toBe(ConnectorErrorCode.RATE_LIMIT);
      expect(result.retryable).toBe(true);
    });

    it('should handle auth errors', () => {
      const error = {
        response: { status: 403, data: { message: 'Forbidden' } }
      };

      const result = connector.testHandleError(error, 'test');

      expect(result.code).toBe(ConnectorErrorCode.AUTH_FAILED);
      expect(result.retryable).toBe(false);
    });

    it('should handle network errors', () => {
      const error = new Error('Connection refused') as Error & { code: string };
      error.code = 'ECONNREFUSED';

      const result = connector.testHandleError(error, 'test');

      expect(result.code).toBe(ConnectorErrorCode.NETWORK_ERROR);
      expect(result.retryable).toBe(true);
    });

    it('should handle unknown errors', () => {
      const error = new Error('Something went wrong');

      const result = connector.testHandleError(error, 'test');

      expect(result.code).toBe(ConnectorErrorCode.UNKNOWN);
      expect(result.message).toBe('Something went wrong');
    });
  });

  describe('metrics', () => {
    it('should update metrics on success', async () => {
      const fetchFn = vi.fn().mockResolvedValue({ data: 'test' });

      await connector.testFetchWithRetry(fetchFn, 'test');

      const metrics = connector.getMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.successfulRequests).toBe(1);
      expect(metrics.failedRequests).toBe(0);
      expect(metrics.averageResponseTime).toBeGreaterThan(0);
      expect(metrics.lastSuccess).toBeInstanceOf(Date);
    });

    it('should update metrics on failure', async () => {
      const fetchFn = vi.fn().mockRejectedValue(new Error('Failed'));

      await connector.testFetchWithRetry(fetchFn, 'test');

      const metrics = connector.getMetrics();
      // Only counts once at the end when it fails
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.successfulRequests).toBe(0);
      expect(metrics.failedRequests).toBe(1);
      expect(metrics.lastError).toBeInstanceOf(Date);
    });
  });

  describe('logging', () => {
    it('should log operations', async () => {
      const fetchFn = vi.fn().mockResolvedValue({ data: 'test' });

      await connector.testFetchWithRetry(fetchFn, 'test');

      const logs = connector.getLogs();
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].level).toBe('debug');
      expect(logs[0].message).toContain('[test-connector]');
    });

    it('should filter logs by level', async () => {
      const fetchFn = vi.fn().mockRejectedValue(new Error('Failed'));

      await connector.testFetchWithRetry(fetchFn, 'test');

      const errorLogs = connector.getLogs('error');
      expect(errorLogs.length).toBeGreaterThan(0);
      expect(errorLogs.every(log => log.level === 'error')).toBe(true);
    });

    it('should limit log entries', () => {
      // Add 1500 log entries
      for (let i = 0; i < 1500; i++) {
        connector['log']('info', `Log entry ${i}`);
      }

      const logs = connector.getLogs();
      // Trimming happens when > 1000, keeps last 500
      // After 1500 entries: trimmed at 1001 to 500, then added 499 more = 999
      expect(logs.length).toBe(999);
    });
  });
});