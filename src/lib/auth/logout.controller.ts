/**
 * logout.controller.ts
 * 
 * Handles the logic for terminating an admin session.
 */

import { invalidateSession } from './session.service';
import { logEvent } from '../audit/audit.service';

const SESSION_COOKIE_NAME = 'macdaly_session';

/**
 * Terminate the current admin session.
 * 
 * Requirements:
 * - Invalidate current session server-side.
 * - Clear session cookie (HttpOnly, Secure, SameSite).
 * - Remove associated server-side tokens.
 * - Log the logout event.
 */
export async function logoutAdmin(locals: App.Locals): Promise<Response> {
  const session = locals.session;

  if (session) {
    try {
      // 1. Invalidate session server-side (removes record including CSRF token)
      await invalidateSession(session.token);

      // 2. Log the logout event for audit trails
      await logEvent('logout_success', session.adminId, {
        ip: session.ipAddress,
        ua: session.userAgent
      });
    } catch (err) {
      console.error('[Logout] Error during session invalidation:', err);
      // We continue to clear the cookie even if server-side invalidation fails
      // to ensure the user's browser-side session is cleared.
    }
  }

  // 3. Destroy session cookie and return success response
  // We use SameSite=Strict, HttpOnly, and Secure as required.
  return new Response(JSON.stringify({ message: 'Logout successful' }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0; Secure`,
    },
  });
}
