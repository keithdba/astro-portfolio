# Feature Enhancement: Admin Login Experience

**Date:** 2026-04-10
**Author:** Antigravity Feature Enhancement Agent
**Workspace:** astro-portfolio

## Overview
Implement a secure, dependency-conscious Admin Login Experience for MacDaly.com (Astro-based). This system provides authentication, session management, and credential lifecycle tools without relying on external database services, maintaining the "local-first" architecture established in the messaging system.

## Scope & Requirements

### Functional
- **Route:** `/admin/login` for credentials entry.
- **Authentication:** Username + Password verification.
- **Security:** Password hashing using Node's native `crypto` (scrypt) or equivalent.
- **Sessions:** HttpOnly, Secure, SameSite cookies for session persistence.
- **Navigation:** Redirect to `/admin/dashboard` upon success.
- **Logout:** `/api/auth/logout` endpoint to clear sessions.

### Credential Lifecycle
- **Bootstrap:** A script to create the initial admin account (pre-requisite for first login).
- **Rotation:** Admin-only endpoint to change passwords.
- **Reset:** A secure flow for password resets that does not depend on email (e.g., via CLI or secure token).

### Security
- **Rate Limiting:** Prevent automated login attempts.
- **Brute-force Protection:** Temporary account lockout after repeated failures.
- **CSRF Protection:** Required for all POST/PATCH/DELETE admin actions.
- **Storage:** Secrets handled via `.env` or secure server-side JSON store.

## Implementation Plan

### Architectural Addition
- **Auth Module:** `src/lib/auth/` containing model, service, and controller.
- **Session Store:** JSON-based session tracking in `.data/sessions.json`.
- **Admin Store:** JSON-based admin record in `.data/admins.json`.

### Component Changes
- **API Routes:** New `/api/auth/` routes for login, logout, and rotation.
- **Pages:** `/admin/login.astro` and `/admin/dashboard.astro`.
- **Middleware:** Astro middleware to protect `/admin/*` routes.

### Configuration
- **Auth Secret:** Addition of `AUTH_SECRET` to `.env` for signing session tokens.
- **Hashing Config:** scrypt parameters defined in constants.

## Verification Results
- [x] Bootstrap script creates admin (`scripts/bootstrap-admin.ts`).
- [x] Login verifies credentials (`/admin/login`).
- [x] Unauthorized access to `/admin/dashboard` is blocked (via `requireAdmin`).
- [x] Rate limiting kicks in after failed attempts (IP-based and account-based lockout).
- [x] Logout invalidates the session (`/api/auth/logout`).
- [x] CSRF protection verified for mutating actions.
- [x] Password rotation and out-of-band reset implemented.
