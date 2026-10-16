import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// Stamped when the config loads, so "last updated" reports the deploy date.
const buildDate = new Date().toISOString().slice(0, 10);

// Docs markdown: links to other sites open in a new tab, as they do elsewhere on
// the site (LinkRow). Relative links, in-page anchors and links back to
// developers.quip.network stay in the same tab.
function rehypeExternalLinks() {
  const isExternal = (href) => {
    try {
      const url = new URL(href);
      return /^https?:$/.test(url.protocol) && url.hostname !== 'developers.quip.network';
    } catch {
      return false;
    }
  };
  const walk = (node) => {
    if (node.type === 'element' && node.tagName === 'a' && node.properties?.target == null && isExternal(String(node.properties?.href ?? ''))) {
      node.properties.target = '_blank';
      node.properties.rel = ['noopener', 'noreferrer'];
    }
    node.children?.forEach(walk);
  };
  return walk;
}

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
  integrations: [react(), sitemap()],
  markdown: { rehypePlugins: [rehypeExternalLinks] },
  // Static: every page prerenders and the only dynamic data (chain state) is
  // fetched client side, so the build is a plain folder of files.
  output: 'static',
  // The 19 docs URLs we inherit from GitBook carry no trailing slash, and the
  // canonical tag, the sitemap entry and the served URL have to be the same
  // string or we are publishing a canonical that points at a redirect. Astro's
  // default directory format emits docs/x/index.html, which Netlify's
  // pretty_urls then 301s /docs/x -> /docs/x/ — that turns every legacy
  // redirect into two hops and 404s the "append .md to the URL" workflow the
  // docs themselves document. File format emits docs/x.html, served at
  // /docs/x with no redirect.
  trailingSlash: 'never',
  build: { format: 'file' },
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
