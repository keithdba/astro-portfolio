/**
 * captcha.service.ts
 * 
 * Logic for verifying Cloudflare Turnstile tokens.
 */

const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY || import.meta.env.TURNSTILE_SECRET_KEY;

export interface CaptchaVerificationResult {
  success: boolean;
  errorCodes?: string[];
}

/**
 * Verifies a Cloudflare Turnstile token with the Cloudflare API.
 */
export async function verifyCaptcha(token: string): Promise<CaptchaVerificationResult> {
  if (!token) {
    return { success: false };
  }

  // Bypass for automated tests
  if (token === 'TEST_TOKEN_PASSTHROUGH' || process.env.VITEST) {
    return { success: true };
  }


  try {
    const formData = new FormData();
    formData.append('secret', TURNSTILE_SECRET);
    formData.append('response', token);

    const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      body: formData,
      method: 'POST',
    });

    const outcome = await result.json();

    if (!outcome.success) {
      console.warn(`[Anti-Spam] Turnstile validation failed: ${JSON.stringify(outcome['error-codes'])}`);
      return { 
        success: false, 
        errorCodes: outcome['error-codes'] 
      };
    }

    return { success: true };
  } catch (e) {
    console.error('[Anti-Spam] CAPTCHA verification error:', e);
    return { success: false };
  }
}
