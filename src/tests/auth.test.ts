/**
 * auth.test.ts
 *
 * Unit and integration tests for Admin Authentication and Session management.
 * Covers: Login logic, Session lifecycle, Password rotation, CSRF protection, and Logout.
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { 
  authenticate, 
  bootstrapAdmin, 
  getAdminById,
  rotatePassword 
} from '../lib/auth/auth.service';
import { 
  createSession, 
  verifyAndRefreshSession, 
  invalidateSession, 
  validateCsrfToken 
} from '../lib/auth/session.service';
import { logoutAdmin } from '../lib/auth/logout.controller';
import { handleLogin, handleRotatePassword } from '../lib/auth/auth.controller';
// NOTE: csrfMiddleware tests archived — CSRF is now enforced at the PHP layer.
// import { csrfMiddleware } from '../../src/middleware/csrf';

const DATA_DIR = path.resolve(process.cwd(), '.data');
const ADMINS_FILE = path.join(DATA_DIR, 'admins.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const AUDIT_FILE = path.join(DATA_DIR, 'audit_logs.json');

describe('Admin Authentication & Session Lifecycle', () => {
  
  // Setup: Clear test data
  beforeEach(() => {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    [ADMINS_FILE, SESSIONS_FILE, AUDIT_FILE].forEach(file => {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    });
  });

  // Cleanup after all tests
  afterAll(() => {
    [ADMINS_FILE, SESSIONS_FILE, AUDIT_FILE].forEach(file => {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    });
  });

  describe('Bootstrap & Authentication', () => {
    it('bootstraps the first admin successfully', () => {
      const result = bootstrapAdmin('admin', 'password123456');
      expect(result.success).toBe(true);
      
      const admin = getAdminById(fs.readFileSync(ADMINS_FILE, 'utf-8').match(/"id": "([^"]+)"/)?.[1] || '');
      expect(admin?.username).toBe('admin');
    });

    it('denies bootstrap if admin already exists', () => {
      bootstrapAdmin('admin', 'password123456');
      const result = bootstrapAdmin('other', 'password123456');
      expect(result.success).toBe(false);
    });

    it('authenticates with correct credentials', async () => {
      bootstrapAdmin('admin', 'password123456');
      const result = await authenticate({ username: 'admin', password: 'password123456', captchaToken: 'TEST_TOKEN_PASSTHROUGH' }, { ip: '127.0.0.1' });
      
      expect(result).not.toHaveProperty('error');
      expect((result as any).adminId).toBeDefined();
    });

    it('rejects incorrect password', async () => {
      bootstrapAdmin('admin', 'password123456');
      const result = await authenticate({ username: 'admin', password: 'wrong', captchaToken: 'TEST_TOKEN_PASSTHROUGH' }, { ip: '127.0.0.1' });
      
      expect(result).toHaveProperty('error');
      expect((result as any).error).toBe('Invalid credentials');
    });

    it('locks account after max failed attempts', async () => {
      bootstrapAdmin('admin', 'password123456');
      
      // 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await authenticate({ username: 'admin', password: 'wrong', captchaToken: 'TEST_TOKEN_PASSTHROUGH' }, { ip: '127.0.0.1' });
      }
      
      const result = await authenticate({ username: 'admin', password: 'password123456', captchaToken: 'TEST_TOKEN_PASSTHROUGH' }, { ip: '127.0.0.1' });
      expect(result).toHaveProperty('error');
      expect((result as any).error).toBe('Account temporarily locked');
    });
  });

  describe('Session Management', () => {
    it('creates and verifies a valid session', async () => {
      const session = await createSession('test-admin-id', { ip: '1.2.3.4' });
      expect(session.token).toBeDefined();
      expect(session.csrfToken).toBeDefined();
      
      const verified = await verifyAndRefreshSession(session.token);
      expect(verified?.adminId).toBe('test-admin-id');
    });

    it('invalidates a session', async () => {
      const session = await createSession('test-admin-id', {});
      await invalidateSession(session.token);
      
      const verified = await verifyAndRefreshSession(session.token);
      expect(verified).toBeUndefined();
    });

    it('validates a CSRF token correctly', async () => {
      const session = await createSession('test-admin-id', {});
      expect(validateCsrfToken(session, session.csrfToken)).toBe(true);
      expect(validateCsrfToken(session, 'wrong-token')).toBe(false);
      expect(validateCsrfToken(session, null)).toBe(false);
    });
  });

  describe('Password Rotation', () => {
    it('rotates password and invalidates old sessions', async () => {
      bootstrapAdmin('admin', 'password123456');
      const auth = await authenticate({ username: 'admin', password: 'password123456', captchaToken: 'TEST_TOKEN_PASSTHROUGH' }, {}) as any;
      const sessionToken = auth.token;
      
      const rotateResult = await rotatePassword(auth.adminId, 'password123456', 'newpassword987654');
      expect(rotateResult.success).toBe(true);
      
      // Check old session is gone
      const session = await verifyAndRefreshSession(sessionToken);
      expect(session).toBeUndefined();
      
      // Check new login works
      const newAuth = await authenticate({ username: 'admin', password: 'newpassword987654', captchaToken: 'TEST_TOKEN_PASSTHROUGH' }, {});
      expect(newAuth).not.toHaveProperty('error');
    });
  });

  describe('Logout & CSRF Middleware', () => {
    it('logoutAdmin controller returns successful response and clears cookie', async () => {
      const session = await createSession('admin-id', {});
      const locals = { session } as any;
      
      const response = await logoutAdmin(locals);
      expect(response.status).toBe(200);
      expect(response.headers.get('Set-Cookie')).toContain('Max-Age=0');
      
      // Verify session is invalidated in DB
      const verified = await verifyAndRefreshSession(session.token);
      expect(verified).toBeUndefined();
    });

    it.skip('csrfMiddleware blocks requests without valid token (archived — now PHP layer)', async () => {
      const session = await createSession('admin-id', {});
      const req = new Request('https://example.com/admin/delete', {
        method: 'POST',
        headers: { 'x-csrf-token': 'wrong' }
      });
      const locals = { session };
      const next = () => Promise.resolve(new Response());
      
      const response = await csrfMiddleware({ request: req, locals, url: new URL(req.url) } as any, next);
      expect(response.status).toBe(403);
    });

    it.skip('csrfMiddleware allows logout with stale token if origin matches (archived — now PHP layer)', async () => {
      const session = await createSession('admin-id', {});
      const req = new Request('https://example.com/admin/logout', {
        method: 'POST',
        headers: { 
          'x-csrf-token': 'stale',
          'origin': 'https://example.com'
        }
      });
      const locals = { session };
      const next = () => Promise.resolve(new Response('Success', { status: 200 }));
      
      const response = await csrfMiddleware({ request: req, locals, url: new URL(req.url) } as any, next);
      expect(response.status).toBe(200);
    });
  });

  describe('HTTP Controllers', () => {
    it('handleLogin returns 200 and set-cookie on success', async () => {
      bootstrapAdmin('admin', 'password123456');
      const req = new Request('https://example.com/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: 'admin', password: 'password123456', captchaToken: 'TEST_TOKEN_PASSTHROUGH' }),
        headers: { 'Content-Type': 'application/json' }
      });
      
      const response = await handleLogin(req);
      expect(response.status).toBe(200);
      expect(response.headers.get('Set-Cookie')).toContain('macdaly_session');
      const data = await response.json();
      expect(data.csrfToken).toBeDefined();
    });

    it('handleLogin returns 401 on failure', async () => {
      bootstrapAdmin('admin', 'password123456');
      const req = new Request('https://example.com/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: 'admin', password: 'wrong', captchaToken: 'TEST_TOKEN_PASSTHROUGH' }),
        headers: { 'Content-Type': 'application/json' }
      });
      
      const response = await handleLogin(req);
      expect(response.status).toBe(401);
    });

    it('handleRotatePassword works and clears cookie', async () => {
      bootstrapAdmin('admin', 'password123456');
      const auth = await authenticate({ username: 'admin', password: 'password123456', captchaToken: 'TEST_TOKEN_PASSTHROUGH' }, {}) as any;
      const session = auth;
      const locals = { session };
      
      const req = new Request('https://example.com/api/auth/rotate-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: 'password123456', newPassword: 'newpasswordABC123' }),
        headers: { 'Content-Type': 'application/json' }
      });
      
      const response = await handleRotatePassword(req, locals as any);
      expect(response.status).toBe(200);
      expect(response.headers.get('Set-Cookie')).toContain('Max-Age=0');
    });
  });
});
