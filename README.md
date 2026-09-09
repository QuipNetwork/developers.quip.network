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
| Network scale (miners, wins, topology) | **Real, but measured on the RETIRED chain.** A 2026-08-26 run of the dashboard indexer, taken before the network reset — the figures do not describe aglais. See `src/data/network-snapshot.ts`. |
| Node map positions | **Dummy.** Real positions need the dashboard indexer's geo-IP over each descriptor's `publicHost`, behind an agreed `quip.network_summary.v1` summary contract that does not exist yet. See `src/data/sample-nodes.ts`. |

## Notes for whoever picks this up

- **Two data files, one boundary.** Chain facts — RPC, explorer, faucet, chain
  spec, genesis — live in `src/data/testnet.ts`. Everything else outbound (docs,
  repos, socials) lives in `src/data/links.ts`. Repointing to a new network is
  the first file only. The docs are generated into this repo and `DOCS_BASE`
  points at their canonical `/docs` home.
- **Docs sync manually from the private GitBook source.** Keep that repo as a
  sibling checkout (or any local checkout) and run
  `npm run docs:sync -- /path/to/gitbook`. Commit the regenerated
  `src/content/docs/` and `public/docs/` trees. The script reads navigation and
  public routes from `SUMMARY.md`, normalizes GitBook-only markup, rewrites
  internal links, copies assets, and builds `llms.txt`, `llms-full.txt`, and
  per-page Markdown mirrors. Production does not clone the source repo.
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
- The network-scale block still reports the retired chain. Either re-measure
  against aglais or drop the block.
- The node map is fabricated, pending the summary contract described above.
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
