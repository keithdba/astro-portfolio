/**
 * messaging.controller.ts
 *
 * HTTP-layer controller for the Local Messaging Inbox.
 * Responsibilities:
 *  - Parse and validate request bodies via Zod schemas
 *  - Delegate to messaging.service for persistence
 *  - Return structured JSON responses with appropriate status codes
 *
 * This module is imported by the Astro API route files and keeps those
 * files as thin pass-throughs.
 */

import {
  MessageInputSchema,
  StatusUpdateSchema,
  type MessageStatus,
} from './messaging.model';
import {
  createMessage,
  listMessages,
  getMessageById,
  updateMessageStatus,
  deleteMessage,
  hardDeleteMessage,
  restoreMessage,
} from './messaging.service';
import { logEvent } from '../audit/audit.service';

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function errorResponse(message: string, status: number, details?: unknown): Response {
  return jsonResponse({ error: message, ...(details ? { details } : {}) }, status);
}

// --------------------------------------------------------------------------
// Public Endpoint — Submit a Message
// --------------------------------------------------------------------------

/**
 * Handle POST /api/messages
 * Public-facing: anyone can submit a contact form message.
 */
export async function handleSubmitMessage(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const result = MessageInputSchema.safeParse(body);

    if (!result.success) {
      // Return a generic error to avoid giving bots detailed feedback
      return errorResponse('Something went wrong. Please check your input and try again.', 400);
    }

    const data = result.data;

    // The honeypot and CAPTCHA checks are now handled by global middleware.
    // If we reach here, the submission is considered valid.

    const record = await createMessage(data);
    return jsonResponse({ message: 'Message received. Thank you!', id: record.id }, 201);
  } catch (err) {
    console.error('[messaging] Submit error:', err);
    return errorResponse('Something went wrong. Please try again later.', 500);
  }
}

// --------------------------------------------------------------------------
// Admin Endpoints — CRUD
// --------------------------------------------------------------------------

/**
 * Handle GET /api/messages
 * Admin: list all messages with optional ?status= filter.
 */
export function handleListMessages(url: URL): Response {
  const statusFilter = url.searchParams.get('status') as MessageStatus | null;

  const validStatuses = ['unread', 'read', 'archived', 'deleted'];
  if (statusFilter && !validStatuses.includes(statusFilter)) {
    return errorResponse(
      `Invalid status filter. Must be one of: ${validStatuses.join(', ')}`,
      400,
    );
  }

  const messages = listMessages(statusFilter ?? undefined);
  return jsonResponse({ count: messages.length, messages });
}

/**
 * Handle GET /api/messages/[id]
 * Admin: retrieve a single message by UUID.
 */
export function handleGetMessage(id: string): Response {
  const record = getMessageById(id);
  if (!record) return errorResponse('Message not found', 404);
  return jsonResponse(record);
}

/**
 * Handle PATCH /api/messages/[id]
 * Admin: update a message's status (unread → read → archived, etc.).
 */
export async function handleUpdateMessage(
  id: string,
  request: Request,
  locals: App.Locals
): Promise<Response> {
  try {
    const body = await request.json();
    const result = StatusUpdateSchema.safeParse(body);

    if (!result.success) {
      return errorResponse('Invalid status value', 400, result.error.issues);
    }

    const newStatus = result.data.status;
    const updated = await updateMessageStatus(id, newStatus);
    if (!updated) return errorResponse('Message not found', 404);

    // Audit log specific actions
    const actionMap: Record<string, any> = {
      'read': 'message_read',
      'archived': 'message_archived',
      'unread': 'admin_action'
    };
    
    await logEvent(
      actionMap[newStatus] || 'admin_action',
      locals.adminId || 'anonymous',
      { message_id: id, status: newStatus },
      { ip: request.headers.get('x-forwarded-for') || undefined, userAgent: request.headers.get('user-agent') || undefined }
    );

    return jsonResponse(updated);
  } catch (err) {
    console.error('[messaging] Update error:', err);
    return errorResponse('Unable to update message', 500);
  }
}

/**
 * Handle DELETE /api/messages/[id]
 * Admin: soft-delete a message (moves to 'deleted' state).
 */
export async function handleDeleteMessage(id: string, request: Request, locals: App.Locals): Promise<Response> {
  try {
    const deleted = await deleteMessage(id);
    if (!deleted) return errorResponse('Message not found', 404);

    await logEvent(
      'message_deleted',
      locals.adminId || 'anonymous',
      { message_id: id, type: 'soft' },
      { ip: request.headers.get('x-forwarded-for') || undefined, userAgent: request.headers.get('user-agent') || undefined }
    );

    return jsonResponse({ message: 'Message soft-deleted' });
  } catch (err) {
    console.error('[messaging] Delete error:', err);
    return errorResponse('Unable to delete message', 500);
  }
}

/**
 * Handle DELETE /api/messages/[id]?permanent=true
 * Admin: permanently remove a message from the store.
 */
export async function handleHardDeleteMessage(id: string, request: Request, locals: App.Locals): Promise<Response> {
  try {
    const deleted = await hardDeleteMessage(id);
    if (!deleted) return errorResponse('Message not found', 404);

    await logEvent(
      'message_deleted',
      locals.adminId || 'anonymous',
      { message_id: id, type: 'permanent' },
      { ip: request.headers.get('x-forwarded-for') || undefined, userAgent: request.headers.get('user-agent') || undefined }
    );

    return jsonResponse({ message: 'Message permanently deleted' });
  } catch (err) {
    console.error('[messaging] Hard delete error:', err);
    return errorResponse('Unable to permanently delete message', 500);
  }
}

/**
 * Handle POST /api/messages/[id]/restore
 * Admin: restore a message from 'deleted' or 'archived' state.
 */
export async function handleRestoreMessage(id: string, request: Request, locals: App.Locals): Promise<Response> {
  try {
    const restored = await restoreMessage(id);
    if (!restored) return errorResponse('Message not found', 404);

    await logEvent(
      'admin_action',
      locals.adminId || 'anonymous',
      { message_id: id, action: 'restore' },
      { ip: request.headers.get('x-forwarded-for') || undefined, userAgent: request.headers.get('user-agent') || undefined }
    );

    return jsonResponse({ message: 'Message restored', record: restored });
  } catch (err) {
    console.error('[messaging] Restore error:', err);
    return errorResponse('Unable to restore message', 500);
  }
}
