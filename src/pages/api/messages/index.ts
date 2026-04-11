/**
 * API Route: /api/messages
 *
 * POST — Public: submit a new contact message
 * GET  — Admin: list all messages (with optional ?status= filter)
 */

import type { APIRoute } from 'astro';
import { handleSubmitMessage, handleListMessages } from '../../../lib/messaging/index';
import { requireAdmin } from '../../../lib/auth/auth.controller';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  return handleSubmitMessage(request);
};

export const GET: APIRoute = ({ locals, url }) => {
  const { error } = requireAdmin(locals);
  if (error) return error;
  
  return handleListMessages(url);
};
