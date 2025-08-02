import { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../types/database.generated';

import { CircuitBreaker } from './circuit-breaker';
import {
  ConnectorConfig,
  ConnectorCredentials,
  ConnectorError,
  ConnectorErrorCode,
  ConnectorMetrics,
  FetchResult,
  LogEntry,
  RateLimitInfo,
  RetryConfig,
  RetryStrategy,
} from './types';

export abstract class BaseConnector {
  protected config: ConnectorConfig;
  protected credentials: ConnectorCredentials;
  protected supabase: SupabaseClient<Database>;
  protected metrics: ConnectorMetrics;
  protected rateLimitInfo?: RateLimitInfo;
  protected logs: LogEntry[] = [];
  protected retryConfig: RetryConfig;
  protected circuitBreaker: CircuitBreaker;
  protected correlationId?: string;

  constructor(
    credentials: ConnectorCredentials,
    config: ConnectorConfig,
    supabase: SupabaseClient<Database>
  ) {
    this.credentials = credentials;
    this.config = {
      timeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
      rateLimitPerMinute: 60,
      ...config,
    };
    this.supabase = supabase;
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
    };
    this.retryConfig = {
      maxRetries: this.config.maxRetries || 3,
      initialDelay: this.config.retryDelay || 1000,
      maxDelay: 30000,
      factor: 2,
      strategy: 'exponential' as RetryStrategy,
      retryableErrors: [
        ConnectorErrorCode.RATE_LIMIT,
        ConnectorErrorCode.NETWORK_ERROR,
        ConnectorErrorCode.TIMEOUT,
      ],
    };
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeout: 30000, // 30 seconds
    });
  }

  abstract get serviceName(): string;
  abstract validateCredentials(): Promise<boolean>;
  abstract testConnection(): Promise<FetchResult<unknown>>;

  protected async fetchWithRetry<T>(
    fetchFn: () => Promise<T>,
    context: string,
    correlationId?: string
  ): Promise<FetchResult<T>> {
    this.correlationId = correlationId || this.generateCorrelationId();
    const startTime = Date.now();
    let lastError: ConnectorError | undefined;
    let attempts = 0;

    // Use circuit breaker
    try {
      return await this.circuitBreaker.execute(async () => {
        while (attempts < this.retryConfig.maxRetries + 1) {
          try {
            attempts++;
            this.log('debug', `Attempting ${context} (attempt ${attempts})`, { correlationId: this.correlationId });
            
            const data = await this.withTimeout(fetchFn(), this.config.timeout || 30000);
            
            const duration = Date.now() - startTime;
            this.updateMetrics(true, duration);
            
            return {
              success: true,
              data,
              timestamp: new Date(),
              duration,
            };
          } catch (error) {
            lastError = this.handleError(error, context);
            
            if (attempts >= this.retryConfig.maxRetries + 1 || !this.shouldRetry(lastError, attempts)) {
              throw error; // Let circuit breaker handle the failure
            }

            const delay = this.calculateRetryDelay(attempts);
            this.log('info', `Retrying ${context} after ${delay}ms delay`, { correlationId: this.correlationId });
            await this.sleep(delay);
          }
        }
        throw lastError || new Error('Max retries exceeded');
      });
    } catch (error) {
      // Circuit breaker or retry failure
      if (error instanceof Error && error.message === 'Circuit breaker is OPEN') {
        lastError = this.createError(
          ConnectorErrorCode.NETWORK_ERROR,
          'Service temporarily unavailable (circuit breaker open)'
        );
      }
    }

    const duration = Date.now() - startTime;
    this.updateMetrics(false, duration);

    return {
      success: false,
      error: lastError || this.createError(ConnectorErrorCode.UNKNOWN, 'Unknown error'),
      timestamp: new Date(),
      duration,
    };
  }

  protected async withTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), timeout);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  protected shouldRetry(error: ConnectorError, _attempt: number): boolean {
    return this.retryConfig.retryableErrors.includes(error.code as ConnectorErrorCode);
  }

  protected calculateRetryDelay(attempt: number): number {
    const { strategy, initialDelay, maxDelay, factor } = this.retryConfig;

    let delay: number;
    switch (strategy) {
      case 'exponential':
        delay = initialDelay * Math.pow(factor, attempt - 1);
        break;
      case 'linear':
        delay = initialDelay * attempt;
        break;
      case 'fixed':
      default:
        delay = initialDelay;
    }

    return Math.min(delay, maxDelay);
  }

  protected handleError(error: unknown, context: string): ConnectorError {
    this.log('error', `Error in ${context}`, { error });

    // Type guard for axios-like errors
    if (this.isAxiosError(error)) {
      if (error.response?.status === 429) {
        return this.createError(
          ConnectorErrorCode.RATE_LIMIT,
          'Rate limit exceeded',
          error.response.data
        );
      }

      if (error.response?.status === 401 || error.response?.status === 403) {
        return this.createError(
          ConnectorErrorCode.AUTH_FAILED,
          'Authentication failed',
          error.response.data
        );
      }

      if (error.code === 'ECONNABORTED') {
        return this.createError(
          ConnectorErrorCode.TIMEOUT,
          'Request timed out'
        );
      }

      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        return this.createError(
          ConnectorErrorCode.NETWORK_ERROR,
          'Network error',
          { code: error.code }
        );
      }
    }

    // Handle timeout errors
    if (error instanceof Error && error.message === 'Request timeout') {
      return this.createError(
        ConnectorErrorCode.TIMEOUT,
        'Request timed out'
      );
    }

    // Default error handling
    const message = error instanceof Error ? error.message : 'Unknown error';
    return this.createError(
      ConnectorErrorCode.UNKNOWN,
      message,
      error
    );
  }

  private isAxiosError(error: unknown): error is {
    response?: { status: number; data: unknown };
    code?: string;
    message?: string;
  } {
    return (
      typeof error === 'object' &&
      error !== null &&
      ('response' in error || 'code' in error)
    );
  }

  protected createError(
    code: ConnectorErrorCode,
    message: string,
    details?: unknown
  ): ConnectorError {
    return {
      code,
      message,
      details,
      retryable: this.retryConfig.retryableErrors.includes(code),
      timestamp: new Date(),
    };
  }

  protected updateMetrics(success: boolean, duration: number): void {
    this.metrics.totalRequests++;
    
    if (success) {
      this.metrics.successfulRequests++;
      this.metrics.lastSuccess = new Date();
    } else {
      this.metrics.failedRequests++;
      this.metrics.lastError = new Date();
    }

    const totalDuration = this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + duration;
    this.metrics.averageResponseTime = totalDuration / this.metrics.totalRequests;
  }

  protected log(level: LogEntry['level'], message: string, context?: Record<string, unknown>): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message: `[${this.serviceName}] ${message}`,
      context: {
        ...context,
        correlationId: this.correlationId,
      },
    };

    this.logs.push(entry);

    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-500);
    }
  }

  protected async updateLastFetch(success: boolean, error?: string): Promise<void> {
    try {
      await this.supabase
        .from('api_credentials')
        .update({
          last_successful_fetch: success ? new Date().toISOString() : null,
          last_error: error || null,
          updated_at: new Date().toISOString(),
        })
        .eq('service', this.credentials.service);
    } catch (err) {
      this.log('error', 'Failed to update last fetch status', { error: err });
    }
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public getMetrics(): ConnectorMetrics {
    return { ...this.metrics };
  }

  public getLogs(level?: LogEntry['level']): LogEntry[] {
    if (level) {
      return this.logs.filter(log => log.level === level);
    }
    return [...this.logs];
  }

  public clearLogs(): void {
    this.logs = [];
  }

  public getRateLimitInfo(): RateLimitInfo | undefined {
    return this.rateLimitInfo;
  }

  public getCircuitBreakerState() {
    return this.circuitBreaker.getMetrics();
  }

  protected generateCorrelationId(): string {
    return `${this.serviceName}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  public setCorrelationId(correlationId: string): void {
    this.correlationId = correlationId;
  }

  public getCorrelationId(): string | undefined {
    return this.correlationId;
  }
}