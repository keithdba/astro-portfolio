/**
 * rateLimit.middleware.ts
 *
 * Middleware to enforce rate limits on specific routes.
 */

import { defineMiddleware } from 'astro:middleware';
import { checkRateLimit, recordAttempt, type RateLimitBucket } from '../lib/security/rateLimit.service';

/**
 * Maps URL paths to rate limit buckets.
 */
function getBucketForPath(path: string): RateLimitBucket | null {
  if (path.startsWith('/api/auth/login')) return 'login';
  if (path.startsWith('/api/contact') || path.startsWith('/api/messages') && !path.includes('/admin')) {
    // Note: Public message submission
    return 'messaging';
  }
  if (path.startsWith('/admin') || path.startsWith('/api/messages/') || path.startsWith('/api/admin')) {
    return 'admin';
  }
  if (path.startsWith('/api')) return 'api';
  return null;
}

export const rateLimitMiddleware = defineMiddleware(async (context, next) => {
  const { url, request } = context;
  const path = url.pathname;
  
  const bucket = getBucketForPath(path);
  if (!bucket) return next();

  // Get client IP
  // In production, you might need to check x-forwarded-for if behind a proxy
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() 
             || request.headers.get('x-real-ip') 
             || 'unknown';

  // We only rate limit mutations (POST, PUT, DELETE) and login for most buckets
  // to avoid blocking legitimate dashboard browsing, except for the 'api' bucket which is broader.
  const isMutation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method);
  const isLogin = path.includes('/auth/login');

  if (!isMutation && !isLogin && bucket !== 'api') {
    return next();
  }

  const { limited, retryAfter } = checkRateLimit(ip, bucket);

  if (limited) {
    return new Response(
      JSON.stringify({ 
        error: 'Too many requests', 
        message: `Rate limit exceeded for ${bucket}. Please try again later.`,
        retryAfter 
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': retryAfter?.toString() || '60'
        }
      }
    );
  }

  // Record the attempt
  recordAttempt(ip, bucket);

  return next();
});
