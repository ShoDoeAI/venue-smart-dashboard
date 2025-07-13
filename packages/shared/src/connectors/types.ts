export interface ConnectorConfig {
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  rateLimitPerMinute?: number;
}

export interface ConnectorCredentials {
  service: 'eventbrite' | 'toast' | 'wisk' | 'resy' | 'audience_republic' | 'meta' | 'opentable';
  credentials: Record<string, unknown>;
  isActive: boolean;
}

export interface FetchResult<T> {
  success: boolean;
  data?: T;
  error?: ConnectorError;
  timestamp: Date;
  duration: number;
}

export interface ConnectorError {
  code: string;
  message: string;
  details?: unknown;
  retryable: boolean;
  timestamp: Date;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
}

export enum ConnectorErrorCode {
  RATE_LIMIT = 'RATE_LIMIT',
  AUTH_FAILED = 'AUTH_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN',
}

export interface ConnectorMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastSuccess?: Date;
  lastError?: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  hasMore: boolean;
  nextCursor?: string | number;
  total?: number;
}

export type RetryStrategy = 'exponential' | 'linear' | 'fixed';

export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  factor: number;
  strategy: RetryStrategy;
  retryableErrors: ConnectorErrorCode[];
}

export interface LogEntry {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: Record<string, unknown>;
}

export type TransformFunction<TSource, TTarget> = (source: TSource) => TTarget;

export interface DataMapper<TSource, TTarget> {
  transform: TransformFunction<TSource, TTarget>;
  validate?: (data: TTarget) => boolean;
}