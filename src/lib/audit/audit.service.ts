/**
 * audit.service.ts
 *
 * Service for managing append-only audit logs.
 * Persists data to an atomic JSON store in .data/audit_logs.json.
 */

import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { AuditLog, AuditEventType } from './audit.model';

const DATA_DIR = path.resolve(process.cwd(), '.data');
const AUDIT_STORE_FILE = path.join(DATA_DIR, 'audit_logs.json');

/** Ensure data directory exists. */
function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/** Reads all logs from the store. */
function readLogs(): AuditLog[] {
  ensureDataDir();
  if (!fs.existsSync(AUDIT_STORE_FILE)) return [];
  try {
    const raw = fs.readFileSync(AUDIT_STORE_FILE, 'utf-8');
    return JSON.parse(raw) as AuditLog[];
  } catch (error) {
    console.error('[audit.service] Error reading audit logs:', error);
    return [];
  }
}

/** Atomic write to the audit log store. */
function writeLogs(logs: AuditLog[]): void {
  ensureDataDir();
  const localTmp = path.join(DATA_DIR, `.audit_logs-${Date.now()}.tmp`);
  fs.writeFileSync(localTmp, JSON.stringify(logs, null, 2), 'utf-8');
  fs.renameSync(localTmp, AUDIT_STORE_FILE);
}

// Simple write lock to prevent race conditions during log appends
let writeLock: Promise<void> = Promise.resolve();
function withWriteLock<T>(fn: () => T): Promise<T> {
  const next = writeLock.then(fn);
  writeLock = next.then(() => {}, () => {});
  return next;
}

/**
 * Logs a new audit event.
 */
export async function logEvent(
  action: AuditEventType,
  adminId: string | 'system' | 'anonymous',
  metadata: Record<string, any> = {},
  context?: { ip?: string; userAgent?: string }
): Promise<AuditLog> {
  const log: AuditLog = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    admin_id: adminId,
    action,
    metadata,
    ip_address: context?.ip,
    user_agent: context?.userAgent,
  };

  return withWriteLock(() => {
    const logs = readLogs();
    logs.push(log);
    // Keep logs sorted by timestamp desc (newest first) for easier UI consumption
    // though append-only technically implies newest at end. 
    // We'll append then maybe UI can sort, or we sort here. 
    // Requirement says "append-only", usually meaning immutable record of events.
    writeLogs(logs);
    return log;
  });
}

/**
 * Lists logs with optional filtering.
 */
export async function listLogs(): Promise<AuditLog[]> {
  // Return a copy, newest first
  return [...readLogs()].reverse();
}

/**
 * Formats logs for CSV export.
 */
export async function exportLogsToCSV(): Promise<string> {
  const logs = await listLogs();
  if (logs.length === 0) return 'timestamp,admin_id,action,metadata,ip_address\n';

  const headers = ['timestamp', 'admin_id', 'action', 'metadata', 'ip_address'];
  const rows = logs.map(log => [
    log.timestamp,
    log.admin_id,
    log.action,
    JSON.stringify(log.metadata).replace(/"/g, '""'), // Escape quotes for CSV
    log.ip_address || ''
  ].map(val => `"${val}"`).join(','));

  return [headers.join(','), ...rows].join('\n');
}
