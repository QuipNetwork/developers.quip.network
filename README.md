# developers.quip.network

The developer portal for Quip Network. A single dense page that routes
developers, node operators and evaluators to the right destination, plus live
testnet state and machine-readable docs for coding agents.

Live at <https://developers.quip.network>, deployed by Netlify from `main`.

## Run it

    npm install
    npm run dev        # http://localhost:4321
    npm run build      # static output in dist/
    npm run check      # astro check

Node 22 or newer.

## What is real and what is not

The page mixes three kinds of data, and each is labelled where it renders:

| Block | Provenance |
| --- | --- |
| Live status (chain, blocks, finalized, peers, version) | **Real, live.** Read in the browser from the public bootnode RPC every 12s, genesis-checked before anything renders. No backend. |
| Network scale (miners, wins, topology) | **Real, a dated snapshot.** Read from chain storage and refreshed daily by CI. See `src/data/network-snapshot.ts`. |
| Node map positions | **Real, a dated snapshot, city-granular.** Each operator's published `public_host` geo-IP'd to its city centroid and rounded to 2dp, so nodes in one city share a point. Refreshed daily by CI. See `src/data/network-nodes.ts`. |

Both snapshots render their chain, date and block height beside the figures. That
is not decoration — the map and the scale block are measurements with a timestamp,
not a live readout, and the only thing separating "dated fact" from "unmaintained
page" is how recently the refresh ran.

## The daily refresh

`src/data/network-snapshot.ts` and `src/data/network-nodes.ts` are **generated**.
Do not hand-edit them; the scheduled `refresh-data` job overwrites both.

    node scripts/recount-nodes.mjs              # rewrites network-nodes.ts
    node scripts/recount-nodes.mjs --dry-run    # prints, changes nothing
    node scripts/recount-network.mjs            # prints the figures
    node scripts/recount-network.mjs --write    # rewrites network-snapshot.ts
    node scripts/recount-network.mjs --check    # fails if what is published has drifted

Both read all three bootnodes from `src/data/testnet.ts`, starting at a random one
and failing over to the next, and both re-pin their block on failover so the
figures cannot straddle two nodes at different heights. `QUIP_RPC` overrides with a
single endpoint and disables failover.

**This used to be a human chore, and the human was doing real work.** They were the
one who would notice that a third of the dots had vanished because the geo service
had started throttling, and not commit. Nobody is watching a scheduled job, so
those judgements are now checks in `scripts/recount-nodes.mjs`, and every one of
them refuses to write rather than writing a thinner map:

- any geo lookup that fails after three retries fails the run — a lookup that
  *answers* "no city for this address" is a different thing and is a legitimate skip
- more than 15% of routable hosts unplaceable fails the run (3.6% on a healthy run)
- a drop of more than `max(5, 25%)` against the committed map fails the run
- an empty map fails the run
- a bootnode serving the wrong genesis fails the run, without trying the others

A failed run leaves yesterday's data committed and turns the pipeline red.
Yesterday's map is a known quantity; a map written from a run nobody trusts is not.

`snapshot-drift` runs `--check` before the refresh, and its age bound is two days.
With a working refresh the data is never more than a day old, so that job going red
now means **the refresh itself has stopped**, which is the only thing left worth
alerting on.

Only operators that have proved work within `ACTIVE_WITHIN_BLOCKS` (~7 days) are
drawn. A descriptor outlives the machine it describes, so without that filter a
daily refresh would only ever accumulate dots. The window is deliberately loose —
see the comment on the constant before tightening it.

### The geo cache is load-bearing

`ipwho.is` bills by **daily quota**, not requests per second. When it refuses it
answers `429` with `retry-after: 86232` — just under 24 hours — so no amount of
backing off inside a run gets past it. The free tier is ~10,000 lookups a month.

A cold run resolves ~170 unique addresses. At ~40 new nodes a day that is ~450 a
day within a week, or ~13,500 a month: over the allowance, at which point every
run fails the geo guard and the map stops updating. So `.geo-cache.json` is not a
speed-up — without it this job breaks within about a week of being switched on.
Cached, a run only pays for addresses it has never seen, which is flat as the
network grows.

**Never commit that file.** It maps operator IP to city, and operator addresses
are precisely what the city-granularity rule exists to avoid publishing. It is
gitignored, and CI carries it between runs as a job cache, which lives on the
runner rather than in the repo. A lost cache costs one expensive run; a committed
one would be a disclosure. `QUIP_GEO_CACHE` points it elsewhere for testing.

If the quota guard starts firing, the question is not "is the service down" but
"why is a run looking up so many addresses fresh" — usually a cache that did not
survive between runs.

Publishing needs `REFRESH_TOKEN`, a masked project access token with Maintainer
role and `write_repository`, because `main` restricts pushes to Maintainers.

## Notes for whoever picks this up

- **Two data files, one boundary.** Chain facts — RPC, explorer, faucet, chain
  spec, genesis — live in `src/data/testnet.ts`. Everything else outbound (docs,
  repos, socials) lives in `src/data/links.ts`. Repointing to a new network is
  the first file only. The docs are generated into this repo and `DOCS_BASE`
  points at their canonical `/docs` home.
- **Docs live in `docs/`.** It is the merged GitBook source of truth, including
  `SUMMARY.md`, `.gitbook.yaml`, the 19 pages, and their assets. `docs:sync` is
  run automatically before development, checks, and builds; run
  `npm run docs:sync` directly when inspecting the generated trees. The script
  reads navigation and public routes from `SUMMARY.md`, normalizes GitBook-only
  markup, rewrites internal links, copies assets, and builds `llms.txt`,
  `llms-full.txt`, and per-page Markdown mirrors.
- **`npm run build` runs a guard first.** `scripts/check-endpoints.mjs` fails the
  build if a retired endpoint reappears anywhere in `src/`, or if the aglais
  endpoints and genesis hash go missing. It is offline by design and never
  touches the network. Read the comment before adding a rule — banning `20049`
  (the RPC port) or the bare `nodes.quip.network` (a real repo URL) would brick
  every future deploy, rollbacks included.
- **The public RPC has not been blessed.** All three bootnodes serve open CORS
  and work from the browser, but the protocol team has not confirmed them as
  supported public endpoints. Tracked on QUI-1293.
- **`src/vendor/quip-design/` is copied from the monorepo**, not imported. See
  the README in that folder for the sync obligation.
- **Static output.** Nothing renders per request, so the build is a plain folder
  and needs no serverless function.
- **Sharp corners everywhere.** The design system's marketing tier sets radius 0
  as the default; do not reintroduce rounded corners.

## Known gaps

- No analytics. Copy-button clicks and outbound link clicks are the events worth
  instrumenting first.
- The 7-day activity window is a placeholder, not a measurement. It was set while
  the chain was ~11.5 days old, which is too young to tell "the pallet never drops
  a descriptor" from "nothing has been gone long enough to show." Revisit once
  there is more history; the distribution is sparse between 3 and 7 days.
- npm `latest` for `@quip.network/ethereum-sdk` resolves to a stale 0.1.7, which
  is why the quickstart pins `@beta`. Unpin once `latest` is current.
- Three `DOCS.*` paths under `interlock/` now 307 to `quip-interlock-protocol/`.
  They resolve, so links work, but the constants ride a redirect.

## Link health

`scripts/check-links.mjs` probes every URL in the source on a daily GitLab
schedule (`.gitlab-ci.yml`). It gates nothing — a third-party outage must not
block shipping a copy fix — and it fails closed: a timeout, an unreachable host,
too few URLs discovered, or a missing endpoint class all exit non-zero.

Run it locally with `node scripts/check-links.mjs`. It needs no dependencies.

Note the deliberate asymmetry with the refresh: this probe gates nothing, while
`refresh-data` fails closed and publishes nothing. Both are correct. A dead
third-party link must not stop you shipping a copy fix; a geo service having a bad
afternoon must not put a wrong map in front of people.
