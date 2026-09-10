/*
 * Every outbound destination the portal links to, in one place.
 *
 * Chain endpoints are NOT here. Explorer, RPC, faucet, chain spec and the rest
 * live in ./testnet.ts, scoped to the chain they belong to, so that repointing
 * to a new network is one file rather than a hunt.
 *
 * Two rules keep this file trustworthy:
 *
 * 1. Nothing ships here until it returns 200. Properties that exist as repos
 *    but not yet as live hosts (dashboard.quip.network, the mainnet explorer)
 *    are listed in PENDING below and rendered nowhere.
 * 2. DOCS_BASE is the cutover switch. Documentation is generated from the
 *    GitBook source and served by this portal, so every public link stays on
 *    the canonical developers.quip.network host.
 *
 *    It resolves against Astro's own `site`, not a hard-coded origin, so a
 *    deploy preview links to the docs in THAT preview rather than to
 *    production — which does not serve /docs until this lands. Hard-coding it
 *    also made the link probe check a production URL that cannot exist before
 *    merge, so the pipeline could never go green on the MR that introduces it.
 */

const SITE_ORIGIN = import.meta.env.SITE ?? "https://developers.quip.network";

export const DOCS_BASE = new URL("/docs", SITE_ORIGIN).href;

const docs = (path: string) => `${DOCS_BASE}/${path}`;

export const DOCS = {
  home: DOCS_BASE,
  quickstart: docs("getting-started/quickstart"),
  whatIsQuip: docs("getting-started/what-is-quip"),
  sdk: docs("getting-started/quip-sdk"),
  useWithAi: docs("getting-started/use-with-ai"),
  howItFitsTogether: docs("quip-interlock-protocol/how-quip-fits-together"),
  accounts: docs("quip-interlock-protocol/quip-accounts"),
  quipswap: docs("quip-interlock-protocol/quipswap"),
  submitAJob: docs("compute/submit-a-job"),
  qvrf: docs("compute/qvrf"),
  keyProperties: docs("basics/key-properties"),
  participants: docs("network/participants"),
  token: docs("network/token"),
  runANode: docs("nodes/run-a-node-testnet"),
  miners: docs("nodes/miners"),
};

/*
 * No mcpEndpoint. The only MCP server for these docs was hosted by GitBook, on
 * the domain this migration retires, so pointing agents at it would keep the
 * dependency we are removing. The generated llms.txt / llms-full.txt and the
 * per-page .md twins cover the machine-readable need from the canonical host.
 * A self-hosted MCP server is tracked separately.
 */
export const AI = {
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

/** Quip web properties that are not tied to a particular chain. */
export const NETWORK = {
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
  // The value here used to be an NXDOMAIN vanity host. This is the estate's
  // canonical one (quip.network/apps/main/src/data/social.ts), and it 301s to
  // farcaster.xyz.
  farcaster: "https://warpcast.com/quipnetwork.eth",
  linkedin: "https://www.linkedin.com/company/postquant-labs",
};

/*
 * Built, but not yet reachable. Do not link until DNS resolves and the page
 * returns 200; a dead link on the developer portal costs more trust than a
 * missing one.
 *
 *   dashboard.quip.network   mining telemetry dashboard (repo exists, no DNS)
 *   explorer.quip.network    MAINNET explorer (repo exists, no DNS). This is a
 *                            different host from explorer.aglais.quip.network,
 *                            which is live and linked from the Network panel.
 *   isingmark leaderboard    benchmark leaderboard (planned)
 *
 * The faucet came off this list on 2026-09-05: it is live, but API-only. See
 * FAUCET in ./testnet.ts for why it is documented rather than linked.
 */
export const PENDING = [
  "dashboard.quip.network",
  "explorer.quip.network",
] as const;

export const LAST_UPDATED = import.meta.env.PUBLIC_BUILD_DATE;
