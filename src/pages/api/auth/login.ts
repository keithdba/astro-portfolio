import type { APIRoute } from 'astro';
import { handleLogin } from '../../../lib/auth/auth.controller';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  return handleLogin(request);
};
