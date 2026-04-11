/**
 * bootstrap-admin.mjs
 * 
 * Usage: node scripts/bootstrap-admin.mjs <username> <password>
 */

import { bootstrapAdmin } from '../src/lib/auth/auth.service';

const [username, password] = process.argv.slice(2);

if (!username || !password) {
  console.error('Usage: node scripts/bootstrap-admin.mjs <username> <password>');
  process.exit(1);
}

const result = bootstrapAdmin(username, password);

if (result.success) {
  console.log('\x1b[32m%s\x1b[0m', result.message);
} else {
  console.error('\x1b[31m%s\x1b[0m', result.message);
  process.exit(1);
}
