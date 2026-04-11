/**
 * auth.service.ts
 * 
 * Secure service layer for Admin Authentication.
 * Handles hashing, session management, and JSON-based persistence.
 */

import { scryptSync, randomBytes, timingSafeEqual, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createSession, invalidateSession, invalidateAllSessionsForAdmin } from './session.service';

const DATA_DIR = path.resolve(process.cwd(), '.data');
const ADMINS_FILE = path.join(DATA_DIR, 'admins.json');
const ATTEMPTS_FILE = path.join(DATA_DIR, 'attempts.json');

// Auth config
const LOCKOUT_DURATION_MS = 1000 * 60 * 15; // 15 minutes lockout
const MAX_FAILED_ATTEMPTS = 5;

// Hashing config
const SCRYPT_ALGO = {
  N: 16384,
  r: 8,
  p: 1,
  keyLen: 64,
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// --- Persistence Helpers ---

function readAdmins(): AdminRecord[] {
  ensureDataDir();
  if (!fs.existsSync(ADMINS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(ADMINS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeAdmins(admins: AdminRecord[]) {
  ensureDataDir();
  const tmp = path.join(DATA_DIR, `.admins-${Date.now()}.tmp`);
  fs.writeFileSync(tmp, JSON.stringify(admins, null, 2));
  fs.renameSync(tmp, ADMINS_FILE);
}

// --- Security Helpers ---

function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, SCRYPT_ALGO.keyLen, SCRYPT_ALGO).toString('hex');
}

function verifyPassword(password: string, hash: string, salt: string): boolean {
  const newHash = hashPassword(password, salt);
  return timingSafeEqual(Buffer.from(newHash, 'hex'), Buffer.from(hash, 'hex'));
}

// --- Service Operations ---

/** Attempt to authenticate an admin */
export async function authenticate(input: LoginInput, metadata: { ua?: string; ip?: string }): Promise<SessionRecord | { error: string; lockedUntil?: string }> {
  const admins = readAdmins();
  const admin = admins.find(a => a.username === input.username.toLowerCase());

  if (!admin) {
    return { error: 'Invalid credentials' };
  }

  const now = new Date();

  // Check lockout
  if (admin.lockedUntil && new Date(admin.lockedUntil) > now) {
    return { error: 'Account temporarily locked', lockedUntil: admin.lockedUntil };
  }

  const isValid = verifyPassword(input.password, admin.passwordHash, admin.salt);

  if (isValid) {
    // Reset failures and update last login
    admin.failedAttempts = 0;
    admin.lockedUntil = null;
    admin.lastLoginAt = now.toISOString();
    admin.updatedAt = now.toISOString();
    writeAdmins(admins);

    // Create session via session.service
    return await createSession(admin.id, metadata);
  } else {
    // Record failure
    admin.failedAttempts += 1;
    if (admin.failedAttempts >= MAX_FAILED_ATTEMPTS) {
      admin.lockedUntil = new Date(now.getTime() + LOCKOUT_DURATION_MS).toISOString();
    }
    admin.updatedAt = now.toISOString();
    writeAdmins(admins);

    return { error: 'Invalid credentials' };
  }
}

/** Get admin by ID */
export function getAdminById(id: string): AdminRecord | undefined {
  return readAdmins().find(a => a.id === id);
}

/** 
 * Bootstrap the first admin if none exist.
 * This is intended to be called by a script.
 */
export function bootstrapAdmin(username: string, password: string): { success: boolean; message: string } {
  const admins = readAdmins();
  if (admins.length > 0) {
    return { success: false, message: 'Admin already exists. Cannot bootstrap.' };
  }

  const salt = randomBytes(16).toString('hex');
  const now = new Date().toISOString();
  
  const newAdmin: AdminRecord = {
    id: randomUUID(),
    username: username.toLowerCase(),
    passwordHash: hashPassword(password, salt),
    salt,
    createdAt: now,
    updatedAt: now,
    failedAttempts: 0,
  };

  admins.push(newAdmin);
  writeAdmins(admins);
  return { success: true, message: `Admin "${username}" created successfully.` };
}

/** Update an admin's password */
export async function rotatePassword(adminId: string, currentPassword: string, newPassword: string): Promise<{ success: boolean, error?: string }> {
  const admins = readAdmins();
  const admin = admins.find(a => a.id === adminId);
  
  if (!admin) return { success: false, error: 'Admin not found' };

  const isValid = verifyPassword(currentPassword, admin.passwordHash, admin.salt);
  if (!isValid) return { success: false, error: 'Current password incorrect' };

  const salt = randomBytes(16).toString('hex');
  admin.passwordHash = hashPassword(newPassword, salt);
  admin.salt = salt;
  admin.updatedAt = new Date().toISOString();

  writeAdmins(admins);

  // Invalidate all sessions for this admin on password change
  await invalidateAllSessionsForAdmin(adminId);

  return { success: true };
}
