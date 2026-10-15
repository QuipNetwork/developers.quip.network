#!/usr/bin/env node
/*
 * Probes every URL the portal ships. Runs on a daily GitLab schedule.
 *
 * THIS GATES NOTHING. It is deliberately kept out of the build: a third-party
 * outage must never block shipping a copy fix. The offline invariants that DO
 * gate the build live in scripts/check-endpoints.mjs.
 *
 * It fails CLOSED. Every check is a positive assertion, so an unreachable host
 * fails an equality rather than quietly "skipping"; a timeout is a failure; too
 * few URLs discovered is a failure; a missing endpoint class is a failure. The
 * one outcome this script will not produce is a green run that proves nothing.
 *
 * URLs are discovered by scanning source, not by importing src/data/links.ts.
 * Two reasons: links.ts reads import.meta.env, which does not exist under plain
 * node, and — more importantly — scanning source is what catches a URL
 * hard-coded into a template instead of a data file. That is the exact bug this
 * repo already shipped once.
 *
 * Zero dependencies, so CI needs no install step.
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { setDefaultResultOrder } from "node:dns";
import { setDefaultAutoSelectFamily, setDefaultAutoSelectFamilyAttemptTimeout } from "node:net";

/*
 * Happy eyeballs, because curl does it and node's fetch effectively does not.
 *
 * A host that publishes an AAAA record while the runner has no working IPv6
 * route — t.me is one — makes fetch sit there until it times out, so the report
 * accuses a perfectly healthy link of being broken. It reproduced about half
 * the time locally, which is worse than failing outright: a checker that reds
 * at random is one everybody learns to ignore.
 *
 * ipv4first orders the addresses; autoSelectFamily is what actually falls back
 * to the next one. The short attempt timeout keeps the v6 probe cheap.
 */
setDefaultResultOrder("ipv4first");
setDefaultAutoSelectFamily(true);
setDefaultAutoSelectFamilyAttemptTimeout(500);

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const REPORT = join(ROOT, "link-health.json");

const TIMEOUT_MS = 15_000;
/* Below this, assume the extractor broke rather than that the page went bare. */
const URL_FLOOR = 30;
const GENESIS =
  "0x542a9915acf840b8940d35ca6de242f669a0c6e3b40f9a8d8c14b9bf7b8ebecb";

/*
 * A browser-ish UA is not cosmetic. npmjs.com returns 403 to non-browser
 * clients and crates.io returns 403 to a generic one, so a naive GET reports
 * three healthy packages as broken. Identify honestly, but identify.
 */
const UA = "Mozilla/5.0 (compatible; quip-link-check/1.0; +https://developers.quip.network)";

/* Not probeable, and not broken. Each needs its reason stated. */
const SKIP = [
  "ws://127.0.0.1", // local node, by definition not reachable from CI
  "http://localhost",
  "https://schema.org", // JSON-LD vocabulary, not a link
  "quip.network/#organization", // JSON-LD @id anchors
  "quip.network/#website",
];

/*
 * Templated URLs shown to humans, e.g. the wss://bootnode-{1-3}... form. The
 * extractor stops at the closing brace, so match on the opening one — checking
 * for the full "{1-3}" silently never fires.
 */
const TEMPLATED = /[{}]/;

const SOURCE_EXT = new Set([".ts", ".tsx", ".astro"]);
const SKIP_DIRS = new Set(["node_modules", ".git", ".astro", ".netlify", "dist"]);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (SOURCE_EXT.has(extname(full))) out.push(full);
  }
  return out;
}

function discover() {
  const files = [...walk(join(ROOT, "src")), join(ROOT, "README.md")];
  const found = new Set();
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(/(https?|wss?):\/\/[^\s"'`,)<>\]}\\]+/g)) {
      const url = match[0].replace(/[.,;:]+$/, "");
      if (TEMPLATED.test(url)) continue;
      if (SKIP.some((s) => url.includes(s))) continue;
      found.add(url);
    }
  }
  return [...found].sort();
}

async function fetchOnce(url, init = {}) {
  return fetch(url, {
    redirect: "follow",
    headers: { "user-agent": UA, ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    ...init,
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/*
 * Retry only transport errors, 5xx and 429 — never a 4xx, which is a real
 * answer. Three attempts with backoff, because undici is measurably flakier
 * than curl on some hosts (t.me times out here perhaps half the time while curl
 * never does) and a checker that reds on a healthy link teaches everyone to
 * ignore it.
 *
 * This cuts noise; it cannot turn a failure into a pass. Every attempt is
 * asserted exactly as hard as the first, and a host that is genuinely down
 * fails all three.
 */
async function withRetry(fn, attempts = 3) {
  let last;
  for (let i = 0; i < attempts; i += 1) {
    if (i > 0) await sleep(1000 * i);
    try {
      last = await fn();
      if (last.retryable !== true) return last;
    } catch (err) {
      last = {
        ok: false,
        detail: err instanceof Error ? (err.cause?.code ?? err.message) : String(err),
      };
    }
  }
  return last;
}

async function rpcAssert(url, method, params, expect, label) {
  const res = await fetchOnce(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) return { ok: false, retryable: res.status >= 500 || res.status === 429, detail: `HTTP ${res.status}` };
  const body = await res.json();
  const got = body?.result;
  if (got !== expect) {
    return { ok: false, detail: `${label}: expected ${expect}, got ${JSON.stringify(got)}` };
  }
  return { ok: true, detail: `${label} ok` };
}

async function probe(url) {
  // --- Substrate bootnode RPC: POST-only, and the chain identity is asserted.
  if (/bootnode-\d\.aglais\.quip\.network:\d+\/rpc/.test(url)) {
    const chain = await rpcAssert(url, "system_chain", [], "AGLS (Quip Testnet)", "system_chain");
    if (!chain.ok) return chain;
    return rpcAssert(url, "chain_getBlockHash", [0], GENESIS, "genesis");
  }

  // --- EVM RPC: POST-only.
  if (url.includes("evm-rpc.aglais.quip.network")) {
    return rpcAssert(url, "eth_chainId", [], "0x4e41", "eth_chainId");
  }

  // --- Faucet: the root 404s by design; /health is the liveness surface.
  if (url.includes("faucet.aglais.quip.network")) {
    const res = await fetchOnce(new URL("/health", url).toString());
    if (!res.ok) return { ok: false, retryable: res.status >= 500, detail: `health HTTP ${res.status}` };
    const body = await res.json();
    return body?.status === "ok"
      ? { ok: true, detail: "health ok" }
      : { ok: false, detail: `health said ${JSON.stringify(body)}` };
  }

  // --- npm: the website 403s robots; the registry is the source of truth.
  const npm = url.match(/npmjs\.com\/package\/(.+)$/);
  if (npm) {
    const name = npm[1];
    const res = await fetchOnce(`https://registry.npmjs.org/${encodeURIComponent(name)}`);
    if (!res.ok) return { ok: false, retryable: res.status >= 500, detail: `registry HTTP ${res.status}` };
    const body = await res.json();
    return body?.name === name
      ? { ok: true, detail: `latest ${body["dist-tags"]?.latest}` }
      : { ok: false, detail: `registry returned ${body?.name}` };
  }

  // --- crates.io: 403s a generic UA on both the site and the API.
  const crate = url.match(/crates\.io\/crates\/([^/]+)$/);
  if (crate) {
    const res = await fetchOnce(`https://crates.io/api/v1/crates/${crate[1]}`);
    if (!res.ok) return { ok: false, retryable: res.status >= 500, detail: `api HTTP ${res.status}` };
    const body = await res.json();
    return body?.crate?.name === crate[1]
      ? { ok: true, detail: "crate exists" }
      : { ok: false, detail: `api returned ${body?.crate?.name}` };
  }

  // --- PyPI: the JSON API avoids any HTML-rendering surprise.
  const pypi = url.match(/pypi\.org\/project\/([^/]+)/);
  if (pypi) {
    const res = await fetchOnce(`https://pypi.org/pypi/${pypi[1]}/json`);
    return res.ok
      ? { ok: true, detail: "package exists" }
      : { ok: false, retryable: res.status >= 500, detail: `api HTTP ${res.status}` };
  }

  // --- The chain spec is ~2.4 MB. Ask for one byte.
  if (url.includes("/-/raw/") && url.endsWith(".json")) {
    const res = await fetchOnce(url, { headers: { range: "bytes=0-0" } });
    return res.ok || res.status === 206
      ? { ok: true, detail: `HTTP ${res.status}` }
      : { ok: false, retryable: res.status >= 500, detail: `HTTP ${res.status}` };
  }

  // --- Everything else.
  const res = await fetchOnce(url);
  return res.status < 400
    ? { ok: true, detail: `HTTP ${res.status}` }
    : { ok: false, retryable: res.status >= 500 || res.status === 429, detail: `HTTP ${res.status}` };
}

async function main() {
  const urls = discover();
  const results = [];
  let failed = 0;

  console.log(`check-links: probing ${urls.length} URLs\n`);

  for (const url of urls) {
    let outcome;
    try {
      outcome = await withRetry(() => probe(url));
    } catch (err) {
      // A thrown error is a failure, never a skip. Timeouts land here.
      outcome = { ok: false, detail: err instanceof Error ? err.message : String(err) };
    }
    if (!outcome.ok) failed += 1;
    results.push({ url, ...outcome });
    console.log(`  ${outcome.ok ? "ok  " : "FAIL"} ${url}\n         ${outcome.detail}`);
  }

  /*
   * Structural assertions. Without these, deleting every endpoint from the
   * source produces a clean run — "nothing broken" would be indistinguishable
   * from "nothing checked".
   */
  const structural = [];
  if (urls.length < URL_FLOOR) {
    structural.push(`only ${urls.length} URLs discovered, expected at least ${URL_FLOOR} — the extractor is probably broken`);
  }
  const classes = {
    "bootnode RPC": /bootnode-\d\.aglais\.quip\.network/,
    "EVM RPC": /evm-rpc\.aglais\.quip\.network/,
    explorer: /explorer\.aglais\.quip\.network/,
  };
  for (const [name, re] of Object.entries(classes)) {
    if (!urls.some((u) => re.test(u))) structural.push(`no ${name} URL found in source`);
  }
  for (const dead of ["testnet.quip.network", "forecaster.quip.network"]) {
    const hits = urls.filter((u) => u.includes(dead));
    if (hits.length > 0) structural.push(`retired endpoint back in source: ${hits.join(", ")}`);
  }

  writeFileSync(
    REPORT,
    JSON.stringify(
      { checkedAt: new Date().toISOString(), checked: urls.length, failed, structural, results },
      null,
      2,
    ) + "\n",
  );

  console.log(`\ncheck-links: ${urls.length - failed}/${urls.length} passed`);
  if (structural.length > 0) {
    console.error("\nstructural problems:");
    for (const s of structural) console.error(`  - ${s}`);
  }

  if (failed > 0 || structural.length > 0) process.exit(1);
  console.log("check-links: all good");
}

process.on("unhandledRejection", (err) => {
  console.error("check-links: unhandled rejection —", err);
  process.exit(1);
});

main().catch((err) => {
  console.error("check-links: crashed —", err);
  process.exit(1);
});
