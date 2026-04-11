/**
 * auth.controller.ts
 * 
 * HTTP controllers for Auth API routes.
 */

import { LoginInputSchema, PasswordRotationSchema } from './auth.model';
import { authenticate, rotatePassword } from './auth.service';
import { logoutAdmin } from './logout.controller';
import { logEvent } from '../audit/audit.service';
import { resetLimit } from '../security/rateLimit.service';
import { verifyCaptcha } from '../security/captcha.service';

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 
      'Content-Type': 'application/json',
      ...headers 
    },
  });
}

function errorResponse(message: string, status: number, details?: unknown): Response {
  return jsonResponse({ error: message, ...(details ? { details } : {}) }, status);
}

const SESSION_COOKIE_NAME = 'macdaly_session';

/** Handle POST /api/auth/login */
export async function handleLogin(request: Request): Promise<Response> {
  const context = {
    ua: request.headers.get('user-agent') || undefined,
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
  };

  try {
    const body = await request.json();
    const result = LoginInputSchema.safeParse(body);

    if (!result.success) {
      return errorResponse('Validation failed', 400, result.error.issues);
    }

    // CAPTCHA Validation
    const { success: captchaSuccess } = await verifyCaptcha(result.data.captchaToken || '');
    if (!captchaSuccess) {
      await logEvent('login_failure', 'anonymous', { username: result.data.username, reason: 'CAPTCHA verification failed' }, context);
      return errorResponse('Security verification failed. Please try again.', 403);
    }

    const authResult = await authenticate(result.data, context);


    if ('error' in authResult) {
      await logEvent('login_failure', 'anonymous', { username: result.data.username, reason: authResult.error }, context);
      return errorResponse(authResult.error, 401, authResult.lockedUntil ? { lockedUntil: authResult.lockedUntil } : undefined);
    }

    if (context.ip) resetLimit(context.ip, 'login');
    await logEvent('login_success', authResult.adminId, { username: result.data.username }, context);

    // Set HttpOnly cookie
    const cookie = `${SESSION_COOKIE_NAME}=${authResult.token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${60 * 60 * 24}; Secure`;
    
    // We return the CSRF token to the client so it can be used in subsequent requests
    return jsonResponse({ 
      message: 'Login successful',
      csrfToken: authResult.csrfToken 
    }, 200, {
      'Set-Cookie': cookie,
    });
  } catch (err) {
    console.error('[auth] Login error:', err);
    return errorResponse('Internal server error', 500);
  }
}

/** Handle POST /api/auth/logout - Deprecated in favor of /admin/logout */
export async function handleLogout(locals: App.Locals): Promise<Response> {
  return logoutAdmin(locals);
}

/** Handle POST /api/auth/rotate-password */
export async function handleRotatePassword(request: Request, locals: App.Locals): Promise<Response> {
  const session = locals.session;
  if (!session) return errorResponse('Unauthorized', 401);

  const context = {
    ua: request.headers.get('user-agent') || undefined,
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
  };

  try {
    const body = await request.json();
    const result = PasswordRotationSchema.safeParse(body);

    if (!result.success) {
      return errorResponse('Validation failed', 400, result.error.issues);
    }

    const rotationResult = await rotatePassword(session.adminId, result.data.currentPassword, result.data.newPassword);

    if (!rotationResult.success) {
      await logEvent('credential_change', session.adminId, { success: false, reason: rotationResult.error }, context);
      return errorResponse(rotationResult.error || 'Rotation failed', 400);
    }

    await logEvent('credential_change', session.adminId, { success: true }, context);

    // Sessions are invalidated inside rotatePassword service
    return jsonResponse({ message: 'Password rotated successfully. All sessions invalidated. Please log in again.' }, 200, {
      'Set-Cookie': `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0; Secure`,
    });
  } catch (err) {
    console.error('[auth] Rotation error:', err);
    return errorResponse('Internal server error', 500);
  }
}

/** Legacy Middleware helper (for non-Astro middleware usage) */
export function requireAdmin(locals: App.Locals): { session?: any, error?: Response } {
  if (!locals.session) {
    return { error: errorResponse('Unauthorized', 401) };
  }
  return { session: locals.session };
}
