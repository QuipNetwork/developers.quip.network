import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// Stamped when the config loads, so "last updated" reports the deploy date.
const buildDate = new Date().toISOString().slice(0, 10);

export default defineConfig({
  // og:image and canonical are resolved against this, so a preview deploy must
  // override it or every shared card points at a domain that is not live yet.
  site: process.env.PUBLIC_SITE_URL ?? 'https://developers.quip.network',
  integrations: [react()],
  // Static: every page prerenders and the only dynamic data (chain state) is
  // fetched client side, so the build is a plain folder of files.
  output: 'static',
  vite: {
    plugins: [tailwindcss()],
    define: {
      'import.meta.env.PUBLIC_BUILD_DATE': JSON.stringify(buildDate),
    },
    resolve: {
      alias: {
        '@app-styles': fileURLToPath(new URL('./src/styles/index.css', import.meta.url)),
        // Design-system files copied from the monorepo. See src/vendor/quip-design/README.md
        '@design': fileURLToPath(new URL('./src/vendor/quip-design', import.meta.url)),
      },
    },
  },
});
