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
    are immutable, and everything else revalidates. A CDN in front of the proxy, such as
    Cloudflare, can follow those headers as they are.

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

CI builds and pushes; it never deploys (see the top of `.gitlab-ci.yml`). Each push to
`fumadocs` or `main` runs three jobs:

1. `build-image` builds with kaniko and pushes `:<short sha>-<pipeline id>`, a tag unique to
   that build, so a rollback target is never overwritten.
2. `smoke-image` starts that image and runs `scripts/smoke.mjs` against it.
3. `promote-image` moves the branch tag to it, only if the smoke test passed.

| Branch | Tag the host follows | Runs on |
| --- | --- | --- |
| `fumadocs` | `:fumadocs` | Staging |
| `main` | `:main` | Production |

The `:main` tag needs a protection rule in the project's container registry settings, so a
branch pipeline cannot publish to production. Check it still lets the people who merge to
`main` run `promote-image`.

The registry is set to private and the host needs a deploy token with `read_registry`. The
Dinamo fonts are also in `public/fonts`, which is public in this repo, so that question
sits with the licence rather than the registry.

The host follows those tags on its own. That must work unattended, because the
data-refresh bot commits to `main` daily and each commit needs to reach production.

**The XQuad release hook moves at cutover.** xquad's `docs:publish` job posts to a Netlify
build hook. It needs to start a pipeline on `main` of this project instead, through a
pipeline trigger token (Settings, CI/CD). The pipeline id it sends today is not needed: with
none, `scripts/sync-xquad.mjs` publishes the newest release whose book built, which is that
release. The change is in the xquad repo, so its maintainers review it.

## Health and monitoring

- `GET /api/health` returns 200 and `{"ok":true,"pages":N,"commit":"<sha>"}`. The image has
  a Docker `HEALTHCHECK` on it. Compare `commit` with the head of `main` to catch production
  no longer following it.
- Put uptime checks on `/api/health` and `/docs/llms.txt`.
- Logs go to stdout.

## Rollback

Keep the last 10 image tags and redeploy an older `:<short sha>`. For two weeks after the
cutover, keep the Netlify site running, so going back is also a DNS change. Lower the DNS
TTL on `developers.quip.network` to 300 a few days before.

## Cutover checklist

1. Staging runs `:fumadocs`. `node scripts/check-parity.mjs https://<staging host>` shows
   only the differences the script lists as intended, and `node scripts/smoke.mjs
   https://<staging host>` passes.
2. Stop auto publishing on Netlify before the merge. The Next.js build has never passed
   there, and this keeps the current site live on Netlify as the fallback. That fallback is
   the old site: it stops getting updates once publishing is stopped.
3. Merge `fumadocs` to `main`, wait for `:main`, and confirm it on the production container
   by its IP or a temporary hostname.
4. Switch DNS. Run `node scripts/check-parity.mjs https://developers.quip.network <netlify URL>`
   and `node scripts/smoke.mjs https://developers.quip.network`.
5. Swap the XQuad release hook.
6. Submit `/sitemap.xml` in Search Console.
7. After two quiet weeks, retire the Netlify site, `netlify.toml` and `netlify-cli`, and drop
   `fumadocs` from the image rules in `.gitlab-ci.yml`.

## Optional: Umami

To self-host analytics, run Umami (one container plus Postgres) at something like
`analytics.quip.network` and set `NEXT_PUBLIC_UMAMI_SRC=https://analytics.quip.network/script.js`.
Otherwise the default is Umami Cloud's script URL.
