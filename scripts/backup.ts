/**
 * backup.ts
 *
 * Manual backup script for the local messaging store.
 * Usage: npx tsx scripts/backup.ts
 */

import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve(process.cwd(), '.data');
const BACKUP_DIR = path.resolve(process.cwd(), '.backups');
const STORE_FILE = path.join(DATA_DIR, 'messages.json');

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function runBackup() {
  console.log('--- Starting Message Store Backup ---');

  if (!fs.existsSync(STORE_FILE)) {
    console.error(`Error: Store file not found at ${STORE_FILE}`);
    process.exit(1);
  }

  ensureDir(BACKUP_DIR);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFilename = `messages-backup-${timestamp}.json`;
  const backupPath = path.join(BACKUP_DIR, backupFilename);

  try {
    // We only backup messages.json, NOT admins.json (to preserve security)
    fs.copyFileSync(STORE_FILE, backupPath);
    
    const stats = fs.statSync(backupPath);
    console.log(`Success! Backup created: ${backupFilename}`);
    console.log(`Path: ${backupPath}`);
    console.log(`Size: ${(stats.size / 1024).toFixed(2)} KB`);
    
    // Create a "latest" symlink or copy for easy reference
    const latestPath = path.join(BACKUP_DIR, 'messages-latest.json');
    fs.copyFileSync(backupPath, latestPath);
    console.log(`Updated "latest" pointer: ${latestPath}`);

  } catch (err) {
    console.error('Backup failed:', err);
    process.exit(1);
  }
}

runBackup();
