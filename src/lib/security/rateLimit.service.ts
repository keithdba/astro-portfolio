/**
 * rateLimit.service.ts
 *
 * Service for managing IP-based rate limiting and throttling.
 * Persists attempts to .data/rate_limits.json.
 */

import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve(process.cwd(), '.data');
const LIMITS_FILE = path.join(DATA_DIR, 'rate_limits.json');

export type RateLimitBucket = 'login' | 'messaging' | 'admin' | 'api';

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  lockoutMs?: number;
}

interface AttemptRecord {
  timestamps: number[];
  lockedUntil?: number;
}

const DEFAULT_CONFIGS: Record<RateLimitBucket, RateLimitConfig> = {
  login: {
    maxAttempts: parseInt(process.env.RATE_LIMIT_LOGIN_MAX || '5'),
    windowMs: parseInt(process.env.RATE_LIMIT_LOGIN_WINDOW || '60000'), // 1 min
    lockoutMs: parseInt(process.env.RATE_LIMIT_LOGIN_LOCKOUT || '900000'), // 15 mins
  },
  messaging: {
    maxAttempts: parseInt(process.env.RATE_LIMIT_MESSAGING_MAX || '3'),
    windowMs: parseInt(process.env.RATE_LIMIT_MESSAGING_WINDOW || '60000'), // 1 min
    lockoutMs: parseInt(process.env.RATE_LIMIT_MESSAGING_LOCKOUT || '300000'), // 5 mins
  },
  admin: {
    maxAttempts: parseInt(process.env.RATE_LIMIT_ADMIN_MAX || '30'),
    windowMs: parseInt(process.env.RATE_LIMIT_ADMIN_WINDOW || '60000'), // 1 min
  },
  api: {
    maxAttempts: parseInt(process.env.RATE_LIMIT_API_MAX || '100'),
    windowMs: parseInt(process.env.RATE_LIMIT_API_WINDOW || '60000'), // 1 min
  }
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readStore(): Record<string, Record<string, AttemptRecord>> {
  ensureDataDir();
  if (!fs.existsSync(LIMITS_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(LIMITS_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function writeStore(data: Record<string, Record<string, AttemptRecord>>) {
  ensureDataDir();
  const tmp = path.join(DATA_DIR, `.rate_limits-${Date.now()}.tmp`);
  fs.writeFileSync(tmp, JSON.stringify(data));
  fs.renameSync(tmp, LIMITS_FILE);
}

/**
 * Checks if a request from a given IP to a specific bucket is rate limited.
 * Returns { limited: boolean, retryAfter?: number, reason?: string }
 */
export function checkRateLimit(ip: string, bucket: RateLimitBucket): { limited: boolean; retryAfter?: number } {
  const store = readStore();
  const bucketStore = store[bucket] || {};
  const record = bucketStore[ip] || { timestamps: [] };
  const config = DEFAULT_CONFIGS[bucket];
  const now = Date.now();

  // 1. Check if currently locked out
  if (record.lockedUntil && record.lockedUntil > now) {
    return { limited: true, retryAfter: Math.ceil((record.lockedUntil - now) / 1000) };
  }

  // 2. Filter attempts outside the current window
  const recentAttempts = record.timestamps.filter(t => now - t < config.windowMs);
  
  // 3. Check if limit exceeded
  if (recentAttempts.length >= config.maxAttempts) {
    // Apply lockout if configured
    if (config.lockoutMs) {
      record.lockedUntil = now + config.lockoutMs;
      bucketStore[ip] = record;
      store[bucket] = bucketStore;
      writeStore(store);
      return { limited: true, retryAfter: Math.ceil(config.lockoutMs / 1000) };
    }

    const oldestRecent = recentAttempts[0];
    const retryAfter = Math.ceil((config.windowMs - (now - oldestRecent)) / 1000);
    return { limited: true, retryAfter };
  }

  return { limited: false };
}

/**
 * Records a new attempt for a given IP in a specific bucket.
 */
export function recordAttempt(ip: string, bucket: RateLimitBucket) {
  const store = readStore();
  const bucketStore = store[bucket] || {};
  const record = bucketStore[ip] || { timestamps: [] };
  
  record.timestamps.push(Date.now());
  
  // Keep the store clean by trimming old attempts
  const config = DEFAULT_CONFIGS[bucket];
  const now = Date.now();
  record.timestamps = record.timestamps.filter(t => now - t < config.windowMs * 2); // Keep a bit extra for safety

  bucketStore[ip] = record;
  store[bucket] = bucketStore;
  writeStore(store);
}

/**
 * Resets limits for an IP in a bucket (e.g. on successful login).
 */
export function resetLimit(ip: string, bucket: RateLimitBucket) {
  const store = readStore();
  if (store[bucket] && store[bucket][ip]) {
    delete store[bucket][ip];
    writeStore(store);
  }
}
