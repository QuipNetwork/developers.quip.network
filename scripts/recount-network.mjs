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
 *         node scripts/recount-network.mjs --check      fail if the published
 *                                                      snapshot has drifted
 *         node scripts/recount-network.mjs --self-test  verify key derivation
 *
 * --check runs daily in CI. It never rewrites anything: it tells you the page
 * has gone stale and leaves the fix to a reviewed commit.
 *
 * It only prints. Paste the result into src/data/network-snapshot.ts, so that
 * changing a published number stays a reviewed commit rather than a silent
 * build-time fetch.
 *
 * Zero dependencies, like the other scripts here.
 */

import { readFileSync } from "node:fs";
import { setDefaultResultOrder } from "node:dns";
import {
  setDefaultAutoSelectFamily,
  setDefaultAutoSelectFamilyAttemptTimeout,
} from "node:net";
setDefaultResultOrder("ipv4first");
setDefaultAutoSelectFamily(true);
setDefaultAutoSelectFamilyAttemptTimeout(500);

const RPC = process.env.QUIP_RPC ?? "https://bootnode-1.aglais.quip.network:20049/rpc";

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

  return {
    chain, genesis, at, height, dflt,
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
 * Miner counts grow on their own, so they get a band. Validators and topology
 * are governance settings that change only when someone deliberately changes
 * them — any movement there is news, so they are exact.
 *
 * The band is a percentage with an absolute floor, because a percentage alone
 * is useless on small numbers: at 42 miners a strict 10% would red on four new
 * miners, and an alert that fires on ordinary growth is one people mute. The
 * floor is what keeps this quiet enough to stay believed.
 */
const TOLERANCE = {
  miners: { pct: 0.25, floor: 5 },
  minersWithWins: { pct: 0.25, floor: 5 },
  validators: "exact",
  topologyNodes: "exact",
  topologyEdges: "exact",
};

function readPublished() {
  const src = readFileSync(new URL("../src/data/network-snapshot.ts", import.meta.url), "utf8");
  const num = (field) => {
    const m = src.match(new RegExp(`${field}\\s*:\\s*(\\d+)`));
    if (!m) throw new Error(`network-snapshot.ts: no numeric field "${field}"`);
    return Number(m[1]);
  };
  const chain = src.match(/chain:\s*"([^"]+)"/)?.[1];
  if (!chain) throw new Error(`network-snapshot.ts: no "chain" field`);
  return {
    chain,
    atBlock: num("atBlock"),
    miners: num("miners"),
    minersWithWins: num("minersWithWins"),
    validators: num("validators"),
    topologyNodes: num("topologyNodes"),
    topologyEdges: num("topologyEdges"),
  };
}

function expectedGenesis() {
  const src = readFileSync(new URL("../src/data/testnet.ts", import.meta.url), "utf8");
  const m = src.match(/genesis:\s*"(0x[0-9a-fA-F]{64})"/);
  if (!m) throw new Error(`testnet.ts: no genesis hash`);
  return m[1];
}

async function check() {
  const published = readPublished();
  const live = await readFigures();
  const failures = [];

  console.log(`published : ${published.chain} @ block ${published.atBlock.toLocaleString("en-US")}`);
  console.log(`live      : ${live.chain} @ block ${live.height.toLocaleString("en-US")}\n`);

  // A reset makes every figure meaningless regardless of drift, so check it
  // first and say so plainly — this is the exact failure that went unnoticed
  // for a month last time.
  const want = expectedGenesis();
  if (live.genesis.toLowerCase() !== want.toLowerCase()) {
    failures.push(
      `CHAIN CHANGED: genesis is ${live.genesis}, expected ${want}. ` +
        `Every figure below describes a chain that is no longer here.`,
    );
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
      const allowed = Math.max(tol.floor, Math.abs(was) * tol.pct);
      bad = Math.abs(delta) > allowed;
      limit = `±${allowed.toFixed(0)}`;
    }
    const sign = delta > 0 ? `+${delta}` : `${delta}`;
    console.log(
      `  ${bad ? "DRIFT" : "ok   "} ${field.padEnd(15)} published ${String(was).padStart(6)}` +
        `   live ${String(now).padStart(6)}   ${sign.padStart(7)}  (allowed ${limit})`,
    );
    if (bad) failures.push(`${field}: published ${was}, live ${now} (${sign}, allowed ${limit})`);
  }

  if (failures.length) {
    console.error(`\nsnapshot drift — src/data/network-snapshot.ts is out of date:\n`);
    for (const f of failures) console.error(`  - ${f}`);
    console.error(
      `\nRefresh with:  node scripts/recount-network.mjs\n` +
        `then paste the printed block into src/data/network-snapshot.ts and commit.\n`,
    );
    process.exit(1);
  }
  console.log(`\nrecount-network: published figures still within tolerance`);
}

async function main() {
  if (process.argv.includes("--self-test")) return selfTest();
  selfTest();
  if (process.argv.includes("--check")) return check();

  const f = await readFigures();
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
