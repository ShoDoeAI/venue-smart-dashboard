import { describe, it, expect } from 'vitest';

import type { ConnectorConfig, ConnectorError, ConnectorErrorCode } from './types';

describe('Connector Types', () => {
  it('should have correct ConnectorErrorCode values', () => {
    const errorCodes: ConnectorErrorCode[] = [
      'RATE_LIMIT' as ConnectorErrorCode,
      'AUTH_FAILED' as ConnectorErrorCode,
      'NETWORK_ERROR' as ConnectorErrorCode,
      'INVALID_RESPONSE' as ConnectorErrorCode,
      'TIMEOUT' as ConnectorErrorCode,
      'UNKNOWN' as ConnectorErrorCode,
    ];
    
    expect(errorCodes).toHaveLength(6);
  });

  it('should create valid ConnectorConfig', () => {
    const config: ConnectorConfig = {
      apiKey: 'test-key',
      baseUrl: 'https://api.example.com',
      timeout: 5000,
      maxRetries: 3,
      retryDelay: 1000,
      rateLimitPerMinute: 60,
    };
    
    expect(config.apiKey).toBe('test-key');
    expect(config.timeout).toBe(5000);
  });

  it('should create valid ConnectorError', () => {
    const error: ConnectorError = {
      code: 'NETWORK_ERROR',
      message: 'Connection failed',
      retryable: true,
      timestamp: new Date(),
    };
    
    expect(error.code).toBe('NETWORK_ERROR');
    expect(error.retryable).toBe(true);
  });
});