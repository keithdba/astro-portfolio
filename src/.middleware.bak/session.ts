/**
 * session.middleware.ts
 * 
 * Middleware to authenticate the admin session from cookies.
 * Attaches the session and adminId to the request context.
 */

import { defineMiddleware } from 'astro:middleware';
import { verifyAndRefreshSession } from '../lib/auth/session.service';

const SESSION_COOKIE_NAME = 'macdaly_session';

export const sessionMiddleware = defineMiddleware(async (context, next) => {
  const { cookies, locals, url } = context;
  
  // Only process sessions for admin routes or API routes
  const isAdminPath = url.pathname.startsWith('/admin');
  const isApiPath = url.pathname.startsWith('/api/messages') || url.pathname.startsWith('/api/auth/rotate-password');
  
  if (!isAdminPath && !isApiPath) {
    return next();
  }

  const sessionToken = cookies.get(SESSION_COOKIE_NAME)?.value;

  if (sessionToken) {
    const session = await verifyAndRefreshSession(sessionToken);
    
    if (session) {
      // Session is valid and refreshed
      locals.session = session;
      locals.adminId = session.adminId;
      
      // Update cookie to keep it alive in the browser if needed
      cookies.set(SESSION_COOKIE_NAME, session.token, {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 60 * 60 * 24, // 24 hours
      });
    } else {
      // Session expired or invalid - clear cookie
      cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
    }
  }

  return next();
});
