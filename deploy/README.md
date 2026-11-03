# Running developers.quip.network

One Docker image: a Next.js standalone server on port 3000. It keeps no state and needs
no database or disk, so every replica is identical and a rollback is a tag change.

## What the host provides

- **A way to run a container.** 1 vCPU and 1 GB of memory is plenty. A second replica is
  optional. The root filesystem can be read-only if `/tmp` and `/app/.next/cache` are tmpfs:

      docker run -d --read-only --tmpfs /tmp --tmpfs /app/.next/cache -p 3000:3000 \
        registry.gitlab.com/quip.network/developers.quip.network:main

- **A reverse proxy** (Caddy, Traefik or nginx) with TLS, HTTP/2 and gzip or brotli. It must:
  - forward `Host`, `X-Forwarded-For` and `X-Forwarded-Proto`;
  - forward `Accept`, which serves Markdown to AI tools at the same URL;
  - leave `/mcp` unbuffered and not cache it (the app sends `no-store`);
  - not cache HTML. The app sets `Cache-Control` itself: `/_next/static/*` and `/fonts/*`
    are immutable, and everything else revalidates.

- **Two hostnames.** Staging (suggested `developers-staging.quip.network`), and production,
  `developers.quip.network`, which moves off Netlify at cutover.

## Runtime settings

| Variable | Where | Meaning |
| --- | --- | --- |
| `PORT` | optional | Listening port, default 3000 |
| `ROBOTS_NOINDEX=1` | staging only | Adds `X-Robots-Tag: noindex` to every response |

Everything else is fixed at build time. Canonical URLs always name production, on staging
too. The Umami values are public and are set as CI variables `NEXT_PUBLIC_UMAMI_SRC` and
`NEXT_PUBLIC_UMAMI_WEBSITE_ID`. Analytics only report from `developers.quip.network`, so
staging sends nothing. Leave the id empty to ship without analytics.

## Deploy path

CI builds and pushes; it never deploys (see the top of `.gitlab-ci.yml`).

| Trigger | Image tags pushed | Runs on |
| --- | --- | --- |
| Push to `fumadocs` | `:fumadocs`, `:<short sha>` | Staging |
| Push to `main` | `:main`, `:<short sha>` | Production |

The host pulls those tags on its own, with Watchtower, Nomad, Argo or a cron job. That must
work unattended, because the data-refresh bot commits to `main` daily and each commit needs
to reach production.

**The XQuad release hook has to move.** xquad's CI fires a Netlify build hook when it tags a
release. Replace it with a GitLab pipeline trigger on this project (Settings, CI/CD, Pipeline
trigger tokens) so a release rebuilds the image with the new book.

## Health and monitoring

- `GET /api/health` returns 200 and `{"ok":true,"pages":N}`. The image has a Docker
  `HEALTHCHECK` on it.
- Put uptime checks on `/api/health` and `/docs/llms.txt`.
- Logs go to stdout.

## Rollback

Keep the last 10 image tags and redeploy an older `:<short sha>`. For two weeks after the
cutover, keep the Netlify site running, so going back is also a DNS change. Lower the DNS
TTL on `developers.quip.network` to 300 a few days before.

## Cutover checklist

1. Staging runs `:fumadocs`. `node scripts/check-parity.mjs https://<staging host>` shows
   only the differences the script lists as intended.
2. Turn off Netlify's automatic builds, so the merge cannot publish a failed or stale site.
3. Merge `fumadocs` to `main`, wait for `:main`, and confirm it on the production container
   by its IP or a temporary hostname.
4. Switch DNS. Run `node scripts/check-parity.mjs https://developers.quip.network <netlify URL>`.
5. Submit `/sitemap.xml` in Search Console.
6. After two quiet weeks, retire the Netlify site, `netlify.toml` and `netlify-cli`.

## Optional: Umami

To self-host analytics, run Umami (one container plus Postgres) at something like
`analytics.quip.network` and set `NEXT_PUBLIC_UMAMI_SRC=https://analytics.quip.network/script.js`.
Otherwise the default is Umami Cloud's script URL.
