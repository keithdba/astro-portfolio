import { captureError } from '../lib/logging/logs.service';
import type { MiddlewareResponseHandler } from 'astro';

/**
 * Global Error Handler Middleware
 * 
 * Intercepts uncaught errors, logs full details securely,
 * and returns a public-safe response with a correlation ID.
 */
export const errorMiddleware: MiddlewareResponseHandler = async ({ request, locals }, next) => {
  try {
    const response = await next();
    
    // Check for status 500 responses that might not have thrown but are errors
    if (response.status === 500 && !response.headers.get('content-type')?.includes('text/html')) {
       // We might want to handle this specifically if needed, 
       // but usually, a throw is better for middleware capture.
    }
    
    return response;
  } catch (error) {
    console.error('[errorMiddleware] Uncaught error detected:', error);
    
    // Capture full details securely
    const correlationId = await captureError(
      error, 
      request, 
      locals.adminId || undefined
    );

    // Determine if it's an API request or Page request
    const isApi = request.url.includes('/api/') || request.headers.get('accept')?.includes('application/json');

    if (isApi) {
      return new Response(JSON.stringify({
        error: "We're sorry — something went wrong on our end.",
        correlationId
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // For HTML pages, we could redirect to a generic error page, 
    // but a simple Response works for this requirement.
    return new Response(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Something went wrong | MacDaly.com</title>
        <style>
          body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #f8fafc; color: #1e293b; text-align: center; }
          .container { max-width: 500px; padding: 2rem; background: white; border-radius: 1rem; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
          h1 { font-size: 1.5rem; margin-bottom: 1rem; }
          p { color: #64748b; margin-bottom: 2rem; }
          .id { font-family: monospace; background: #f1f5f9; padding: 0.5rem 1rem; border-radius: 0.5rem; font-size: 0.875rem; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>We're sorry — something went wrong on our end.</h1>
          <p>Our team has been notified. If you need to contact support, please provide the following ID:</p>
          <div class="id">${correlationId}</div>
          <div style="margin-top: 2rem;"><a href="/" style="color: #1ea8ec; text-decoration: none; font-weight: 600;">Return Home</a></div>
        </div>
      </body>
      </html>
    `, {
      status: 500,
      headers: { 'Content-Type': 'text/html' }
    });
  }
};
