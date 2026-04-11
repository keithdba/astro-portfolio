/**
 * API Route: /api/admin/logs/export
 *
 * Admin: export audit logs as CSV.
 */

import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../../lib/auth/auth.controller';
import { exportLogsToCSV } from '../../../../lib/audit/audit.service';

export const prerender = true;

export const GET: APIRoute = async ({ locals }) => {
  const { error } = requireAdmin(locals);
  if (error) return error;

  try {
    const csv = await exportLogsToCSV();
    
    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="audit_logs_${new Date().toISOString().split('T')[0]}.csv"`,
        'Cache-Control': 'no-cache'
      }
    });
  } catch (err) {
    console.error('[audit] Export error:', err);
    return new Response(JSON.stringify({ error: 'Failed to export logs' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
