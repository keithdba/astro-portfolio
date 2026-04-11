import type { APIRoute } from 'astro';
export const prerender = true;
import { handleExportErrorLogs } from '../../../../lib/logging/logs.controller';
import { requireAdmin } from '../../../../lib/auth/auth.controller';

export const GET: APIRoute = async ({ locals }) => {
  const { error } = requireAdmin(locals);
  if (error) return new Response(JSON.stringify({ error }), { status: 401 });

  return handleExportErrorLogs();
};
