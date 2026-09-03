/*
 * Every outbound destination the portal links to, in one place.
 *
 * Two rules keep this file trustworthy:
 *
 * 1. Nothing ships here until it returns 200. Properties that exist as repos
 *    but not yet as live hosts (dashboard.quip.network, explorer.quip.network,
 *    the faucet) are listed in PENDING below and rendered nowhere.
 * 2. DOCS_BASE is the cutover switch. docs.quip.network currently serves the
 *    GitBook at its root but 404s /llms.txt into an unrelated mdBook, so the
 *    portal points at the gitbook.io host. When that domain serves one
 *    coherent site, change this constant and every docs link follows.
 */

export const DOCS_BASE = "https://quip.gitbook.io/docs";

const docs = (path: string) => `${DOCS_BASE}/${path}`;

export const DOCS = {
  home: DOCS_BASE,
  quickstart: docs("getting-started/quickstart"),
  whatIsQuip: docs("getting-started/what-is-quip"),
  sdk: docs("getting-started/quip-sdk"),
  useWithAi: docs("getting-started/use-with-ai"),
  howItFitsTogether: docs("interlock/how-quip-fits-together"),
  accounts: docs("interlock/quip-accounts"),
  quipswap: docs("interlock/quipswap"),
  submitAJob: docs("compute/submit-a-job"),
  qvrf: docs("compute/qvrf"),
  keyProperties: docs("basics/key-properties"),
  participants: docs("network/participants"),
  token: docs("network/token"),
  runANode: docs("nodes/run-a-node-testnet"),
  miners: docs("nodes/miners"),
};

export const AI = {
  mcpEndpoint: `${DOCS_BASE}/~gitbook/mcp`,
  llmsTxt: `${DOCS_BASE}/llms.txt`,
  llmsFullTxt: `${DOCS_BASE}/llms-full.txt`,
};

/** GitLab is canonical. GitHub is a mirror, and is labelled as one. */
export const CODE = {
  gitlabGroup: "https://gitlab.com/quip.network",
  githubOrg: "https://github.com/QuipNetwork",
  validator: "https://gitlab.com/quip.network/quip-validator",
  protocol: "https://gitlab.com/quip.network/quip-protocol/",
  xquad: "https://gitlab.com/quip.network/xquad",
  nodeManager: "https://gitlab.com/quip.network/quip-node-manager/-/releases",
  nodeServer: "https://gitlab.com/quip.network/nodes.quip.network",
  ethereumSdk: "https://gitlab.com/quip.network/ethereum-sdk",
  hashsigs: "https://gitlab.com/quip.network/hashsigs-rs",
  miner: "https://gitlab.com/quip.network/quip-miner",
};

export const REGISTRIES = {
  ethereumSdk: "https://www.npmjs.com/package/@quip.network/ethereum-sdk",
  quipSwapSdk: "https://www.npmjs.com/package/@quip.network/quip-swap-sdk",
  hashsigsWasm: "https://www.npmjs.com/package/@quip.network/hashsigs-wasm",
  xquad: "https://pypi.org/project/xquad/",
  xqsa: "https://pypi.org/project/xqsa/",
  hashsigsRs: "https://crates.io/crates/hashsigs-rs",
};

export const NETWORK = {
  /*
   * Public Substrate JSON-RPC on a testnet bootnode. Verified reachable over
   * HTTPS and WSS with `access-control-allow-origin: *`, so the browser calls it
   * directly with no proxy and no backend.
   *
   * DEMO-GRADE: the protocol team has not documented this endpoint — only
   * evm-rpc appears in the docs. It is nginx-fronted with open CORS and serves
   * the full state and archive method sets, which looks deliberate, but confirm
   * it is a supported public endpoint before anything load-bearing depends on it.
   */
  rpcPublic: "https://bootnode-1.testnet.quip.network:20049/rpc",
  explorer: "https://explorer.testnet.quip.network",
  chainSpec: "https://nodes.quip.network/chain-specs/quip-testnet.json",
  account: "https://account.quip.network",
  feedback: "https://feedback.quip.network",
  research: "https://research.quip.network",
};

export const SITE = {
  home: "https://quip.network/?utm_source=developers.quip.network",
  blog: "https://quip.network/blog",
  whitepaper: "https://quip.network/documents/Quip-Whitepaper.pdf",
  useCases: "https://quip.network/use-cases/",
};

export const SOCIAL = {
  discord: "https://discord.gg/quipnetwork",
  telegram: "https://t.me/+Pbld47s3BO44YmUx",
  x: "https://twitter.com/quipnetwork",
  farcaster: "https://forecaster.quip.network",
  linkedin: "https://www.linkedin.com/company/postquant-labs",
};

/*
 * Built, but not yet reachable. Do not link until DNS resolves and the page
 * returns 200; a dead link on the developer portal costs more trust than a
 * missing one.
 *
 *   dashboard.quip.network   mining telemetry dashboard (repo exists, no DNS)
 *   explorer.quip.network    mainnet explorer (repo exists, no DNS)
 *   isingmark leaderboard    benchmark leaderboard (planned)
 *   faucet                   repo exists on GitLab, live URL unverified
 */
export const PENDING = [
  "dashboard.quip.network",
  "explorer.quip.network",
  "faucet",
] as const;

export const LAST_UPDATED = import.meta.env.PUBLIC_BUILD_DATE;
