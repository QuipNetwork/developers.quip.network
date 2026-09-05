/*
 * Every fact about the chain the portal talks to, in one place.
 *
 * Mirrored from apps/agls/src/data/testnet.ts, which is the source of truth and
 * already publishes these values on a live public site.
 *
 * Mirrored rather than imported because apps are sibling workspaces, not
 * dependencies of each other. If a third surface needs these values, move the
 * file into packages/shared and have both apps import it from there.
 *
 * Only the publicly-published fields are copied. Contract addresses, signature
 * slot numbers, and QVRF interface signatures are embargoed and belong nowhere
 * on this site.
 *
 * TWO FIELDS ARE DELIBERATELY NOT MIRRORED. Re-check them on every re-copy,
 * because taking them verbatim reintroduces a bug both times:
 *
 *   the explorer's first-EVM-block offset — a six-figure value carried over
 *     from the retired chain. On aglais pallet-revive is in genesis, so EVM
 *     history starts at block 0; the old offset would describe roughly 340 days
 *     of history that does not exist. scripts/check-endpoints.mjs fails the
 *     build if that number reappears.
 *   the subscan substrate path — probed 2026-09-05: /sub, /sub/, /blocks and
 *     /substrate all 404. Only the subscan root is live.
 *
 * Web destinations that are not chain endpoints (docs, repos, socials) live in
 * ./links.ts. Keep the split: it is what stopped an explorer URL from being
 * hard-coded into the agent bootstrap prompt a second time.
 */

export const CHAIN = {
  /*
   * `specId` is the chain spec's literal `id` field, and on aglais it is STILL
   * "quip_testnet" ON PURPOSE — it is the on-disk database path, so renaming it
   * would orphan every node's data directory. `network` is just our slug.
   *
   * Which means: identify the chain by GENESIS. Not by the spec id, and not by
   * the EVM chain ID either — 20033 is identical on aglais and on the retired
   * chain, so a chain-ID check passes against the wrong network.
   */
  network: "quip-testnet",
  specId: "quip_testnet",
  chainName: "AGLS (Quip Testnet)",
  tokenSymbol: "AGLS",
  tokenDecimals: 12,
  ss58Prefix: 42,
  genesis: "0x59e064bddd49a920d1392693c728c3bf9867f2cf3e0f8fea8c2498b389b0c286",

  /*
   * The directory, not the raw file: aglais-network.json is 2.36 MB, which is
   * not something to hand a browser. A .sha256 sits beside it. Matches what the
   * agls site links.
   */
  chainSpecUrl:
    "https://gitlab.com/quip.network/nodes.quip.network/-/tree/main/chain-specs?ref_type=heads",
  chainSpecName: "aglais-network.json",

  /*
   * Public Substrate JSON-RPC. All three bootnodes serve HTTPS POST and WSS
   * with `access-control-allow-origin: *`, so the browser calls them directly
   * with no proxy and no backend.
   *
   * 20049 is the RPC PORT. It is not a chain ID — QUI-974 tracks real drift
   * where the port number, rendered in hex, leaked into docs as one. The chain
   * ID is 20033 / 0x4e41. Never find/replace the port number.
   */
  rpcHttp: [
    "https://bootnode-1.aglais.quip.network:20049/rpc",
    "https://bootnode-2.aglais.quip.network:20049/rpc",
    "https://bootnode-3.aglais.quip.network:20049/rpc",
  ],
  rpcWss: "wss://bootnode-{1-3}.aglais.quip.network:20049/rpc",
  localRpc: "ws://127.0.0.1:9944",
} as const;

export const EVM = {
  chainName: "Aglais Testnet (Quip Network)",
  chainId: 20033,
  chainIdHex: "0x4e41",

  /*
   * BARE, no port. The endpoint answers on both :443 and :20049, but automated
   * integration validators reject a non-443 RPC URL outright, so only this form
   * is published — if :20049 reaches a copy field, someone eventually pastes it
   * into a validator and it bounces.
   */
  rpcUrl: "https://evm-rpc.aglais.quip.network",
  currencySymbol: "AGLS",
  decimals: 18,
  gasPrice: "1 gwei",
  gasPriceHex: "0x3b9aca00",
  backend: "pallet-revive",
} as const;

/*
 * API only, and it must never be rendered as a link.
 *
 * Probed 2026-09-05: the root path 404s, GET /request is 405, and the CORS
 * preflight (OPTIONS /request) returns 405 with no allow-methods header — so a
 * browser can never POST to it, in-page form or otherwise. It belongs in the
 * docs as a curl, called from a terminal or a server.
 */
export const FAUCET = {
  origin: "https://faucet.aglais.quip.network",
  request: "POST /request",
  health: "/health",
  destField: "<SS58 address | 0x+64-hex AccountId | 0x+40-hex EVM address>",
  amount: "10 AGLS",
} as const;

export const EXPLORER = {
  url: "https://explorer.aglais.quip.network",
  searchUrl: "https://explorer.aglais.quip.network/search-results",
} as const;

/** Root only — see the not-mirrored note above; /sub 404s. */
export const SUBSCAN = {
  url: "https://subscan.aglais.quip.network",
} as const;

export const PORTAL = {
  url: "https://portal.aglais.quip.network",
} as const;
