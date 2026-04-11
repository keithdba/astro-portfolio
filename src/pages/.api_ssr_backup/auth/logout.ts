import type { APIRoute } from 'astro';
import { handleLogout } from '../../../lib/auth/auth.controller';

export const prerender = true;

export const POST: APIRoute = async ({ locals }) => {
  return handleLogout(locals);
};
