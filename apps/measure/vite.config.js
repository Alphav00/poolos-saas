import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// Measure is served by the PoolOS Worker under /measure, behind the same
// Cloudflare Access sign-in, and talks to /api/measure. The build lands inside
// the web app's output so one assets directory serves both (build web first).
export default defineConfig({
  base: '/measure/',
  plugins: [svelte()],
  server: {
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
  build: {
    outDir: '../web/dist/measure',
    emptyOutDir: true,
  },
});
