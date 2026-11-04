# Running developers.quip.network

The site deploys on **Netlify**, from GitLab, like every other Quip site. Netlify builds each
commit to `main` for production and each merge request as a deploy preview. CI never deploys.

## How it runs on Netlify

`netlify.toml` sets the build (`npm run build`, Node 22). Netlify detects Next.js and uses its
Next.js runtime:

- Pages are prerendered and served from Netlify's CDN.
- The server routes run as Netlify Functions: search (`/api/search`), the docs MCP server
  (`/mcp`) and `/api/health`.
- `src/proxy.ts` runs as an edge function. It handles trailing slashes, the XQuad book's old URLs,
  and Markdown for AI tools that send `Accept: text/markdown`.
- Headers and redirects live in `next.config.mjs`, not in `netlify.toml`.

The build needs network access to gitlab.com (the XQuad book is fetched at its latest release
tag) and to npm.

## Settings in the Netlify UI

- **Environment variables (optional):** `NEXT_PUBLIC_UMAMI_WEBSITE_ID`, and
  `NEXT_PUBLIC_UMAMI_SRC` if Umami is self-hosted. They are public values. Without an id the
  site ships without analytics; with one, Umami only reports from `developers.quip.network`.
- **Build hook for XQuad:** xquad's CI already calls a Netlify build hook when it tags a release,
  so the book stays current. Nothing changes here.

## Before merging to main

1. Open the merge request and wait for its Netlify deploy preview.
2. Run the checks against the preview URL:

       node scripts/sync-docs.mjs
       node scripts/check-parity.mjs <preview URL>
       node scripts/check-xquad-urls.mjs <preview URL>
       npm run check:diagrams -- --base <preview URL>

   `check-parity` compares every published URL with production. Deploy previews add
   `X-Robots-Tag: noindex`, so expect that one difference on most URLs; anything else is real.
3. Test the MCP server on the preview: `claude mcp add --transport http quip-docs <preview URL>/mcp`.
4. Merge. Netlify publishes. Submit `/sitemap.xml` in Search Console.

Rollback is Netlify's "Publish deploy" on the previous production deploy.

## Fallback: self-hosting

The repo also builds a Docker image that runs the same site anywhere, as a Next.js standalone
server on port 3000 (`Dockerfile`). It is not used in production. To try it:

    docker build -t devportal . && docker run --rm -p 3000:3000 devportal

`/api/health` returns 200 when the app is up. `ROBOTS_NOINDEX=1` adds `X-Robots-Tag: noindex` to
every response, for a non-production copy.
