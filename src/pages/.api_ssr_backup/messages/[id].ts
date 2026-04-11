/**
 * API Route: /api/messages/[id]
 *
 * GET    — Admin: retrieve a single message
 * PATCH  — Admin: update message status (unread/read/archived)
 * DELETE — Admin: permanently remove a message
 */

import type { APIRoute } from 'astro';
import {
  handleGetMessage,
  handleUpdateMessage,
  handleDeleteMessage,
  handleHardDeleteMessage,
} from '../../../lib/messaging/index';
import { requireAdmin } from '../../../lib/auth/auth.controller';

export const prerender = true;

export const GET: APIRoute = ({ locals, params }) => {
  const { error } = requireAdmin(locals);
  if (error) return error;
  return handleGetMessage(params.id!);
};

export const PATCH: APIRoute = async ({ request, locals, params }) => {
  const { error } = requireAdmin(locals);
  if (error) return error;
  return handleUpdateMessage(params.id!, request, locals);
};

export const DELETE: APIRoute = async ({ request, locals, params, url }) => {
  const { error } = requireAdmin(locals);
  if (error) return error;

  const isPermanent = url.searchParams.get('permanent') === 'true';
  if (isPermanent) {
    return handleHardDeleteMessage(params.id!, request, locals);
  }
  return handleDeleteMessage(params.id!, request, locals);
};
