import { sequence } from 'astro:middleware';
import { rateLimitMiddleware } from './middleware/rateLimit';
import { honeypotMiddleware } from './middleware/honeypot';
import { captchaMiddleware } from './middleware/captcha';
import { sessionMiddleware } from './middleware/session';
import { csrfMiddleware } from './middleware/csrf';
import { auditMiddleware } from './middleware/audit';

import { errorMiddleware } from './middleware/error';

/**
 * Global middleware chain.
 * errorMiddleware wraps everything to catch and log failures.
 * rateLimitMiddleware runs first to protect against abuse.
 * honeypotMiddleware and captchaMiddleware provide anti-spam for public forms.
 */
export const onRequest = sequence(
  errorMiddleware,
  rateLimitMiddleware,
  honeypotMiddleware,
  captchaMiddleware,
  sessionMiddleware,
  csrfMiddleware,
  auditMiddleware
);
