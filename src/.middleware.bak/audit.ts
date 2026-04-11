/**
 * audit.middleware.ts
 *
 * Middleware to track admin actions across the system.
 */

import { defineMiddleware } from 'astro:middleware';
import { logEvent } from '../lib/audit/audit.service';

export const auditMiddleware = defineMiddleware(async (context, next) => {
  const { request, locals, url } = context;

  // We only care about mutative actions from admins for generic audit logging
  // Specifically: POST, PUT, DELETE, PATCH
  const isMutation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method);
  
  // We'll log actions on /admin and /api paths
  const isAdminRequest = url.pathname.startsWith('/admin') || url.pathname.startsWith('/api');

  // Proceed with the request first to see if it succeeds
  const response = await next();

  // If it's an admin mutation and was successful (2xx), log it as an admin action
  // Note: Specific actions like 'login_success' are logged in their respective controllers.
  // This middleware captures general "admin actions" that haven't been explicitly logged elsewhere.
  if (isMutation && isAdminRequest && locals.adminId && response.status >= 200 && response.status < 300) {
    // Only log if it hasn't been handled by a specific audit log yet? 
    // Actually, double logging isn't the worst, but we can use a flag in locals if needed.
    // For now, satisfy "Admin actions" requirement broadly.
    
    // Skip logging the audit log viewer or export itself to avoid recursion if they were mutations (they aren't)
    if (url.pathname.includes('/admin/logs')) return response;

    await logEvent(
      'admin_action',
      locals.adminId,
      {
        method: request.method,
        path: url.pathname,
        status: response.status
      },
      {
        ip: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined
      }
    );
  }

  return response;
});
