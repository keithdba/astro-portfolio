import type { APIRoute } from 'astro';
import { handleRotatePassword } from '../../../lib/auth/auth.controller';

export const prerender = true;

export const POST: APIRoute = async ({ request, locals }) => {
  return handleRotatePassword(request, locals);
};
