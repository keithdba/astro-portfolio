import type { APIRoute } from 'astro';
export const prerender = false;
import { handleGetErrorLog } from '../../../../lib/logging/logs.controller';
import { requireAdmin } from '../../../../lib/auth/auth.controller';

export const GET: APIRoute = async ({ params, locals }) => {
  const { error } = requireAdmin(locals);
  if (error) return new Response(JSON.stringify({ error }), { status: 401 });

  if (!params.id) return new Response(JSON.stringify({ error: 'ID required' }), { status: 400 });

  return handleGetErrorLog(params.id);
};
