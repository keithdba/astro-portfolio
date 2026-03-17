import { getViteConfig } from 'astro/config';

export default getViteConfig({
  test: {
    // Vitest configuration options here.
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx,js,jsx}'],
  },
});
