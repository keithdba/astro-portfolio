/**
 * messaging.service.ts
 *
 * Server-side service layer for the Local Messaging Inbox.
 * Owns all data persistence: atomic JSON file writes, CRUD operations,
 * and a simple concurrency guard to serialize mutations.
 *
 * Design decisions:
 *  - JSON file store keeps the stack dependency-free (no SQLite, no DB driver).
 *  - Atomic writes (tmp → rename) prevent half-written data on crash.
 *  - A promise-based mutex serializes writes without blocking reads.
 */

import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { MessageRecord, MessageInputParsed, MessageStatus } from './messaging.model';

// --------------------------------------------------------------------------
// Storage Configuration
// --------------------------------------------------------------------------

const DATA_DIR = path.resolve(process.cwd(), '.data');
const STORE_FILE = path.join(DATA_DIR, 'messages.json');

/** Ensure the data directory exists on first import. */
function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// --------------------------------------------------------------------------
// Low-Level I/O (atomic writes)
// --------------------------------------------------------------------------

function readStore(): MessageRecord[] {
  ensureDataDir();
  if (!fs.existsSync(STORE_FILE)) return [];
  const raw = fs.readFileSync(STORE_FILE, 'utf-8');
  try {
    return JSON.parse(raw) as MessageRecord[];
  } catch {
    // Corrupted file — start fresh (the old file is not deleted, just overwritten on next write)
    console.error('[messaging.service] Corrupt store file, returning empty array.');
    return [];
  }
}

/**
 * Atomic write: serialize → temp file → rename.
 * `fs.renameSync` is atomic on POSIX when src & dest are on the same filesystem.
 */
function writeStore(records: MessageRecord[]): void {
  ensureDataDir();
  // Write to a temp file in the same data dir to guarantee same-filesystem atomic rename
  const localTmp = path.join(DATA_DIR, `.messages-${Date.now()}.tmp`);
  fs.writeFileSync(localTmp, JSON.stringify(records, null, 2), 'utf-8');
  fs.renameSync(localTmp, STORE_FILE);
}

// --------------------------------------------------------------------------
// Concurrency Guard (simple promise queue)
// --------------------------------------------------------------------------

let writeLock: Promise<void> = Promise.resolve();

/**
 * Enqueue a mutation so only one write is in-flight at a time.
 * Readers don't need the lock — they see a consistent snapshot via atomic rename.
 */
function withWriteLock<T>(fn: () => T): Promise<T> {
  const next = writeLock.then(fn);
  // Chain the lock to the *settling* of this operation, not its result
  writeLock = next.then(
    () => {},
    () => {},
  );
  return next;
}

// --------------------------------------------------------------------------
// CRUD Operations
// --------------------------------------------------------------------------

import { inboundPipeline } from './agent.pipeline';
import { messageEvents } from './message.events';
import './agent.hooks'; // Ensure hooks are registered

/** Create a new message from validated (sanitised) input. */
export async function createMessage(input: MessageInputParsed): Promise<MessageRecord> {
  let record: MessageRecord = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    sender_name: input.name,
    sender_email: input.email,
    message_body: input.message,
    status: 'unread',
    tags: [],
    metadata: {},
  };

  // Run through agentic pipeline
  record = await inboundPipeline.process(record);

  const result = await withWriteLock(() => {
    const records = readStore();
    records.push(record);
    writeStore(records);
    return record;
  });

  messageEvents.emitCreated(result);
  return result;
}

/** 
 * List messages, optionally filtered by status.
 * Hides 'deleted' messages by default unless explicitly asked for 'deleted' status.
 */
export function listMessages(status?: MessageStatus): MessageRecord[] {
  const records = readStore();
  if (status) {
    return records.filter((r) => r.status === status);
  }
  // Default: hide soft-deleted messages
  return records.filter((r) => r.status !== 'deleted');
}

/** Retrieve a single message by ID. */
export function getMessageById(id: string): MessageRecord | undefined {
  return readStore().find((r) => r.id === id);
}

/** Update the status of a message. Returns the updated record or undefined. */
export async function updateMessageStatus(
  id: string,
  newStatus: MessageStatus,
): Promise<MessageRecord | undefined> {
  const result = await withWriteLock(() => {
    const records = readStore();
    const idx = records.findIndex((r) => r.id === id);
    if (idx === -1) return undefined;
    
    records[idx].status = newStatus;
    writeStore(records);
    return records[idx];
  });

  if (result) {
    messageEvents.emitUpdated(result);
    if (newStatus === 'archived') {
      messageEvents.emitArchived(result);
    }
  }

  return result;
}

/** 
 * Soft-delete a message by ID by changing its status to 'deleted'.
 * Returns true if the message was found and updated.
 */
export async function deleteMessage(id: string): Promise<boolean> {
  const result = await updateMessageStatus(id, 'deleted');
  return !!result;
}

/**
 * Permanently deletes a message from the store.
 * Requires explicit admin action.
 */
export async function hardDeleteMessage(id: string): Promise<boolean> {
  const result = await withWriteLock(() => {
    const records = readStore();
    const filtered = records.filter((r) => r.id !== id);
    if (filtered.length === records.length) return false;
    writeStore(filtered);
    return true;
  });

  if (result) {
    messageEvents.emitDeleted(id);
  }

  return result;
}

/**
 * Restores a deleted or archived message to 'read' status.
 */
export async function restoreMessage(id: string): Promise<MessageRecord | undefined> {
  return updateMessageStatus(id, 'read');
}
