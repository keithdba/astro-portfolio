/**
 * restore.ts
 *
 * Manual restore script for the local messaging store.
 * Usage: npx tsx scripts/restore.ts [backup-filename]
 */

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

const DATA_DIR = path.resolve(process.cwd(), '.data');
const BACKUP_DIR = path.resolve(process.cwd(), '.backups');
const STORE_FILE = path.join(DATA_DIR, 'messages.json');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function runRestore() {
  console.log('--- Message Store Restore Tool ---');

  const filename = process.argv[2] || 'messages-latest.json';
  const backupPath = path.join(BACKUP_DIR, filename);

  if (!fs.existsSync(backupPath)) {
    console.error(`Error: Backup file not found at ${backupPath}`);
    console.log('\nAvailable backups:');
    if (fs.existsSync(BACKUP_DIR)) {
      fs.readdirSync(BACKUP_DIR).forEach(file => console.log(` - ${file}`));
    }
    process.exit(1);
  }

  console.log(`Target Backup: ${filename}`);
  console.log(`Destination: ${STORE_FILE}`);

  rl.question('\nWARNING: This will overwrite your current message store. Continue? (y/N): ', (answer) => {
    if (answer.toLowerCase() !== 'y') {
      console.log('Restore cancelled.');
      process.exit(0);
    }

    try {
      // Create a safety backup of current state before restoring
      if (fs.existsSync(STORE_FILE)) {
        const safetyBackup = path.join(BACKUP_DIR, `pre-restore-safety-${Date.now()}.json`);
        fs.copyFileSync(STORE_FILE, safetyBackup);
        console.log(`Safety backup created: ${path.basename(safetyBackup)}`);
      }

      // Perform restore
      fs.copyFileSync(backupPath, STORE_FILE);
      console.log('\nSuccess! Message store restored.');
      process.exit(0);
    } catch (err) {
      console.error('Restore failed:', err);
      process.exit(1);
    }
  });
}

runRestore();
