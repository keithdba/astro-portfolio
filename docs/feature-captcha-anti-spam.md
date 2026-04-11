# Feature Enhancement: CAPTCHA and Anti-Spam Protection

**Date:** 2026-04-10
**Author:** Antigravity Feature Enhancement Agent
**Workspace:** astro-portfolio

## Overview
Implement robust anti-spam measures for the "Get in Touch" form on MacDaly.com to prevent bot submissions and scripts from flooding the local messaging inbox. This involves integrating Cloudflare Turnstile, implementing a honeypot, and enforcing server-side rate limiting and validation.

## Scope & Requirements
- **Cloudflare Turnstile Integration**: Prefer Turnstile for privacy and UX. Add widget to frontend, validate server-side.
- **Honeypot Field**: Add a hidden field to catch basic bots.
- **Rate Limiting**: Implementation of IP-based throttling for message submissions.
- **Server-side Validation**: Strict validation of name, email, and message body.
- **Security**: Secret keys in environment variables, no exposure in client bundles, generic error messages.

## Implementation Details
- **Architectural Addition:**
    - `captcha.middleware.ts`: Validates Turnstile tokens.
    - `honeypot.middleware.ts`: Checks for honeypot field presence.
    - `rateLimit.middleware.ts`: Enforces submission frequency limits.
- **Component Changes:**
    - `Layout.astro`: Updated to include the Turnstile widget and honeypot field in the contact modal.
    - `messaging.controller.ts`: Refactored to include middleware validation logic.
- **Configuration:**
    - `TURNSTILE_SECRET_KEY`: Private key for server-side validation.
    - `TURNSTILE_SITE_KEY`: Public key for the frontend widget.
    - `RATE_LIMIT_MESSAGING_MAX/WINDOW/LOCKOUT`: Tunable parameters for the rate limit service.

## Verification Results
- [ ] Turnstile widget renders in contact modal.
- [ ] Submission with empty Turnstile token fails.
- [ ] Submission with honeypot field filled fails (tricks bot).
- [ ] Exceeding rate limit triggers 429 response.
- [ ] Successful submission persists message to local inbox.
