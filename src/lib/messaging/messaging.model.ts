/**
 * messaging.model.ts
 * 
 * Core data model for the Local Messaging Inbox.
 * Defines schemas, types, and sanitization logic for all message entities.
 */

import { z } from 'zod';

// --------------------------------------------------------------------------
// Constants
// --------------------------------------------------------------------------

export const MESSAGE_STATUS = {
  UNREAD: 'unread',
  READ: 'read',
  ARCHIVED: 'archived',
  DELETED: 'deleted',
} as const;

export type MessageStatus = (typeof MESSAGE_STATUS)[keyof typeof MESSAGE_STATUS];

// --------------------------------------------------------------------------
// Sanitization
// --------------------------------------------------------------------------

/**
 * Escapes HTML entities to prevent XSS when rendering user-supplied strings.
 * Applied as a Zod `.transform()` on all text input fields.
 */
export function sanitizeInput(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

// --------------------------------------------------------------------------
// Schemas
// --------------------------------------------------------------------------

/** Schema for inbound form submissions (public-facing). */
export const MessageInputSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be under 100 characters')
    .transform(sanitizeInput),
  email: z
    .string()
    .email('Invalid email address')
    .max(254, 'Email must be under 254 characters')
    .transform((v) => v.trim().toLowerCase()),
  message: z
    .string()
    .min(10, 'Message must be at least 10 characters')
    .max(5000, 'Message must be under 5000 characters')
    .transform(sanitizeInput),
  // Hidden honeypot field — bots fill it, humans don't
  website: z.string().optional(),
});

export type MessageInput = z.input<typeof MessageInputSchema>;
export type MessageInputParsed = z.output<typeof MessageInputSchema>;

/** Schema for a persisted message record. */
export const MessageRecordSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.string().datetime(),
  sender_name: z.string(),
  sender_email: z.string().email(),
  message_body: z.string(),
  status: z.enum(['unread', 'read', 'archived', 'deleted']),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.any()).default({}),
  ai_insights: z.object({
    summary: z.string().optional(),
    sentiment: z.enum(['positive', 'neutral', 'negative']).optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    suggested_tags: z.array(z.string()).optional(),
  }).optional(),
});

export type MessageRecord = z.infer<typeof MessageRecordSchema>;

/** Schema for admin status-update requests. */
export const StatusUpdateSchema = z.object({
  status: z.enum(['unread', 'read', 'archived', 'deleted']),
});

export type StatusUpdate = z.infer<typeof StatusUpdateSchema>;
