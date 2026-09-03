# developers.quip.network

The developer portal for Quip Network. A single dense page that routes
developers, node operators and evaluators to the right destination, plus live
testnet state and machine-readable docs for coding agents.

Status: **preview, not launched.** Nothing here is served on developers.quip.network yet.

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
| Live status (chain, blocks, finalized, peers, version) | **Real, live.** Read in the browser from the public bootnode RPC every 12s. No backend. |
| Network scale (miners, wins, topology) | **Real, dated snapshot.** Measured from a local run of the dashboard indexer on 2026-08-26. See `src/data/network-snapshot.ts`. |
| Node map positions | **Dummy.** No miner publishes a locatable host, so no real coordinates exist. See `src/data/sample-nodes.ts`. |

## Notes for whoever picks this up

- **All outbound URLs live in `src/data/links.ts`.** `DOCS_BASE` is the docs
  cutover switch: it points at `quip.gitbook.io/docs` because
  `docs.quip.network` currently 404s `/llms.txt` into an unrelated mdBook.
- **The public RPC is undocumented.** `bootnode-1.testnet.quip.network:20049`
  serves open CORS and works from the browser, but the protocol team has not
  confirmed it as a supported public endpoint. Confirm before depending on it.
- **`src/vendor/quip-design/` is copied from the monorepo**, not imported. See
  the README in that folder for the sync obligation.
- **Static output.** Nothing renders per request, so the build is a plain folder
  and needs no serverless function.
- **Sharp corners everywhere.** The design system's marketing tier sets radius 0
  as the default; do not reintroduce rounded corners.

## Known gaps

- No analytics. Copy-button clicks and outbound link clicks are the events worth
  instrumenting first.
- No link-health CI. Every URL in `links.ts` should be probed on a schedule.
- `nodes.quip.network` chain-spec URL has a broken TLS handshake upstream.
- npm `latest` for `@quip.network/ethereum-sdk` resolves to a stale 0.1.7, which
  is why the quickstart pins `@beta`.
