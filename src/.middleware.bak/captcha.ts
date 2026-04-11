/**
 * captcha.middleware.ts
 *
 * Validates Cloudflare Turnstile token for public form submissions.
 */

import { defineMiddleware } from 'astro:middleware';
import { verifyCaptcha } from '../lib/security/captcha.service';

export const captchaMiddleware = defineMiddleware(async (context, next) => {
  const { request, url } = context;

  // Only apply to public message submission
  if (url.pathname === '/api/messages' && request.method === 'POST') {
    try {
      const clone = request.clone();
      const body = await clone.json();
      const token = body['cf-turnstile-response'] || body.captchaToken;

      const { success } = await verifyCaptcha(token);

      if (!success) {
        return new Response(
          JSON.stringify({ error: 'Verification failed', message: 'Something went wrong. Please try again.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } catch (e) {
      console.error('[Anti-Spam] CAPTCHA middleware error:', e);
      return new Response(
        JSON.stringify({ error: 'Verification failed', message: 'Something went wrong. Please try again.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  return next();
});

