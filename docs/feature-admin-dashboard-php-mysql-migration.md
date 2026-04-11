# Feature Enhancement: Admin Dashboard — PHP/MySQL Backend Migration

**Date:** 2026-04-11
**Author:** Antigravity Feature Enhancement Agent (astro-portfolio)
**Workspace:** astro-portfolio
**Status:** Planned
**Supersedes:** `feature-admin-dashboard.md`, `feature-admin-session-lifecycle.md`, `feature-local-messaging-inbox.md`

---

## Overview

This feature enhancement documents the architectural transition of the MacDaly.com Admin Dashboard from a Node.js/TypeScript SSR backend to a **PHP + MySQL** backend hosted on GoDaddy shared hosting.

The change is driven by a production stability incident on 2026-04-11. The introduction of the `@astrojs/node` adapter redirected static build output into nested `dist/client/` and `dist/server/` directories, causing Apache to return `HTTP 403 Forbidden` errors site-wide — taking macdaly.com fully offline.

The resolution is to decouple the Admin backend from Astro's SSR runtime entirely and implement it using the hosting environment's **native, stable stack**: PHP 8.x + MySQL, managed via GoDaddy cPanel.

---

## Problem Statement

| Dimension | Node.js SSR (Previous) | PHP/MySQL (Target) |
|---|---|---|
| **Hosting Compatibility** | ❌ Requires Passenger (unstable on GoDaddy) | ✅ Native Apache + PHP |
| **Build Output Stability** | ❌ Breaks `dist/` layout when adapter is added | ✅ Static flat `dist/` always preserved |
| **Data Persistence** | ⚠️ JSON flat files (race conditions, no querying) | ✅ Relational MySQL DB (ACID, indexed) |
| **Session Management** | ❌ Astro `locals.session` (requires Node runtime) | ✅ PHP `session_start()` (native, stable) |
| **Deployment Risk** | ❌ High (adapter config affects entire build) | ✅ Low (PHP scripts deployed alongside static assets) |

---

## Scope & Requirements

### 1. Database Layer — MySQL
A MySQL database, provisioned via GoDaddy cPanel's MySQL Databases, will serve as the single source of truth for all admin-managed data.

**Tables:**
- `admins` — Admin user accounts with `password_hash` (using `password_hash()` / `password_verify()`).
- `messages` — Contact form submissions with `status` (`unread` / `read` / `archived` / `deleted`).
- `error_logs` — Application-level error log entries with `level`, `message`, `context` (JSON), and `timestamp`.

**Connection:**
- A shared `db.php` utility in `public/api/` handles the PDO connection using credentials from `macdaly.env` (already used by `contact.php`).

### 2. PHP API Layer — `public/api/`
Lightweight PHP scripts replace all TypeScript controllers. Each script:
- Validates the PHP session (`session_start()`).
- Enforces admin authentication before all protected operations.
- Returns JSON responses with appropriate HTTP status codes.
- Uses **PDO with prepared statements** to prevent SQL injection.

**Endpoints:**
| File | Method(s) | Purpose |
|---|---|---|
| `public/api/auth.php` | `POST`, `DELETE` | Login / Logout |
| `public/api/messages.php` | `GET`, `PATCH`, `DELETE` | Inbox CRUD operations |
| `public/api/logs.php` | `GET` | View and export error logs |
| `public/api/contact-capture.php` | `POST` | Extend `contact.php` to persist submissions to DB |

### 3. Admin Frontend — Static Astro Pages
The Astro admin pages (dashboard, logs, export) remain as **static HTML/JS** pages deployed to `public_html/`. They no longer require an Astro server or middleware. All dynamic data is fetched client-side via `fetch()` calls to the PHP API.

**Updated Pages:**
- `src/pages/admin/dashboard.astro` — Stripped of `requireAdmin` server logic. Auth enforcement delegated to a client-side guard that checks `GET /api/auth.php` session status.
- `src/pages/admin/login.astro` — Submits credentials to `POST /api/auth.php`.
- `src/pages/admin/logs.astro` — Fetches from `GET /api/logs.php`.

### 4. Session & Security
- **PHP Sessions**: Standard `PHPSESSID` cookie managed by PHP's session module.
- **Password Hashing**: `password_hash($password, PASSWORD_BCRYPT)` with `password_verify()` for login.
- **CSRF Protection**: A CSRF token will be embedded in `admin/login.astro` and validated in `auth.php`.
- **Input Sanitization**: All user input validated with PDO prepared statements; no raw interpolation.
- **Rate Limiting**: Implemented via request logging to MySQL (`failed_attempts` column on `admins` table, with lockout logic in PHP).

### 5. Contact Form Integration
The existing `contact.php` will be extended (or a sibling `contact-capture.php` created) to write form submissions simultaneously to:
1. The MySQL `messages` table (for Admin Dashboard visibility).
2. The existing email relay (for immediate notification).

---

## Architectural Diagram

```
Browser (Static Astro HTML/JS)
        │
        ├──► /contact.php          ──► MySQL (messages table) + Email Relay
        │
        ├──► /api/auth.php         ──► MySQL (admins table) + PHP Session
        ├──► /api/messages.php     ──► MySQL (messages table)     [Admin Auth Required]
        └──► /api/logs.php         ──► MySQL (error_logs table)   [Admin Auth Required]
```

---

## Implementation Plan

### Phase 1 — Database Provisioning
1. Create MySQL DB + user via GoDaddy cPanel.
2. Run schema migration SQL (tables: `admins`, `messages`, `error_logs`).
3. Bootstrap first admin user (manual SQL `INSERT` with `password_hash()`).
4. Add DB credentials to `macdaly.env`.

### Phase 2 — PHP API Development
1. Create `public/api/db.php` — PDO connection utility.
2. Create `public/api/auth.php` — Login, logout, session check.
3. Create `public/api/messages.php` — Inbox CRUD.
4. Create `public/api/logs.php` — Error log viewer.
5. Extend `public/contact.php` — Write to `messages` table on submission.

### Phase 3 — Astro Frontend Adaptation
1. Remove `requireAdmin` (server-side) guards from all admin Astro pages.
2. Add client-side session check (`fetch('/api/auth.php')`) with redirect-to-login fallback.
3. Update all `fetch()` calls to target `/api/*.php` endpoints.
4. Confirm `prerender = true` (default) on all admin pages.

### Phase 4 — SSR Backup Restoration (Optional)
The SSR pages and middleware are currently renamed to `.bak` directories. These represent a complete feature-complete implementation that can be re-activated if a future hosting upgrade supports stable Node.js (e.g., VPS, Railway, Render).

- `src/pages/.admin_ssr_backup/` → Restore to `src/pages/admin/`
- `src/pages/.api_ssr_backup/` → Restore to `src/pages/api/`
- `src/.middleware.bak/` → Restore to `src/middleware/`
- `src/.middleware.ts.bak` → Restore to `src/middleware.ts`

---

## Verification Plan

- [ ] `macdaly.com` returns HTTP 200 after deployment.
- [ ] Submitting the contact form writes a record to `messages` table.
- [ ] Login page authenticates against `admins` table via PHP session.
- [ ] Dashboard lists messages fetched from MySQL via `/api/messages.php`.
- [ ] Unauthorized access to `/api/messages.php` returns HTTP 401.
- [ ] Brute-force lockout triggers after 5 failed login attempts.
- [ ] All existing Vitest regression tests continue to pass.

---

## References

- Incident Report: `docs/maintenance-2026-04-11.md`
- Previous Implementation: `feature-admin-dashboard.md`
- Session Security Design: `feature-admin-session-lifecycle.md`
- Messaging Architecture: `feature-local-messaging-inbox.md`
- GoDaddy Deployment Guide: `DEPLOY.md`
