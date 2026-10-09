import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import brand from '../../brands/vite-plugin-brand.mjs'

// https://vite.dev/config/
// BRAND=<folder> picks the brand pack under brands/ (default: poolos).
export default defineConfig({
  plugins: [brand({ emit: true }), tailwindcss(), svelte()],
})
