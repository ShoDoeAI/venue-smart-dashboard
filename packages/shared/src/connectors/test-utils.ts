import { SupabaseClient } from '@supabase/supabase-js';
import { vi, expect } from 'vitest';

import type { Database } from '../types/database.generated';

import type { ConnectorCredentials, ConnectorConfig, FetchResult } from './types';

export function createMockSupabaseClient(): SupabaseClient<Database> {
  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signIn: vi.fn(),
      signOut: vi.fn(),
    },
  } as unknown as SupabaseClient<Database>;
}

export function createMockCredentials(
  service: ConnectorCredentials['service'],
  overrides?: Partial<ConnectorCredentials>
): ConnectorCredentials {
  return {
    service,
    credentials: {
      apiKey: 'test-api-key',
      apiSecret: 'test-api-secret',
    },
    isActive: true,
    ...overrides,
  };
}

export function createMockConfig(overrides?: Partial<ConnectorConfig>): ConnectorConfig {
  return {
    timeout: 5000,
    maxRetries: 2,
    retryDelay: 100,
    rateLimitPerMinute: 60,
    ...overrides,
  };
}

export function createSuccessResult<T>(data: T, duration = 100): FetchResult<T> {
  return {
    success: true,
    data,
    timestamp: new Date(),
    duration,
  };
}

export function createErrorResult(
  code: string,
  message: string,
  duration = 100
): FetchResult<never> {
  return {
    success: false,
    error: {
      code,
      message,
      retryable: false,
      timestamp: new Date(),
    },
    timestamp: new Date(),
    duration,
  };
}

export async function expectRetryBehavior(
  fn: () => Promise<unknown>,
  expectedAttempts: number,
  attemptSpy: ReturnType<typeof vi.fn>
): Promise<void> {
  try {
    await fn();
  } catch {
    // Expected to fail
  }
  
  expect(attemptSpy).toHaveBeenCalledTimes(expectedAttempts);
}

export function mockDateNow(timestamp: number): () => void {
  const original = Date.now;
  let callCount = 0;
  Date.now = vi.fn().mockImplementation(() => {
    // First call returns base timestamp, subsequent calls add 10ms each
    return timestamp + (callCount++ * 10);
  });
  
  return () => {
    Date.now = original;
  };
}

export class TestConnector extends (await import('./base-connector')).BaseConnector {
  serviceName = 'test-connector';
  
  validateCredentials(): Promise<boolean> {
    return Promise.resolve(true);
  }
  
  async testConnection(): Promise<FetchResult<unknown>> {
    return this.fetchWithRetry(
      () => Promise.resolve({ status: 'connected' }),
      'test-connection'
    );
  }
  
  // Expose protected methods for testing
  public async testFetchWithRetry<T>(
    fetchFn: () => Promise<T>,
    context: string
  ): Promise<FetchResult<T>> {
    return this.fetchWithRetry(fetchFn, context);
  }
  
  public testHandleError(error: unknown, context: string) {
    return this.handleError(error, context);
  }
  
  public testCalculateRetryDelay(attempt: number): number {
    return this.calculateRetryDelay(attempt);
  }
}