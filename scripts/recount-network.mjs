#!/usr/bin/env node
/*
 * Recount the network-scale figures in src/data/network-snapshot.ts, straight
 * from the chain.
 *
 * Those figures went stale because refreshing them was believed to require
 * standing up the dashboard indexer and its Postgres. It does not: every one of
 * them lives in chain storage and is readable through the public bootnode RPC
 * under the `safe` method set. This script reads them in about ten seconds.
 *
 * Usage:  node scripts/recount-network.mjs              print the figures
 *         node scripts/recount-network.mjs --write      rewrite the snapshot
 *         node scripts/recount-network.mjs --check      fail if the published
 *                                                      snapshot has gone stale,
 *                                                      shrunk, or is describing
 *                                                      a different chain
 *         node scripts/recount-network.mjs --self-test  verify key derivation
 *
 * --write and --check both run daily in CI (QUI-1340): --check first, against
 * what is currently published, then --write to move it on. They are deliberately
 * separate verbs. Finding out the page is stale and deciding what to publish are
 * still different jobs, and --check has to be able to run against a tree nobody
 * is about to rewrite.
 *
 * Bare invocation still only prints, because that is what you want when you are
 * looking rather than publishing.
 *
 * Zero dependencies, like the other scripts here.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { setDefaultResultOrder } from "node:dns";
import {
  setDefaultAutoSelectFamily,
  setDefaultAutoSelectFamilyAttemptTimeout,
} from "node:net";
setDefaultResultOrder("ipv4first");
setDefaultAutoSelectFamily(true);
setDefaultAutoSelectFamilyAttemptTimeout(500);

const TESTNET = new URL("../src/data/testnet.ts", import.meta.url);

/*
 * All three bootnodes, from src/data/testnet.ts — the same list the site dials,
 * read rather than duplicated. See the matching helper in recount-nodes.mjs.
 */
function endpoints() {
  // An explicit override is a single endpoint and does not fail over: if you
  // named a node, you want that node.
  if (process.env.QUIP_RPC) return [process.env.QUIP_RPC];
  const src = readFileSync(TESTNET, "utf8");
  const block = src.match(/rpcHttp:\s*\[([\s\S]*?)\]/);
  if (!block) throw new Error("testnet.ts: no rpcHttp array");
  const urls = [...block[1].matchAll(/"(https?:\/\/[^"]+)"/g)].map((m) => m[1]);
  if (!urls.length) throw new Error("testnet.ts: rpcHttp is empty");
  return urls;
}

let RPC = null;

/* ---- xxh64 / twox128, the hash Substrate names storage with ---------------- */

const M = (1n << 64n) - 1n;
const P1 = 11400714785074694791n, P2 = 14029467366897019727n;
const P3 = 1609587929392839161n, P4 = 9650029242287828579n, P5 = 2870177450012600261n;
const rotl = (x, r) => ((x << BigInt(r)) | (x >> BigInt(64 - r))) & M;
const round = (acc, v) => (rotl((acc + v * P2) & M, 31) * P1) & M;
const merge = (acc, v) => (((acc ^ round(0n, v)) * P1) + P4) & M;

function xxh64(buf, seed = 0n) {
  const n = buf.length;
  let i = 0, h;
  const u64 = (o) => buf.readBigUInt64LE(o);
  if (n >= 32) {
    let v1 = (seed + P1 + P2) & M, v2 = (seed + P2) & M, v3 = seed & M, v4 = (seed - P1) & M;
    for (; i + 32 <= n; i += 32) {
      v1 = round(v1, u64(i)); v2 = round(v2, u64(i + 8));
      v3 = round(v3, u64(i + 16)); v4 = round(v4, u64(i + 24));
    }
    h = (rotl(v1, 1) + rotl(v2, 7) + rotl(v3, 12) + rotl(v4, 18)) & M;
    h = merge(h, v1); h = merge(h, v2); h = merge(h, v3); h = merge(h, v4);
  } else {
    h = (seed + P5) & M;
  }
  h = (h + BigInt(n)) & M;
  for (; i + 8 <= n; i += 8) {
    h = ((rotl(h ^ round(0n, u64(i)), 27) * P1) + P4) & M;
  }
  if (i + 4 <= n) {
    h = ((rotl((h ^ (BigInt(buf.readUInt32LE(i)) * P1)) & M, 23) * P2) + P3) & M;
    i += 4;
  }
  for (; i < n; i++) h = (rotl((h ^ (BigInt(buf[i]) * P5)) & M, 11) * P1) & M;
  h = (h ^ (h >> 33n)) * P2 & M;
  h = (h ^ (h >> 29n)) * P3 & M;
  return h ^ (h >> 32n);
}

function twox128(s) {
  const b = Buffer.from(s, "utf8");
  const out = Buffer.alloc(16);
  out.writeBigUInt64LE(xxh64(b, 0n), 0);
  out.writeBigUInt64LE(xxh64(b, 1n), 8);
  return out;
}
const prefix = (pallet, item) =>
  "0x" + Buffer.concat([twox128(pallet), twox128(item)]).toString("hex");

/* ---- SCALE: only the compact integer, which is all we need ----------------- */

function compact(buf, off) {
  const b0 = buf[off], mode = b0 & 0b11;
  if (mode === 0) return [b0 >> 2, off + 1];
  if (mode === 1) return [buf.readUInt16LE(off) >> 2, off + 2];
  if (mode === 2) return [buf.readUInt32LE(off) >>> 2, off + 4];
  const len = (b0 >> 2) + 4;
  let v = 0n;
  for (let i = len - 1; i >= 0; i--) v = (v << 8n) | BigInt(buf[off + 1 + i]);
  return [Number(v), off + 1 + len];
}

/* ---- RPC ------------------------------------------------------------------- */

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

/*
 * Run `read` against one bootnode, moving to the next if it fails. Start index
 * is random so the daily job does not always lean on bootnode-1.
 *
 * A failover re-enters `read` from the top, which re-pins its block hash. That
 * is required, not incidental: every figure here is read at one block so they
 * cannot disagree, and a node a block behind does not have that hash yet.
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
      last = err;
      console.error(`  ${RPC} failed: ${err.message}`);
      if (i < urls.length - 1) console.error("  trying the next bootnode");
    }
  }
  throw new Error(`all ${urls.length} bootnodes failed, last: ${last?.message}`);
}

function selfTest() {
  // The canonical Substrate storage prefix. If this matches, the hash is right.
  const got = prefix("System", "Account");
  const want = "0x26aa394eea5630e07c48ae0c9558cef7b99d880ec681799c0cf30e8886371da9";
  console.log(`  ${got === want ? "ok  " : "FAIL"} twox128 matches System::Account`);
  if (got !== want) {
    console.error(`\n  got  ${got}\n  want ${want}`);
    process.exit(1);
  }
  console.log("recount-network: self-test passed");
}

async function readFigures() {
  // Pin every read to ONE block, or the figures can disagree with each other.
  const at = await call("chain_getBlockHash");
  const height = Number.parseInt((await call("chain_getHeader"))?.number, 16);
  const chain = await call("system_chain");
  const genesis = await call("chain_getBlockHash", [0]);

  // --- miners
  const minerKeys = await allKeys(prefix("QuantumPow", "Miners"), at);
  let withWins = 0;
  for (let i = 0; i < minerKeys.length; i += 64) {
    const [{ changes }] = await call("state_queryStorageAt", [minerKeys.slice(i, i + 64), at]);
    for (const [, v] of changes) {
      if (!v) continue;
      const b = Buffer.from(v.slice(2), "hex");
      // MinerInfo: registered_at u32 | deposit u128 | proofs_submitted u32
      //          | proofs_won u32 | rewards_earned u128   = 44 bytes
      if (b.length !== 44) throw new Error(`MinerInfo is ${b.length}B, expected 44 — layout changed`);
      if (b.readUInt32LE(24) > 0) withWins++;
    }
  }

  // --- topology. Read DefaultTopology, NOT MineableTopologies[0]: that is
  //     hash order, and it currently returns the wrong one of the two.
  const dflt = await call("state_getStorage", [prefix("QuantumPow", "DefaultTopology"), at]);
  //
  // The map is Blake2_128Concat, so each key is blake2_128(hash) ++ hash — the
  // raw hash is right there on the end. Matching on that suffix avoids needing
  // a blake2b-128 implementation: node's crypto only offers blake2b512, and
  // truncating that is a DIFFERENT hash, not the same one (the digest length is
  // mixed into blake2b's parameter block).
  const regKeys = await allKeys(prefix("QuantumPow", "RegisteredTopologies"), at);
  const want = dflt.slice(2).toLowerCase();
  const key = regKeys.find((k) => k.toLowerCase().endsWith(want));
  if (!key) throw new Error(`DefaultTopology ${dflt} has no RegisteredTopologies entry`);
  const meta = Buffer.from((await call("state_getStorage", [key, at])).slice(2), "hex");
  let [nodes, off] = compact(meta, 0);   // nodes: BoundedVec<u32>
  off += nodes * 4;
  const [edges] = compact(meta, off);    // edges: BoundedVec<(u32, u32)>

  // --- validators
  const vraw = Buffer.from((await call("state_getStorage", [prefix("Session", "Validators"), at])).slice(2), "hex");
  const [validators] = compact(vraw, 0);

  // --- node descriptors. Not a figure the page prints, but the input the node
  //     map is generated from — so it goes stale the same way, and silently.
  const descriptors = (await allKeys(prefix("MinerRegistry", "NodeDescriptors"), at)).length;

  return {
    chain, genesis, at, height, dflt, descriptors,
    miners: minerKeys.length,
    minersWithWins: withWins,
    validators,
    topologyNodes: nodes,
    topologyEdges: edges,
  };
}

/* ---- --check: has the published snapshot drifted from reality? ------------- */

/*
 * Tolerances, per field, because the fields behave differently.
 *
 * The first version banded the growing counts at ±25% with a floor of 5, and it
 * fired on the first scheduled run that ever genuinely exercised it: 42
 * published against 54 live, over a ±11 band by one. That was not a
 * miscalibration to nudge. It was the wrong shape.
 *
 * Registrations arrive linearly. Reading registered_at off every MinerInfo
 * gives 5-8 new miners per 5,000 blocks, steadily, since block ~25,000 — about
 * 16 a day at ~5.9s blocks. A percentage band is proportional to a base that
 * only moves when someone commits, so time-to-red is (pct x base) / 16 days:
 * 0.9 days at 25% of 58, 1.8 at 50%, 3.6 at 100%. Buying one quiet week needs a
 * band of ±112 against a published 58 — twice the figure it is meant to be
 * checking. No percentage here is both quiet and meaningful; widening only
 * moves the constant, and an alert that fires on ordinary growth is one people
 * learn to mute.
 *
 * So the predicate changed instead of the number. The page never claims to be
 * live: the badge renders the chain, the date and the block height before it
 * renders a single figure. "42 miners on 2026-09-06" is not a lie when there
 * are 58 today — it is a correctly dated fact, and ordinary growth is exactly
 * what that date is there to caveat. What a date cannot excuse is a figure that
 * went BACKWARDS, or a date that is itself old. Those are what this checks now.
 *
 * Governance settings are untouched and still exact: validators and topology
 * move only when someone deliberately moves them, so any movement is news.
 */
const TOLERANCE = {
  // Growth is excused by the date; a drop is not. Mass deregistration inside
  // the age window is real news that an age bound alone would sail past.
  miners: "growth",
  // Drives the node map rather than a printed figure: if this moves, the dots
  // are wrong even though every number on the page still reads correctly.
  descriptors: "growth",
  minersWithWins: "growth",
  validators: "exact",
  topologyNodes: "exact",
  topologyEdges: "exact",
};

// The shrink band, kept at the original constants: a percentage with an
// absolute floor, because a percentage alone is useless on small numbers.
const SHRINK = { pct: 0.25, floor: 5 };

/*
 * How old a published figure may be before it stops being a dated fact and
 * starts being an unmaintained page.
 *
 * This was a fortnight when refreshing was a human chore and the bound had to
 * leave room for one missed week. The refresh runs daily now, so what this
 * measures has changed: the data should never be more than a day old, and two
 * days of it means THE REFRESH JOB ITSELF HAS STOPPED. That is the only failure
 * left worth waking someone for, and it is what this number now watches. Two
 * rather than one so a single skipped run — a runner outage, a bad afternoon at
 * a bootnode — is not an alert.
 *
 * If you find yourself widening this, fix the refresh job instead. Widening it
 * only makes the page quietly stale again, which is the thing that started all
 * of this.
 */
const MAX_AGE_DAYS = 2;

// Which file each field is published in, so the failure can name the file that
// actually has to change and the script that rewrites it. Deriving this from
// the field rather than from the wording of the failure message is deliberate:
// the previous version matched on message prefixes, so rewording a string
// silently repointed the advice at the wrong script.
const SNAPSHOT_FILE = "src/data/network-snapshot.ts";
const NODES_FILE = "src/data/network-nodes.ts";
const FILE_OF = {
  miners: SNAPSHOT_FILE,
  minersWithWins: SNAPSHOT_FILE,
  validators: SNAPSHOT_FILE,
  topologyNodes: SNAPSHOT_FILE,
  topologyEdges: SNAPSHOT_FILE,
  descriptors: NODES_FILE,
};

function readPublished() {
  const src = readFileSync(new URL("../src/data/network-snapshot.ts", import.meta.url), "utf8");
  const nodesSrc = readFileSync(new URL("../src/data/network-nodes.ts", import.meta.url), "utf8");
  const num = (field) => {
    const m = src.match(new RegExp(`${field}\\s*:\\s*(\\d+)`));
    if (!m) throw new Error(`network-snapshot.ts: no numeric field "${field}"`);
    return Number(m[1]);
  };
  const nodeNum = (field) => {
    const m = nodesSrc.match(new RegExp(`${field}\\s*:\\s*(\\d+)`));
    if (!m) throw new Error(`network-nodes.ts: no numeric field "${field}"`);
    return Number(m[1]);
  };
  // Both files carry a takenOn as a plain YYYY-MM-DD, and both are rendered:
  // one in the scale badge, one in the map caption. A missing one is a hard
  // failure rather than an unchecked file — the same call a92c45b made for a
  // missing network-nodes.ts.
  const taken = (text, file) => {
    const m = text.match(/takenOn:\s*"(\d{4}-\d{2}-\d{2})"/);
    if (!m) throw new Error(`${file}: no "takenOn" field`);
    return m[1];
  };
  const chain = src.match(/chain:\s*"([^"]+)"/)?.[1];
  if (!chain) throw new Error(`network-snapshot.ts: no "chain" field`);
  return {
    chain,
    takenOn: taken(src, SNAPSHOT_FILE),
    nodesTakenOn: taken(nodesSrc, NODES_FILE),
    atBlock: num("atBlock"),
    miners: num("miners"),
    minersWithWins: num("minersWithWins"),
    validators: num("validators"),
    topologyNodes: num("topologyNodes"),
    topologyEdges: num("topologyEdges"),
    descriptors: nodeNum("descriptors"),
  };
}

function expectedGenesis() {
  const src = readFileSync(TESTNET, "utf8");
  const m = src.match(/genesis:\s*"(0x[0-9a-fA-F]{64})"/);
  if (!m) throw new Error(`testnet.ts: no genesis hash`);
  return m[1];
}

/* ---- --write: rewrite the snapshot the way recount-nodes.mjs writes its own -- */

/*
 * The file is regenerated whole rather than patched in place. Rewriting five
 * numbers with a regex means five chances to match the wrong line, and the
 * header below is worth keeping in one place — here, next to the code that
 * makes the claims it documents.
 */
function write(f) {
  const genesis = expectedGenesis();
  if (f.genesis.toLowerCase() !== genesis.toLowerCase()) {
    throw new Error(
      `CHAIN CHANGED: genesis is ${f.genesis}, expected ${genesis}. ` +
        `Refusing to publish figures about a chain that is not ours.`,
    );
  }
  const body = `/*
 * A dated snapshot of network-scale figures, read straight from chain storage.
 *
 * Generated by scripts/recount-network.mjs --write. Do not edit by hand — the
 * daily refresh job overwrites this file.
 *
 * Everything here is a REAL measurement, not invented sample data. All of it is
 * in chain storage, reachable through the public bootnode RPC under the \`safe\`
 * method set:
 *
 *   QuantumPow::Miners                  key count            -> miners
 *   QuantumPow::Miners                  proofs_won > 0       -> minersWithWins
 *   Session::Validators                 vec length           -> validators
 *   QuantumPow::RegisteredTopologies[DefaultTopology]        -> topologyNodes
 *                                       nodes/edges lengths     topologyEdges
 *
 * ⚠ Take the topology from \`DefaultTopology\`, NOT from \`MineableTopologies[0]\`.
 * The old figures used index 0, which is storage-hash order and therefore
 * arbitrary. There are currently two mineable topologies differing by a single
 * edge, and index 0 is not the default one — that is where the previous
 * 41,515 came from.
 *
 * Still a snapshot rather than a live read. Counting every miner key is a
 * key-paging scan that grows with the network, and the bootnodes cap connections
 * with no per-IP limit, so doing it once a day in CI is cheap where doing it per
 * visitor is not. Label it as a snapshot wherever it renders, and keep \`chain\`
 * and \`atBlock\` next to the numbers — a stale figure presented as live is worse
 * than no figure.
 */
export const NETWORK_SNAPSHOT = {
  chain: "Aglais",
  takenOn: "${new Date().toISOString().slice(0, 10)}",
  atBlock: ${f.height},
  source: "chain storage, read directly from a public bootnode RPC",
  miners: ${f.miners},
  minersWithWins: ${f.minersWithWins},
  validators: ${f.validators},
  topologyNodes: ${f.topologyNodes},
  topologyEdges: ${f.topologyEdges},
} as const;
`;
  writeFileSync(new URL(`../${SNAPSHOT_FILE}`, import.meta.url), body);
  console.log(`\nwrote ${SNAPSHOT_FILE}`);
}

async function check() {
  const published = readPublished();
  const live = await withFailover(readFigures);
  const failures = [];

  console.log(`published : ${published.chain} @ block ${published.atBlock.toLocaleString("en-US")}`);
  console.log(`live      : ${live.chain} @ block ${live.height.toLocaleString("en-US")}\n`);

  // A reset makes every figure meaningless regardless of drift, so check it
  // first and say so plainly — this is the exact failure that went unnoticed
  // for a month last time.
  const want = expectedGenesis();
  if (live.genesis.toLowerCase() !== want.toLowerCase()) {
    failures.push({
      field: "CHAIN",
      // A reset invalidates both files, so it names neither and claims both.
      file: null,
      message:
        `CHAIN CHANGED: genesis is ${live.genesis}, expected ${want}. ` +
        `Every figure below describes a chain that is no longer here.`,
    });
  }

  for (const [field, tol] of Object.entries(TOLERANCE)) {
    const was = published[field];
    const now = live[field];
    const delta = now - was;
    let bad, limit;
    if (tol === "exact") {
      bad = delta !== 0;
      limit = "exact";
    } else {
      const allowed = Math.max(SHRINK.floor, Math.abs(was) * SHRINK.pct);
      bad = delta < 0 && Math.abs(delta) > allowed;
      limit = `growth ok, drop >${allowed.toFixed(0)}`;
    }
    const sign = delta > 0 ? `+${delta}` : `${delta}`;
    console.log(
      `  ${bad ? "DROP " : "ok   "} ${field.padEnd(15)} published ${String(was).padStart(6)}` +
        `   live ${String(now).padStart(6)}   ${sign.padStart(7)}  (${limit})`,
    );
    if (bad) {
      failures.push({
        field,
        file: FILE_OF[field],
        message: `${field}: published ${was}, live ${now} (${sign}, ${limit})`,
      });
    }
  }

  // Age is what carries the caveat now that growth does not fail, so it is the
  // check that has to be right. Both dates are UTC midnight, which is what the
  // generators write and what the badges render.
  console.log("");
  for (const [file, when] of [
    [SNAPSHOT_FILE, published.takenOn],
    [NODES_FILE, published.nodesTakenOn],
  ]) {
    const age = Math.floor((Date.now() - Date.parse(`${when}T00:00:00Z`)) / 86_400_000);
    const bad = age > MAX_AGE_DAYS;
    console.log(
      `  ${bad ? "STALE" : "ok   "} ${"age".padEnd(15)} ${file.padEnd(28)}` +
        ` taken ${when}  ${String(age).padStart(3)}d  (max ${MAX_AGE_DAYS}d)`,
    );
    if (bad) {
      failures.push({
        field: "age",
        file,
        message: `${file}: taken ${when}, ${age} days old (max ${MAX_AGE_DAYS})`,
      });
    }
  }

  if (failures.length) {
    // A reset claims both files; otherwise name only the ones that have to
    // change, so "which of two scripts fixes this" is never a question the
    // reader has to work out for themselves.
    const reset = failures.some((f) => f.field === "CHAIN");
    const files = reset
      ? [SNAPSHOT_FILE, NODES_FILE]
      : [...new Set(failures.map((f) => f.file))];
    console.error(
      `\nsnapshot drift — ${files.join(" and ")} ${files.length > 1 ? "are" : "is"} out of date:\n`,
    );
    for (const f of failures) console.error(`  - ${f.message}`);
    console.error("\nRefresh with:");
    if (files.includes(SNAPSHOT_FILE))
      console.error(`  node scripts/recount-network.mjs --write   # rewrites ${SNAPSHOT_FILE}`);
    if (files.includes(NODES_FILE))
      console.error(`  node scripts/recount-nodes.mjs     # rewrites ${NODES_FILE}`);
    console.error("");
    process.exit(1);
  }
  console.log(`\nrecount-network: published figures still current`);
}

async function main() {
  if (process.argv.includes("--self-test")) return selfTest();
  selfTest();
  if (process.argv.includes("--check")) return check();

  const f = await withFailover(readFigures);
  if (process.argv.includes("--write")) return write(f);
  console.log(`\nchain    ${f.chain}`);
  console.log(`genesis  ${f.genesis}`);
  console.log(`at block ${f.height.toLocaleString("en-US")}  ${f.at}\n`);
  console.log("Paste into src/data/network-snapshot.ts:\n");
  console.log(`  chain: "Aglais",`);
  console.log(`  takenOn: "${new Date().toISOString().slice(0, 10)}",`);
  console.log(`  atBlock: ${f.height},`);
  console.log(`  source: "chain storage, read directly from a public bootnode RPC",`);
  console.log(`  miners: ${f.miners},`);
  console.log(`  minersWithWins: ${f.minersWithWins},`);
  console.log(`  validators: ${f.validators},`);
  console.log(`  topologyNodes: ${f.topologyNodes},`);
  console.log(`  topologyEdges: ${f.topologyEdges},`);
  console.log(`\n  (default topology ${f.dflt.slice(0, 12)}…)`);
}

process.on("unhandledRejection", (err) => {
  console.error("recount-network: unhandled rejection —", err);
  process.exit(1);
});

main().catch((err) => {
  console.error("recount-network:", err.message);
  process.exit(1);
});
