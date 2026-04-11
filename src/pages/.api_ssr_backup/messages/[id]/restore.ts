/**
 * API Route: /api/messages/[id]/restore
 *
 * POST — Admin: restore a deleted/archived message
 */

import type { APIRoute } from 'astro';
import { handleRestoreMessage } from '../../../../lib/messaging/index';
import { requireAdmin } from '../../../../lib/auth/auth.controller';

export const prerender = true;

export const POST: APIRoute = async ({ request, locals, params }) => {
  const { error } = requireAdmin(locals);
  if (error) return error;

  return handleRestoreMessage(params.id!, request, locals);
};
