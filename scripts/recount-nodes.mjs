#!/usr/bin/env node
/*
 * Build the node map's data from the chain: read MinerRegistry::NodeDescriptors,
 * keep the operators that are still participating, take each one's published
 * host, and resolve it to a CITY.
 *
 * Writes src/data/network-nodes.ts.
 *
 * Usage:  node scripts/recount-nodes.mjs             rewrite the data file
 *         node scripts/recount-nodes.mjs --dry-run   print, write no data file
 *
 * --dry-run still updates the geo cache. That is deliberate — those lookups are
 * spent against a daily quota either way, and the next run should not pay for
 * them again — but it means the flag is not entirely without side effects.
 *
 * THIS RUNS UNATTENDED, DAILY, IN CI (QUI-1340). It used to be a human chore —
 * run it, read the diff, decide whether the map looked right. That reviewer was
 * load-bearing: they were the one who would notice that half the dots had
 * vanished because the geo service had started throttling. Nobody is watching
 * now, so every judgement that reviewer made has to be a check in here, and
 * every check has to FAIL THE RUN rather than write a thinner map. A map that
 * silently loses a third of its nodes is worse than yesterday's map.
 *
 * GRANULARITY IS CITY, DELIBERATELY. Operators publish an exact address on
 * chain, so precise coordinates would be easy — and are not ours to publish.
 * Every node is placed at its city's centroid as returned by the geo service,
 * then rounded to 2dp, so nodes in the same city land on one identical point
 * and cannot be told apart. Do not "improve" this by using a finer position.
 *
 * A private-range or unresolvable host is skipped rather than guessed. A dot in
 * the wrong place is worse than a missing dot.
 *
 * No dependencies. Needs outbound HTTPS to the geo service and the RPC.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { setDefaultResultOrder, promises as dns } from "node:dns";
import {
  setDefaultAutoSelectFamily,
  setDefaultAutoSelectFamilyAttemptTimeout,
} from "node:net";
import { isIP } from "node:net";

setDefaultResultOrder("ipv4first");
setDefaultAutoSelectFamily(true);
setDefaultAutoSelectFamilyAttemptTimeout(500);

/*
 * ipwho.is: HTTPS, no account, no key. Chosen over ip-api.com, whose free tier
 * is HTTP-only — sending operator addresses over plaintext to a third party to
 * build a public map is not a trade worth making. Swap freely: the output is a
 * committed file, so nothing at runtime depends on this service existing.
 */
const GEO = (ip) => `https://ipwho.is/${ip}?fields=success,city,country_code,latitude,longitude`;

/*
 * How many geo lookups are in flight at once. The unattended version of this
 * script is the reason there is a limit at all: it used to fire one request per
 * unique IP, sequentially but with no pacing and no retry, which was fine at 45
 * descriptors and is a burst at several hundred. ipwho.is publishes no rate
 * limit, so the number is a guess made on the safe side — raise it only with
 * evidence, because the failure mode is being throttled into a thinner map.
 */
const GEO_CONCURRENCY = 4;

/*
 * A node is on the map if it has participated within this many blocks. Runs
 * about seven days at ~5.9s blocks.
 *
 * The map is regenerated daily now, so without this it only ever grows: a
 * descriptor stays in MinerRegistry::NodeDescriptors after its operator walks
 * away, and the map would accumulate dots for machines that are gone.
 *
 * Seven days is deliberately loose. Measured at block 168,512: of 240
 * descriptors the oldest participation was 8.64 days, p90 was 2.25 days and p50
 * was 15 minutes — but the chain itself was only ~11.5 days old, so "nothing is
 * older than 8.64 days" says nothing about whether the pallet ever drops a
 * descriptor. There is not yet enough history to justify a tighter cut, and
 * guessing one drops live operators who participate infrequently. This buys the
 * ceiling without that risk. The distribution is sparse between 3 and 7 days,
 * so that is where to tighten once the chain is older.
 */
const ACTIVE_WITHIN_BLOCKS = 102_500;

/*
 * Ceiling on how much of the map the geo step may fail to place before the run
 * is treated as broken rather than merely incomplete.
 *
 * This is the check that replaces the human who used to eyeball the printed
 * `unlocatable` count and decide whether to commit. It was 3.6% on a healthy
 * run; a service that has started refusing us looks like a number far above
 * that, not slightly above it.
 */
const MAX_UNLOCATABLE_FRACTION = 0.15;

/*
 * A drop this large against the committed map is a cliff, not attrition — the
 * same shape, and the same constants, that recount-network.mjs --check uses for
 * every other published figure.
 */
const SHRINK = { pct: 0.25, floor: 5 };

const OUT = new URL("../src/data/network-nodes.ts", import.meta.url);
const TESTNET = new URL("../src/data/testnet.ts", import.meta.url);

/* ---- storage keys (see recount-network.mjs for the same helpers) ----------- */

const M = (1n << 64n) - 1n;
const P1 = 11400714785074694791n, P2 = 14029467366897019727n;
const P3 = 1609587929392839161n, P4 = 9650029242287828579n, P5 = 2870177450012600261n;
const rotl = (x, r) => ((x << BigInt(r)) | (x >> BigInt(64 - r))) & M;
const round_ = (a, v) => (rotl((a + v * P2) & M, 31) * P1) & M;
const merge = (a, v) => (((a ^ round_(0n, v)) * P1) + P4) & M;

function xxh64(buf, seed = 0n) {
  const n = buf.length;
  let i = 0, h;
  const u64 = (o) => buf.readBigUInt64LE(o);
  if (n >= 32) {
    let v1 = (seed + P1 + P2) & M, v2 = (seed + P2) & M, v3 = seed & M, v4 = (seed - P1) & M;
    for (; i + 32 <= n; i += 32) {
      v1 = round_(v1, u64(i)); v2 = round_(v2, u64(i + 8));
      v3 = round_(v3, u64(i + 16)); v4 = round_(v4, u64(i + 24));
    }
    h = (rotl(v1, 1) + rotl(v2, 7) + rotl(v3, 12) + rotl(v4, 18)) & M;
    h = merge(h, v1); h = merge(h, v2); h = merge(h, v3); h = merge(h, v4);
  } else h = (seed + P5) & M;
  h = (h + BigInt(n)) & M;
  for (; i + 8 <= n; i += 8) h = ((rotl(h ^ round_(0n, u64(i)), 27) * P1) + P4) & M;
  if (i + 4 <= n) { h = ((rotl((h ^ (BigInt(buf.readUInt32LE(i)) * P1)) & M, 23) * P2) + P3) & M; i += 4; }
  for (; i < n; i++) h = (rotl((h ^ (BigInt(buf[i]) * P5)) & M, 11) * P1) & M;
  h = (h ^ (h >> 33n)) * P2 & M;
  h = (h ^ (h >> 29n)) * P3 & M;
  return h ^ (h >> 32n);
}
function twox128(s) {
  const b = Buffer.from(s, "utf8"), out = Buffer.alloc(16);
  out.writeBigUInt64LE(xxh64(b, 0n), 0);
  out.writeBigUInt64LE(xxh64(b, 1n), 8);
  return out;
}
const prefix = (p, i) => "0x" + Buffer.concat([twox128(p), twox128(i)]).toString("hex");

function compact(b, off) {
  const b0 = b[off], mode = b0 & 0b11;
  if (mode === 0) return [b0 >> 2, off + 1];
  if (mode === 1) return [b.readUInt16LE(off) >> 2, off + 2];
  if (mode === 2) return [b.readUInt32LE(off) >>> 2, off + 4];
  const len = (b0 >> 2) + 4;
  let v = 0n;
  for (let i = len - 1; i >= 0; i--) v = (v << 8n) | BigInt(b[off + 1 + i]);
  return [Number(v), off + 1 + len];
}

/* ---- RPC, across all three bootnodes --------------------------------------- */

/*
 * The endpoint list is src/data/testnet.ts, which already carries all three
 * bootnodes and is what the site itself dials. Read rather than duplicated, so
 * there is one place to change when the hosts move. Parsed with a regex for the
 * same reason the genesis hash is in recount-network.mjs: importing a .ts file
 * from a plain .mjs script would mean a build step, and these scripts stay
 * dependency-free so CI can run them on a bare node image.
 */
function endpoints() {
  // An explicit override is a single endpoint and does not fail over — if you
  // named a node, you want that node, and silently using a different one would
  // hide whatever you were testing.
  if (process.env.QUIP_RPC) return [process.env.QUIP_RPC];
  const src = readFileSync(TESTNET, "utf8");
  const block = src.match(/rpcHttp:\s*\[([\s\S]*?)\]/);
  if (!block) throw new Error("testnet.ts: no rpcHttp array");
  const urls = [...block[1].matchAll(/"(https?:\/\/[^"]+)"/g)].map((m) => m[1]);
  if (!urls.length) throw new Error("testnet.ts: rpcHttp is empty");
  return urls;
}

let RPC = null;
let id = 0;
async function call(method, params = []) {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`${method}: HTTP ${res.status}`);
  const body = await res.json();
  if (body.error) throw new Error(`${method}: ${body.error.message}`);
  return body.result;
}

// Thrown for a condition that another bootnode cannot fix. Trying the next one
// would turn "this is the wrong chain" into "all three bootnodes failed", which
// names the wrong problem.
class Fatal extends Error {}

/*
 * Run `read` against one bootnode, moving to the next if it fails.
 *
 * The start index is random so a scheduled daily run does not always land on
 * bootnode-1, and so an operator reading their own logs sees the load spread.
 *
 * RETRYING RE-READS FROM SCRATCH, WHICH IS THE POINT. Every read is pinned to a
 * single block hash so the figures cannot disagree with each other, and a node
 * that is one block behind does not have that hash yet — bootnode-3 was a block
 * ahead of the other two when this was written. So `read` pins its own block at
 * the top, and a failover re-enters it and re-pins against the node that is
 * actually answering. Do not hoist the pin out of `read` to "save a call".
 */
async function withFailover(read) {
  const urls = endpoints();
  const start = Math.floor(Math.random() * urls.length);
  let last;
  for (let i = 0; i < urls.length; i++) {
    RPC = urls[(start + i) % urls.length];
    try {
      return await read();
    } catch (err) {
      if (err instanceof Fatal) throw err;
      last = err;
      console.error(`  ${RPC} failed: ${err.message}`);
      if (i < urls.length - 1) console.error("  trying the next bootnode");
    }
  }
  throw new Error(`all ${urls.length} bootnodes failed, last: ${last?.message}`);
}

function expectedGenesis() {
  const src = readFileSync(TESTNET, "utf8");
  const m = src.match(/genesis:\s*"(0x[0-9a-fA-F]{64})"/);
  if (!m) throw new Error("testnet.ts: no genesis hash");
  return m[1];
}

/* ---- NodeDescriptor, decoded only as far as `miners` ----------------------- */

// Order must match pallet-miner-registry's stored NodeDescriptor. Indices are
// the SCALE variant order of MinerKind and are stable on a live chain — the
// pallet's own comment says Metal was appended last precisely to keep them so.
const KINDS = ["Cpu", "Gpu", "QpuDwave", "QpuIbm", "QpuIonq", "QpuPasqal", "Asic", "Metal"];
// What the map draws. Metal is an Apple GPU backend, so it colours as a GPU.
const TO_MAP_KIND = {
  Cpu: "CPU", Gpu: "GPU", Metal: "GPU", Asic: "ASIC",
  QpuDwave: "QPU", QpuIbm: "QPU", QpuIonq: "QPU", QpuPasqal: "QPU",
};
const RANK = { CPU: 0, GPU: 1, ASIC: 2, QPU: 3 };

function decode(b) {
  let off = 2; // schema_version: u16
  const vec = () => { const [n, o] = compact(b, off); off = o + n; return b.subarray(o, o + n); };
  const optVec = () => { const t = b[off++]; return t === 0 ? null : vec(); };

  vec();                       // node_id
  vec();                       // node_name
  const host = optVec();       // public_host
  if (b[off++] === 1) off += 2; // public_port: Option<u16>

  let [n, o] = compact(b, off); off = o;         // rpc_endpoints: Vec<Vec<u8>>
  for (let i = 0; i < n; i++) vec();

  const autoMine = b[off++], logLevel = b[off++];
  if (autoMine > 1) throw new Error(`auto_mine=${autoMine} — field walk is misaligned`);
  if (logLevel > 3) throw new Error(`log_level=${logLevel} — field walk is misaligned`);

  [n, o] = compact(b, off); off = o;             // miners: Vec<MinerSpec>
  const kinds = [];
  for (let i = 0; i < n; i++) {
    const k = b[off++];
    if (k >= KINDS.length) throw new Error(`miner kind=${k} — field walk is misaligned`);
    kinds.push(KINDS[k]);
    optVec(); optVec(); optVec();                // label, backend, device_id
  }

  // Whatever follows must still hold payload_hash(32) + updated_at(4) +
  // deposit(16). If it cannot, the walk landed in the wrong place and every
  // value above is suspect — so refuse rather than emit a plausible map.
  if (b.length - off < 52) throw new Error(`only ${b.length - off}B after miners — field walk is misaligned`);

  return { host: host ? host.toString("utf8") : null, kinds };
}

/* ---- ParticipationRecord, for "is this node still here?" ------------------- */

/*
 * pallet-miner-registry:
 *
 *   pub struct ParticipationRecord<BlockNumber> {
 *       pub qblock_id: u64,
 *       pub kind: MinerKind,
 *       pub budget_seconds: Option<u32>,
 *       pub updated_at: BlockNumber,      // u32
 *   }
 *
 * Refuses on anything it does not recognise, for the same reason decode() does:
 * a misread here silently marks live operators as gone, and a map missing a
 * third of the network still renders perfectly.
 */
function decodeParticipation(b) {
  let off = 8; // qblock_id: u64
  const kind = b[off++];
  if (kind >= KINDS.length) throw new Error(`participation kind=${kind} — field walk is misaligned`);
  const tag = b[off++]; // budget_seconds: Option<u32>
  if (tag > 1) throw new Error(`budget_seconds tag=${tag} — field walk is misaligned`);
  if (tag === 1) off += 4;
  if (b.length - off !== 4) {
    throw new Error(`${b.length - off}B left for updated_at, expected 4 — field walk is misaligned`);
  }
  return { updatedAt: b.readUInt32LE(off) };
}

/* ---- geo ------------------------------------------------------------------- */

const CITY_DP = 2; // ~1 km. See the granularity note at the top of this file.

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/*
 * THE DISTINCTION THIS FILE GETS WRONG MOST EASILY.
 *
 * "ipwho.is has no city for this address" and "ipwho.is did not answer us" are
 * different facts with the same shape, and the previous version returned null
 * for both. Everything downstream then counted them together as `unlocatable`,
 * which meant a throttled geo service was indistinguishable from a network full
 * of unroutable hosts — and the run wrote a thinner map either way.
 *
 * So: `{ found: false }` is an answer, and is a legitimate skip. A throw is not
 * an answer, is retried, and if it still will not answer the run fails. Keep
 * these apart; every guard downstream depends on it.
 */
async function locateOnce(ip) {
  const res = await fetch(GEO(ip), { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) {
    /*
     * ipwho.is rate-limits by DAILY QUOTA, not by requests per second. When it
     * refuses it answers 429 with `retry-after: 86232` — just under 24 hours —
     * and no amount of backing off inside one run will get past that. Retrying
     * a quota lockout only spends three times as long arriving at the same
     * place, so a long retry-after is reported as what it is.
     *
     * This is why the cache below exists rather than being an optimisation.
     */
    const after = Number(res.headers.get("retry-after"));
    if (res.status === 429 && after > 300) {
      const err = new Error(`quota exhausted, resets in ${(after / 3600).toFixed(1)}h`);
      err.retryable = false;
      err.quota = true;
      throw err;
    }
    const err = new Error(`HTTP ${res.status}`);
    // Any other 4xx is us asking wrongly, and will not improve on a retry.
    err.retryable = res.status === 429 || res.status >= 500;
    throw err;
  }
  const j = await res.json();
  if (!j?.success || !j.city || typeof j.latitude !== "number") return { found: false };
  return {
    found: true,
    city: j.city,
    country: j.country_code,
    lat: Number(j.latitude.toFixed(CITY_DP)),
    lng: Number(j.longitude.toFixed(CITY_DP)),
  };
}

// Same shape as withRetry in scripts/check-links.mjs: three attempts, linear
// backoff, and every attempt asserted exactly as hard as the first.
async function locate(ip, attempts = 3) {
  let last;
  for (let i = 0; i < attempts; i++) {
    if (i > 0) await sleep(1000 * i);
    try {
      return await locateOnce(ip);
    } catch (err) {
      last = err;
      if (err.retryable === false) break;
    }
  }
  throw new Error(`geo lookup failed for ${ip}: ${last?.cause?.code ?? last?.message}`);
}

/* ---- the geo cache, which is what makes a daily job affordable ------------- */

/*
 * WITHOUT THIS THE DAILY JOB BREAKS WITHIN A WEEK, so it is not an optimisation.
 *
 * ipwho.is's free tier is ~10,000 lookups a month and refuses for a full day
 * once spent. A run currently resolves ~166 unique addresses; at ~40 new nodes a
 * day that is ~450/day inside a week, or ~13,500 a month — over the allowance,
 * at which point every run fails the geo guard and the map stops updating.
 *
 * Cached, a run only looks up addresses it has never seen. Steady state is the
 * new nodes only — tens a day, flat as the network grows.
 *
 * IT IS NOT COMMITTED, AND MUST NOT BE. This file maps operator IP to city, and
 * publishing operator addresses is the exact thing the granularity note at the
 * top of this script refuses to do. It is gitignored, and CI carries it between
 * runs as a job cache, which lives on the runner rather than in the repo. A cold
 * cache costs one expensive run, not a wrong map.
 */
const GEO_CACHE = new URL("../.geo-cache.json", import.meta.url);

// Long enough to be worth caching, short enough that an address which moves is
// eventually re-read rather than wrong forever.
const GEO_CACHE_TTL_DAYS = 30;

function loadCache() {
  try {
    const raw = JSON.parse(readFileSync(process.env.QUIP_GEO_CACHE ?? GEO_CACHE, "utf8"));
    const fresh = {};
    const cutoff = Date.now() - GEO_CACHE_TTL_DAYS * 86_400_000;
    for (const [ip, v] of Object.entries(raw)) {
      if (v && typeof v.at === "number" && v.at > cutoff) fresh[ip] = v;
    }
    return fresh;
  } catch {
    // Missing or unreadable is a cold cache, not an error.
    return {};
  }
}

function saveCache(cache) {
  try {
    writeFileSync(
      process.env.QUIP_GEO_CACHE ?? GEO_CACHE,
      JSON.stringify(cache, null, 0),
    );
  } catch (err) {
    // A cache we cannot write is slow, not wrong. Never fail a run over it.
    console.error(`  (could not write the geo cache: ${err.message})`);
  }
}

/*
 * NXDOMAIN is an answer — the operator's name is simply gone, which is a node
 * that cannot be placed, not an outage. Anything else (SERVFAIL, timeout,
 * refused) is the resolver failing us and is treated like a failed geo call.
 */
const DNS_GONE = new Set(["ENOTFOUND", "ENODATA", "NXDOMAIN"]);

async function resolveHost(host) {
  if (isIP(host) !== 0) return host;
  for (let i = 0; i < 3; i++) {
    if (i > 0) await sleep(1000 * i);
    try {
      return (await dns.resolve4(host))[0];
    } catch (err) {
      if (DNS_GONE.has(err.code)) return null;
      if (i === 2) throw new Error(`DNS failed for ${host}: ${err.code ?? err.message}`);
    }
  }
  return null;
}

// Run `work` over `items`, `limit` at a time. Order of results does not matter:
// everything is keyed by IP and the map is sorted before it is written.
async function pooled(items, limit, work) {
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      await work(items[i]);
    }
  });
  await Promise.all(workers);
}

function isPublicIPv4(h) {
  if (isIP(h) !== 4) return false;
  const p = h.split(".").map(Number);
  if (p[0] === 10 || p[0] === 127 || p[0] === 0) return false;
  if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return false;
  if (p[0] === 192 && p[1] === 168) return false;
  if (p[0] === 169 && p[1] === 254) return false;
  if (p[0] === 100 && p[1] >= 64 && p[1] <= 127) return false; // CGNAT
  if (p[0] >= 224) return false;                               // multicast/reserved
  return true;
}

/* ---- the checks that used to be a person reading the diff ------------------ */

// What the committed map currently claims, so this run can be compared against
// it. Absent or unreadable is not a failure: the very first run has nothing to
// compare against, and refusing to bootstrap would be its own trap.
function committedPlaced() {
  try {
    const m = readFileSync(OUT, "utf8").match(/placed:\s*(\d+)/);
    return m ? Number(m[1]) : null;
  } catch {
    return null;
  }
}

/*
 * Every one of these is something the human who used to run this script would
 * have caught by looking. None of them are advisory: each throws, and a throw
 * means the committed map stays exactly as it is for another day. Yesterday's
 * map is a known quantity; a map written from a run we do not trust is not.
 */
function guard(placed, { candidates, unlocatable, failed, quotaHit }) {
  if (quotaHit) {
    throw new Error(
      `the geo service's daily quota is spent (${failed.length} lookup(s) unanswered) — ` +
        `yesterday's map stands. This is a budget problem, not an outage: check how many ` +
        `addresses a run is having to look up fresh, and whether the cache survived ` +
        `between runs.\n    ${failed[0]}`,
    );
  }

  if (failed.length) {
    throw new Error(
      `${failed.length} geo lookup(s) failed after retries — refusing to write a map ` +
        `that is missing them:\n    ${failed.slice(0, 5).join("\n    ")}` +
        (failed.length > 5 ? `\n    …and ${failed.length - 5} more` : ""),
    );
  }

  if (!placed.length) throw new Error("no nodes could be placed — refusing to write an empty map");

  const share = candidates ? unlocatable / candidates : 0;
  if (share > MAX_UNLOCATABLE_FRACTION) {
    throw new Error(
      `${unlocatable} of ${candidates} routable hosts could not be placed ` +
        `(${(share * 100).toFixed(1)}%, max ${(MAX_UNLOCATABLE_FRACTION * 100).toFixed(0)}%) — ` +
        `that is a geo service having a bad day, not a network that moved.`,
    );
  }

  const was = committedPlaced();
  if (was !== null) {
    const allowed = Math.max(SHRINK.floor, was * SHRINK.pct);
    if (was - placed.length > allowed) {
      throw new Error(
        `placed fell from ${was} to ${placed.length} (drop of ${was - placed.length}, ` +
          `max ${allowed.toFixed(0)}) — a cliff like that is this script being wrong, ` +
          `not the network halving. Run with --dry-run and look before overriding.`,
      );
    }
  }
}

async function allKeys(pfx, at) {
  const keys = [];
  let start = null;
  for (;;) {
    const page = await call("state_getKeysPaged", [pfx, 1000, start, at]);
    keys.push(...page);
    if (page.length < 1000) return keys;
    start = page[page.length - 1];
  }
}

async function eachValue(keys, at, fn) {
  for (let i = 0; i < keys.length; i += 32) {
    const [{ changes }] = await call("state_queryStorageAt", [keys.slice(i, i + 32), at]);
    for (const [k, v] of changes) if (v) fn(k, Buffer.from(v.slice(2), "hex"));
  }
}

/*
 * Everything read from the chain, pinned to one block. Re-entered from the top
 * on failover — see withFailover.
 */
async function readChain() {
  const at = await call("chain_getBlockHash");
  const height = Number.parseInt((await call("chain_getHeader"))?.number, 16);
  const chain = await call("system_chain");

  // Before trusting a single figure. A bootnode that answers happily while
  // serving the retired chain is exactly how the portal published a page of
  // real numbers about the wrong network for a month (QUI-1293).
  const genesis = await call("chain_getBlockHash", [0]);
  const want = expectedGenesis();
  if (genesis.toLowerCase() !== want.toLowerCase()) {
    throw new Fatal(
      `CHAIN CHANGED: ${RPC} has genesis ${genesis}, expected ${want}. ` +
        `Refusing to map a chain that is not ours.`,
    );
  }

  const ndPfx = prefix("MinerRegistry", "NodeDescriptors");
  const lpPfx = prefix("MinerRegistry", "LatestParticipation");

  const descriptors = [];
  await eachValue(await allKeys(ndPfx, at), at, (k, b) => {
    descriptors.push({ account: k.slice(ndPfx.length), ...decode(b) });
  });

  // MinerRegistry::{NodeDescriptors,LatestParticipation} are both
  // Blake2_128Concat maps keyed by AccountId, so the key suffix is byte-identical
  // between them and the two join without hashing anything.
  const seen = new Map();
  await eachValue(await allKeys(lpPfx, at), at, (k, b) => {
    seen.set(k.slice(lpPfx.length), decodeParticipation(b).updatedAt);
  });

  return { chain, height, at, descriptors, seen };
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const { chain, height, descriptors, seen } = await withFailover(readChain);
  console.log(`${chain} @ block ${height.toLocaleString("en-US")}  via ${RPC}\n`);
  console.log(`descriptors      ${descriptors.length}`);

  // --- still here? A descriptor with no participation record at all has never
  //     mined, and is not a node anyone is running.
  const active = descriptors.filter((d) => {
    const last = seen.get(d.account);
    return last !== undefined && height - last <= ACTIVE_WITHIN_BLOCKS;
  });
  const inactive = descriptors.length - active.length;
  console.log(`  inactive       ${inactive}  (no proof within ${ACTIVE_WITHIN_BLOCKS.toLocaleString("en-US")} blocks)`);
  console.log(`active           ${active.length}`);

  // --- resolve each host to an address, and sort out what can be placed at all
  let skippedNoHost = 0, skippedPrivate = 0, unlocatable = 0;
  const candidates = [];
  for (const d of active) {
    if (!d.host) { skippedNoHost++; continue; }
    const ip = await resolveHost(d.host.trim());
    if (ip === null) { unlocatable++; continue; }
    if (!isPublicIPv4(ip)) { skippedPrivate++; continue; }
    candidates.push({ ip, kinds: d.kinds });
  }

  // --- geo, once per unique address we have never seen, a few at a time
  const unique = [...new Set(candidates.map((c) => c.ip))];
  const cache = loadCache();
  const misses = unique.filter((ip) => !(ip in cache));
  console.log(`geo              ${unique.length - misses.length} cached, ${misses.length} to look up`);

  const failed = [];
  let quotaHit = false;
  await pooled(misses, GEO_CONCURRENCY, async (ip) => {
    // Once the daily quota is gone every further call is a wasted round trip
    // and the run is failing anyway. Stop asking.
    if (quotaHit) return;
    try {
      const loc = await locate(ip);
      cache[ip] = { ...loc, at: Date.now() };
    } catch (err) {
      if (err.quota) quotaHit = true;
      failed.push(err.message);
    }
  });
  // Bank what this run learned even if it is about to fail a guard: those
  // lookups are spent either way, and the next run should not pay for them
  // again.
  saveCache(cache);

  const placed = [];
  for (const c of candidates) {
    const loc = cache[c.ip];
    // No entry means its lookup failed rather than answered. That is counted in
    // `failed` and the guard below stops the run, so it is not a skip.
    if (loc === undefined) continue;
    if (!loc.found) { unlocatable++; continue; }
    const kind = c.kinds
      .map((k) => TO_MAP_KIND[k])
      .reduce((a, b) => (RANK[b] > RANK[a] ? b : a), "CPU");
    placed.push({ city: loc.city, country: loc.country, lat: loc.lat, lng: loc.lng, kind });
  }

  const cities = new Set(placed.map((p) => `${p.city}, ${p.country}`));
  console.log(`placed           ${placed.length}`);
  console.log(`  no host        ${skippedNoHost}`);
  console.log(`  private range  ${skippedPrivate}`);
  console.log(`  unlocatable    ${unlocatable}`);
  console.log(`  geo failed     ${failed.length}`);
  console.log(`distinct cities  ${cities.size}`);
  const byKind = placed.reduce((a, p) => ((a[p.kind] = (a[p.kind] ?? 0) + 1), a), {});
  console.log(`by kind          ${JSON.stringify(byKind)}`);

  guard(placed, { candidates: candidates.length, unlocatable, failed, quotaHit });

  placed.sort((a, b) => a.city.localeCompare(b.city) || a.kind.localeCompare(b.kind));

  const body = `/*
 * Real node positions, generated by scripts/recount-nodes.mjs. Do not edit by
 * hand — the daily refresh job overwrites this file.
 *
 * Source: MinerRegistry::NodeDescriptors on ${chain}, block ${height}, read
 * through the public bootnode RPC. Each operator publishes its own host on
 * chain; this places that host at its CITY, never at a finer position, and
 * every node in a city shares one identical point.
 *
 * Only operators that have proved work recently are drawn: a descriptor outlives
 * the machine it describes, so without that filter a daily refresh would
 * accumulate dots for nodes that are gone. See ACTIVE_WITHIN_BLOCKS in the
 * script for why the window is as loose as it is.
 *
 * Nodes whose host is missing, in a private range, or unresolvable are omitted
 * rather than guessed at.
 */

export type NodeKind = "CPU" | "GPU" | "QPU" | "ASIC";

export interface NetworkNode {
  city: string;
  country: string;
  lat: number;
  lng: number;
  kind: NodeKind;
}

export const NODES_MEASURED = {
  chain: "Aglais",
  atBlock: ${height},
  takenOn: "${new Date().toISOString().slice(0, 10)}",
  descriptors: ${descriptors.length},
  active: ${active.length},
  inactive: ${inactive},
  activeWithinBlocks: ${ACTIVE_WITHIN_BLOCKS},
  placed: ${placed.length},
} as const;

export const NETWORK_NODES: NetworkNode[] = ${JSON.stringify(placed, null, 2)};

export const NODE_CITY_COUNT = ${cities.size};
`;

  if (dryRun) {
    console.log("\n--dry-run: not writing\n");
    console.log(body.slice(0, 900) + "…");
    return;
  }
  writeFileSync(OUT, body);
  console.log(`\nwrote src/data/network-nodes.ts`);
}

process.on("unhandledRejection", (e) => { console.error("recount-nodes:", e); process.exit(1); });
main().catch((e) => { console.error("recount-nodes:", e.message); process.exit(1); });
