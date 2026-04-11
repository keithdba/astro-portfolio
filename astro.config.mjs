// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  site: 'https://macdaly.com',
  // In Astro 6+, output:'static' is the default and supports per-route SSR
  // via `export const prerender = false` in individual files.
  // The node adapter is required for the server-rendered API routes.
  output: 'static',
  adapter: node({
    mode: 'standalone',
  }),
});
