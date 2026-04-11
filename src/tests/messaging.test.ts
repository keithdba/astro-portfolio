/**
 * messaging.test.ts
 *
 * Unit tests for the Local Messaging Inbox feature.
 * Covers: model validation + sanitization, service CRUD, controller responses.
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// --------------------------------------------------------------------------
// Model Tests
// --------------------------------------------------------------------------

// Use Vite path resolution — Astro's getViteConfig handles .ts extension resolution
import {
  MessageInputSchema,
  StatusUpdateSchema,
  sanitizeInput,
} from '../lib/messaging/messaging.model';

describe('messaging.model – sanitizeInput', () => {
  it('escapes HTML entities', () => {
    expect(sanitizeInput('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
    );
  });

  it('trims whitespace', () => {
    expect(sanitizeInput('  hello  ')).toBe('hello');
  });

  it('handles empty string', () => {
    expect(sanitizeInput('')).toBe('');
  });

  it('escapes single quotes', () => {
    expect(sanitizeInput("it's")).toBe('it&#x27;s');
  });
});

describe('messaging.model – MessageInputSchema', () => {
  const validInput = {
    name: 'Jane Doe',
    email: 'jane@example.com',
    message: 'Hello, this is a test message for you!',
  };

  it('accepts valid input', () => {
    const result = MessageInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('rejects missing name', () => {
    const result = MessageInputSchema.safeParse({ ...validInput, name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = MessageInputSchema.safeParse({ ...validInput, email: 'not-email' });
    expect(result.success).toBe(false);
  });

  it('rejects message shorter than 10 characters', () => {
    const result = MessageInputSchema.safeParse({ ...validInput, message: 'hi' });
    expect(result.success).toBe(false);
  });

  it('normalizes email to lowercase', () => {
    const result = MessageInputSchema.safeParse({
      ...validInput,
      email: 'Jane@Example.COM',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('jane@example.com');
    }
  });

  it('sanitizes HTML in name', () => {
    const result = MessageInputSchema.safeParse({
      ...validInput,
      name: '<b>Bob</b>',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('&lt;b&gt;Bob&lt;/b&gt;');
    }
  });

  it('allows optional website (honeypot) field', () => {
    const result = MessageInputSchema.safeParse({
      ...validInput,
      website: 'http://spam.com',
    });
    expect(result.success).toBe(true);
  });
});

describe('messaging.model – StatusUpdateSchema', () => {
  it('accepts valid statuses', () => {
    expect(StatusUpdateSchema.safeParse({ status: 'unread' }).success).toBe(true);
    expect(StatusUpdateSchema.safeParse({ status: 'read' }).success).toBe(true);
    expect(StatusUpdateSchema.safeParse({ status: 'archived' }).success).toBe(true);
  });

  it('rejects invalid status', () => {
    expect(StatusUpdateSchema.safeParse({ status: 'junk' }).success).toBe(false);
  });
});

// --------------------------------------------------------------------------
// Service Tests
// --------------------------------------------------------------------------

import {
  createMessage,
  listMessages,
  getMessageById,
  updateMessageStatus,
  deleteMessage,
  hardDeleteMessage,
} from '../lib/messaging/messaging.service';

const DATA_DIR = path.resolve(process.cwd(), '.data');
const STORE_FILE = path.join(DATA_DIR, 'messages.json');

describe('messaging.service – CRUD', () => {
  beforeEach(() => {
    // Clean the store before each test
    if (fs.existsSync(STORE_FILE)) {
      fs.unlinkSync(STORE_FILE);
    }
  });

  afterAll(() => {
    // Cleanup after all tests
    if (fs.existsSync(STORE_FILE)) {
      fs.unlinkSync(STORE_FILE);
    }
  });

  it('creates a message and retrieves it', async () => {
    const record = await createMessage({
      name: 'Alice',
      email: 'alice@test.com',
      message: 'Hello from the test suite!',
    });

    expect(record).toBeDefined();
    expect(record.id).toBeTruthy();
    expect(record.sender_name).toBe('Alice');
    expect(record.sender_email).toBe('alice@test.com');
    expect(record.status).toBe('unread');

    const fetched = getMessageById(record.id);
    expect(fetched).toEqual(record);
  });

  it('lists all messages', async () => {
    await createMessage({ name: 'A', email: 'a@t.com', message: 'Test message one here' });
    await createMessage({ name: 'B', email: 'b@t.com', message: 'Test message two here' });

    const all = listMessages();
    expect(all.length).toBe(2);
  });

  it('filters by status', async () => {
    const msg = await createMessage({
      name: 'C',
      email: 'c@t.com',
      message: 'Another test message here',
    });
    await updateMessageStatus(msg.id, 'read');

    expect(listMessages('unread').length).toBe(0);
    expect(listMessages('read').length).toBe(1);
  });

  it('updates message status', async () => {
    const msg = await createMessage({
      name: 'D',
      email: 'd@t.com',
      message: 'Status update test here',
    });

    const updated = await updateMessageStatus(msg.id, 'archived');
    expect(updated?.status).toBe('archived');
  });

  it('returns undefined when updating non-existent ID', async () => {
    const result = await updateMessageStatus('00000000-0000-0000-0000-000000000000', 'read');
    expect(result).toBeUndefined();
  });

  it('soft-deletes a message', async () => {
    const msg = await createMessage({
      name: 'E',
      email: 'e@t.com',
      message: 'Delete me please test',
    });

    const deleted = await deleteMessage(msg.id);
    expect(deleted).toBe(true);
    
    const fetched = getMessageById(msg.id);
    expect(fetched?.status).toBe('deleted');
    
    // Should be hidden from default list
    const all = listMessages();
    expect(all.find(m => m.id === msg.id)).toBeUndefined();
  });

  it('hard-deletes a message', async () => {
    const msg = await createMessage({
      name: 'F',
      email: 'f@t.com',
      message: 'Hard delete test here',
    });

    const deleted = await hardDeleteMessage(msg.id);
    expect(deleted).toBe(true);
    expect(getMessageById(msg.id)).toBeUndefined();
  });

  it('returns false when deleting non-existent ID', async () => {
    const result = await deleteMessage('00000000-0000-0000-0000-000000000000');
    expect(result).toBe(false);
  });
});
