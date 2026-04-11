/**
 * reset-admin-password.ts
 * 
 * Usage: npx tsx scripts/reset-admin-password.ts <username> <new-password>
 * 
 * Bypasses current-password check for out-of-band recovery.
 */

import fs from 'node:fs';
import path from 'node:path';
import { scryptSync, randomBytes } from 'node:crypto';

const [username, newPassword] = process.argv.slice(2);

if (!username || !newPassword) {
  console.error('Usage: npx tsx scripts/reset-admin-password.ts <username> <new-password>');
  process.exit(1);
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const ADMINS_FILE = path.join(DATA_DIR, 'admins.json');

if (!fs.existsSync(ADMINS_FILE)) {
  console.error('Admins file not found. Run bootstrap first.');
  process.exit(1);
}

const admins = JSON.parse(fs.readFileSync(ADMINS_FILE, 'utf-8'));
const admin = admins.find(a => a.username === username.toLowerCase());

if (!admin) {
  console.error(`Admin "${username}" not found.`);
  process.exit(1);
}

const salt = randomBytes(16).toString('hex');
const hash = scryptSync(newPassword, salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex');

admin.passwordHash = hash;
admin.salt = salt;
admin.updatedAt = new Date().toISOString();
admin.failedAttempts = 0;
admin.lockedUntil = null;

fs.writeFileSync(ADMINS_FILE, JSON.stringify(admins, null, 2));
console.log('\x1b[32m%s\x1b[0m', `Password for "${username}" has been reset.`);
