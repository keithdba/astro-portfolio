import type { APIRoute } from 'astro';
import { logoutAdmin } from '../../lib/auth/logout.controller';

export const prerender = true;

/**
 * POST /admin/logout
 * 
 * Securely terminates the admin session.
 * Protected by CSRF middleware (requires valid CSRF token in header).
 */
export const POST: APIRoute = async ({ locals }) => {
  return logoutAdmin(locals);
};

// Explicitly disallow GET as per security requirements
export const GET: APIRoute = () => {
  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' }
  });
};
