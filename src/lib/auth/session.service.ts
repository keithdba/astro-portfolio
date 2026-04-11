/**
 * session.service.ts
 * 
 * Manages the lifecycle of Admin sessions including idle timeouts,
 * absolute expiry, and CSRF token management.
 */

import { randomBytes, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { SessionRecord } from './auth.model';

const DATA_DIR = path.resolve(process.cwd(), '.data');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

// Session configuration
const IDLE_TIMEOUT_MS = 1000 * 60 * 20; // 20 minutes idle timeout
const ABSOLUTE_TIMEOUT_MS = 1000 * 60 * 60 * 24; // 24 hours absolute expiry

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readSessions(): SessionRecord[] {
  ensureDataDir();
  if (!fs.existsSync(SESSIONS_FILE)) return [];
  try {
    const raw = fs.readFileSync(SESSIONS_FILE, 'utf-8');
    const sessions = JSON.parse(raw) as SessionRecord[];
    // Auto-clean truly expired sessions on read
    const now = new Date();
    return sessions.filter(s => new Date(s.expiresAt) > now);
  } catch {
    return [];
  }
}

const writeLock = {
  current: Promise.resolve(),
  async lock<T>(fn: () => Promise<T> | T): Promise<T> {
    const next = this.current.then(fn);
    this.current = next.then(() => {}, () => {});
    return next;
  }
};

async function writeSessions(sessions: SessionRecord[]) {
  return writeLock.lock(async () => {
    ensureDataDir();
    const tmp = path.join(DATA_DIR, `.sessions-${Date.now()}.tmp`);
    fs.writeFileSync(tmp, JSON.stringify(sessions, null, 2));
    fs.renameSync(tmp, SESSIONS_FILE);
  });
}

/** Create a new session for an admin */
export async function createSession(adminId: string, metadata: { ua?: string; ip?: string }): Promise<SessionRecord> {
  const now = new Date();
  const session: SessionRecord = {
    id: randomUUID(),
    adminId,
    token: randomBytes(32).toString('hex'),
    csrfToken: randomBytes(32).toString('hex'),
    expiresAt: new Date(now.getTime() + ABSOLUTE_TIMEOUT_MS).toISOString(),
    lastActiveAt: now.toISOString(),
    createdAt: now.toISOString(),
    userAgent: metadata.ua,
    ipAddress: metadata.ip,
  };

  const sessions = readSessions();
  sessions.push(session);
  await writeSessions(sessions);
  
  return session;
}

/** 
 * Verify and refresh a session.
 * Handles idle timeout and absolute expiry logic.
 */
export async function verifyAndRefreshSession(token: string): Promise<SessionRecord | undefined> {
  const sessions = readSessions();
  const index = sessions.findIndex(s => s.token === token);
  
  if (index === -1) return undefined;
  
  const session = sessions[index];
  const now = new Date();

  // 1. Check absolute expiry
  if (new Date(session.expiresAt) < now) {
    invalidateSession(token);
    return undefined;
  }

  // 2. Check idle timeout
  if (now.getTime() - new Date(session.lastActiveAt).getTime() > IDLE_TIMEOUT_MS) {
    invalidateSession(token);
    return undefined;
  }

  // 3. Refresh idle timeout
  session.lastActiveAt = now.toISOString();
  await writeSessions(sessions);
  
  return session;
}

/** 
 * Invalidate a specific session server-side.
 * 
 * This effectively removes the session record from the persistent store,
 * thereby invalidating the session token, CSRF token, and any other 
 * data associated with this specific login instance.
 */
export async function invalidateSession(token: string) {
  const sessions = readSessions();
  const initialCount = sessions.length;
  const filtered = sessions.filter(s => s.token !== token);
  
  // Only write if something actually changed
  if (filtered.length !== initialCount) {
    await writeSessions(filtered);
  }
}

/** Invalidate all sessions for a specific admin (e.g. on password change) */
export async function invalidateAllSessionsForAdmin(adminId: string) {
  const sessions = readSessions();
  await writeSessions(sessions.filter(s => s.adminId !== adminId));
}

/** Validate CSRF token for a session */
export function validateCsrfToken(session: SessionRecord, providedToken: string | null): boolean {
  if (!providedToken) return false;
  return session.csrfToken === providedToken.trim();
}

/** Rotate CSRF token for a session (optional, can be called per-request or per-mutation) */
export async function rotateCsrfToken(token: string): Promise<string | undefined> {
  const sessions = readSessions();
  const session = sessions.find(s => s.token === token);
  
  if (!session) return undefined;
  
  session.csrfToken = randomBytes(32).toString('hex');
  await writeSessions(sessions);
  
  return session.csrfToken;
}
