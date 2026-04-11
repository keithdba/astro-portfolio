/**
 * csrf.middleware.ts
 * 
 * Implements Synchronizer Token Pattern CSRF protection.
 * Requires a valid session from sessionMiddleware.
 */

import { defineMiddleware } from 'astro:middleware';
import { validateCsrfToken } from '../lib/auth/session.service';

const CSRF_HEADER = 'x-csrf-token';
const MUTATING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

export const csrfMiddleware = defineMiddleware(async (context, next) => {
  const { request, locals, url } = context;

  // 1. Only enforce for admin-related mutations
  const normalizedPath = url.pathname.replace(/\/$/, '') || '/';
  const isAdminRequest = normalizedPath.startsWith('/admin') || normalizedPath.startsWith('/api/');
  const isMutation = MUTATING_METHODS.includes(request.method);

  if (!isAdminRequest || !isMutation) {
    return next();
  }

  // Exemptions (Routes that are always public or handle their own auth)
  const isLogin = normalizedPath === '/api/auth/login' || normalizedPath === '/admin/login';
  const isPublicMessage = normalizedPath === '/api/messages' && request.method === 'POST';
  
  if (isLogin || isPublicMessage) {
    return next();
  }

  // 2. Check for session (provided by sessionMiddleware)
  const session = locals.session;
  
  // Special handling for Logout:
  // If the session is already missing, logout is effectively complete.
  // We allow it to proceed to the controller so it can clear cookies and return 200.
  const isLogout = normalizedPath === '/admin/logout' || normalizedPath === '/api/auth/logout';
  
  if (!session && isLogout) {
    return next();
  }

  if (!session) {
    return new Response(JSON.stringify({ error: 'Session required for this action' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 3. Validate CSRF Token
  const providedToken = request.headers.get(CSRF_HEADER);
  
  if (!validateCsrfToken(session, providedToken)) {
     // Special case: For logout, if the token is stale/missing but the session is valid and 
     // the request origin matches, we allow it to proceed to ensure the user can actually log out.
     const origin = request.headers.get('origin');
     const isSameOrigin = origin && new URL(origin).hostname === url.hostname;
     
     if (isLogout && isSameOrigin) {
       console.warn(`[CSRF] Allowed logout with stale token via origin check for ${normalizedPath}`);
       return next();
     }

     console.warn(`[CSRF] Mismatch for ${normalizedPath}. Provided: ${providedToken?.substring(0, 5)}... Expected: ${session.csrfToken.substring(0, 5)}...`);
     
     return new Response(JSON.stringify({ error: 'CSRF validation failed' }), {
       status: 403,
       headers: { 'Content-Type': 'application/json' }
     });
  }

  return next();
});
