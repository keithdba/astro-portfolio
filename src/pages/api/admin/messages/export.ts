/**
 * API Route: /api/admin/messages/export
 *
 * Admin: export messaging data.
 */

import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../../lib/auth/auth.controller';
import { listMessages } from '../../../../lib/messaging/messaging.service';
import { formatMessagesToCSV, formatMessagesToJSON } from '../../../../lib/messaging/export.service';

export const prerender = false;

export const GET: APIRoute = async ({ locals, url }) => {
  const { error } = requireAdmin(locals);
  if (error) return error;

  const format = url.searchParams.get('format') || 'json';
  const messages = listMessages();
  const dateStr = new Date().toISOString().split('T')[0];

  try {
    if (format === 'csv') {
      const csv = formatMessagesToCSV(messages);
      return new Response(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="macdaly_messages_${dateStr}.csv"`,
          'Cache-Control': 'no-cache'
        }
      });
    }

    // Default to JSON
    const json = formatMessagesToJSON(messages);
    return new Response(json, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="macdaly_messages_${dateStr}.json"`,
        'Cache-Control': 'no-cache'
      }
    });

  } catch (err) {
    console.error('[export] Error generating export:', err);
    return new Response(JSON.stringify({ error: 'Export failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
