import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// Stamped when the config loads, so "last updated" reports the deploy date.
const buildDate = new Date().toISOString().slice(0, 10);

export default defineConfig({
  // og:image and canonical are resolved against this, so a deploy preview must
  // override it or every shared card points at production instead of at the
  // preview being reviewed. Netlify cannot expand $DEPLOY_PRIME_URL inside
  // netlify.toml env values, so the fallback chain is resolved here: an explicit
  // PUBLIC_SITE_URL wins, then production is pinned, then any non-production
  // Netlify context uses the URL Netlify assigned that deploy.
  site:
    process.env.PUBLIC_SITE_URL ??
    (process.env.CONTEXT === 'production'
      ? 'https://developers.quip.network'
      : process.env.DEPLOY_PRIME_URL) ??
    'https://developers.quip.network',
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
