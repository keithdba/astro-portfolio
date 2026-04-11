import { randomUUID, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { ErrorLog, LogFilter } from './logs.model';

const DATA_DIR = path.resolve(process.cwd(), '.data');
const ERROR_STORE_FILE = path.join(DATA_DIR, 'error_logs.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readLogs(): ErrorLog[] {
  ensureDataDir();
  if (!fs.existsSync(ERROR_STORE_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(ERROR_STORE_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeLogs(logs: ErrorLog[]) {
  ensureDataDir();
  const tmp = path.join(DATA_DIR, `.error_logs-${Date.now()}.tmp`);
  fs.writeFileSync(tmp, JSON.stringify(logs, null, 2), 'utf-8');
  fs.renameSync(tmp, ERROR_STORE_FILE);
}

const writeLock = {
  current: Promise.resolve(),
  async lock<T>(fn: () => T): Promise<T> {
    const next = this.current.then(fn);
    this.current = next.then(() => {}, () => {});
    return next;
  }
};

/**
 * Capture an error securely.
 * Redacts sensitive headers and fields.
 */
export async function captureError(error: Error | unknown, request: Request, adminId?: string): Promise<string> {
  const correlationId = `ERR-${randomBytes(4).toString('hex').toUpperCase()}`;
  const timestamp = new Date().toISOString();
  
  const err = error instanceof Error ? error : new Error(String(error));
  
  const url = new URL(request.url);
  
  // Redact sensitive data from metadata
  const metadata: Record<string, any> = {
    headers: {}
  };
  
  const sensitiveHeaders = ['cookie', 'authorization', 'x-csrf-token', 'proxy-authorization'];
  request.headers.forEach((value, key) => {
    if (sensitiveHeaders.includes(key.toLowerCase())) {
      metadata.headers[key] = '[REDACTED]';
    } else {
      metadata.headers[key] = value;
    }
  });

  const log: ErrorLog = {
    id: randomUUID(),
    correlationId,
    timestamp,
    message: err.message,
    stack: err.stack,
    path: url.pathname,
    method: request.method,
    userAgent: request.headers.get('user-agent') || undefined,
    adminId,
    metadata,
  };

  await writeLock.lock(() => {
    const logs = readLogs();
    logs.push(log);
    // Keep only last 1000 errors to prevent file bloat
    if (logs.length > 1000) logs.shift();
    writeLogs(logs);
  });

  return correlationId;
}

export async function getErrorLogs(filter?: LogFilter): Promise<{ logs: ErrorLog[], total: number }> {
  let logs = readLogs();
  
  // Apply filters
  if (filter) {
    if (filter.dateFrom) {
      const from = new Date(filter.dateFrom);
      logs = logs.filter(l => new Date(l.timestamp) >= from);
    }
    if (filter.dateTo) {
      const to = new Date(filter.dateTo);
      logs = logs.filter(l => new Date(l.timestamp) <= to);
    }
    if (filter.path) {
      logs = logs.filter(l => l.path.includes(filter.path!));
    }
    if (filter.errorType) {
      logs = logs.filter(l => l.message.toLowerCase().includes(filter.errorType!.toLowerCase()));
    }
  }

  const total = logs.length;
  // Sort newest first
  logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  if (filter) {
    logs = logs.slice(filter.offset, filter.offset + filter.limit);
  }

  return { logs, total };
}

export async function getErrorLogById(id: string): Promise<ErrorLog | undefined> {
  return readLogs().find(l => l.id === id);
}

export async function exportErrorLogsJSON(): Promise<string> {
  return JSON.stringify(readLogs(), null, 2);
}
