// API endpoints and constants

export const API_ENDPOINTS = {
  TOAST: {
    PRODUCTION: 'https://ws-api.toasttab.com',
    SANDBOX: 'https://ws-sandbox-api.toasttab.com',
    AUTH: 'https://ws-api.toasttab.com/authentication/v1/authentication/login',
  },
  EVENTBRITE: {
    BASE: 'https://www.eventbriteapi.com/v3',
  },
  WISK: {
    BASE: 'https://api.wisk.ai/v1',
  },
  RESY: {
    BASE: 'https://api.resy.com',
  },
  AUDIENCE_REPUBLIC: {
    BASE: 'https://api.audiencerepublic.com/v2',
  },
  META: {
    BASE: 'https://graph.facebook.com/v18.0',
  },
  OPENTABLE: {
    BASE: 'https://api.opentable.com/v2',
  },
} as const;

export const RATE_LIMITS = {
  TOAST: {
    DEFAULT: 100, // requests per minute
  },
  EVENTBRITE: {
    DEFAULT: 1000, // requests per hour
  },
  WISK: {
    DEFAULT: 60, // requests per minute
  },
} as const;

export const SNAPSHOT_INTERVALS = {
  DEFAULT: 3 * 60 * 1000, // 3 minutes in milliseconds
  MINIMUM: 60 * 1000, // 1 minute
  MAXIMUM: 60 * 60 * 1000, // 1 hour
} as const;

export const ERROR_MESSAGES = {
  GENERIC: 'An unexpected error occurred',
  NETWORK: 'Network connection failed',
  AUTH: 'Authentication failed',
  RATE_LIMIT: 'Rate limit exceeded',
  INVALID_DATA: 'Invalid data received',
} as const;