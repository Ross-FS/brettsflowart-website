import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: 'https://brettsflowart.au',
  output: 'static',

  build: {
    format: 'directory',
  },

  vite: {
    plugins: [tailwindcss()],
  },

  adapter: cloudflare(),
});