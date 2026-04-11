/**
 * honeypot.middleware.ts
 *
 * Checks for a hidden 'honeypot' field. If filled, it's likely a bot.
 */

import { defineMiddleware } from 'astro:middleware';

export const honeypotMiddleware = defineMiddleware(async (context, next) => {
  const { request, url } = context;

  // Only apply to message submission endpoint
  if (url.pathname === '/api/messages' && request.method === 'POST') {
    try {
      // Clone the request to read the body without consuming it
      const clone = request.clone();
      const body = await clone.json();

      // 'website' is our common honeypot field name
      if (body.website && body.website.trim() !== '') {
        console.warn(`[Anti-Spam] Honeypot triggered by IP: ${request.headers.get('x-forwarded-for') || 'unknown'}`);
        
        // Return a generic success message to trick the bot
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Message received. Thank you!' 
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } catch (e) {
      // If parsing fails, let the main handler deal with it or ignore
    }
  }

  return next();
});
