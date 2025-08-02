import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';

// Rate limiting map (in production, use Redis or similar)
const rateLimitMap = new Map<string, number[]>();

/**
 * Rate limiting middleware
 * Limits requests per IP address
 */
export function rateLimit(
  windowMs: number = 60000, // 1 minute
  maxRequests: number = 60   // 60 requests per minute
) {
  return (req: VercelRequest, res: VercelResponse, next: () => void) => {
    const ip = req.headers['x-forwarded-for'] || 
                req.headers['x-real-ip'] || 
                req.socket?.remoteAddress || 
                'unknown';
    
    const now = Date.now();
    const ipKey = String(ip);
    const requests = rateLimitMap.get(ipKey) || [];
    
    // Filter out old requests
    const recentRequests = requests.filter(time => now - time < windowMs);
    
    if (recentRequests.length >= maxRequests) {
      res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil(windowMs / 1000)
      });
      return;
    }
    
    recentRequests.push(now);
    rateLimitMap.set(ipKey, recentRequests);
    
    // Clean up old entries periodically
    if (Math.random() < 0.01) { // 1% chance
      for (const [key, times] of rateLimitMap.entries()) {
        const recent = times.filter(time => now - time < windowMs);
        if (recent.length === 0) {
          rateLimitMap.delete(key);
        } else {
          rateLimitMap.set(key, recent);
        }
      }
    }
    
    next();
  };
}

/**
 * CORS configuration
 */
export function cors(
  allowedOrigins: string[] = ['https://venue-smart-dashboard.vercel.app']
) {
  return (req: VercelRequest, res: VercelResponse, next: () => void) => {
    const origin = req.headers.origin;
    
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
    
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
    
    next();
  };
}

/**
 * Security headers middleware
 */
export function securityHeaders() {
  return (_req: VercelRequest, res: VercelResponse, next: () => void) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    
    // Basic CSP - adjust as needed
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' data:; " +
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.claude.ai;"
    );
    
    next();
  };
}

/**
 * Request validation middleware factory
 */
export function validateRequest<T>(schema: z.ZodSchema<T>) {
  return async (req: VercelRequest, res: VercelResponse, next: () => void) => {
    try {
      const data = req.method === 'GET' ? req.query : req.body as unknown;
      const validated = await schema.parseAsync(data);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors
        });
      } else {
        res.status(400).json({
          error: 'Invalid request'
        });
      }
    }
  };
}

/**
 * API key authentication
 */
export function requireApiKey() {
  return (req: VercelRequest, res: VercelResponse, next: () => void) => {
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;
    
    if (!apiKey || apiKey !== process.env.API_KEY) {
      res.status(401).json({
        error: 'Invalid or missing API key'
      });
      return;
    }
    
    next();
  };
}

/**
 * Compose multiple middleware functions
 */
export function compose(...middlewares: Array<(req: VercelRequest, res: VercelResponse, next: () => void) => void>) {
  return (req: VercelRequest, res: VercelResponse) => {
    let index = 0;
    
    function next() {
      if (index >= middlewares.length) return;
      const middleware = middlewares[index++];
      middleware(req, res, next);
    }
    
    next();
  };
}

/**
 * Example usage:
 * 
 * export default compose(
 *   securityHeaders(),
 *   cors(),
 *   rateLimit(60000, 60), // 60 requests per minute
 *   validateRequest(mySchema),
 *   async (req, res) => {
 *     // Your handler code
 *   }
 * );
 */