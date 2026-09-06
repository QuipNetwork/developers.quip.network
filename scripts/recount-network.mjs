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
 * Usage:  node scripts/recount-network.mjs            print the figures
 *         node scripts/recount-network.mjs --self-test  verify key derivation
 *
 * It only prints. Paste the result into src/data/network-snapshot.ts, so that
 * changing a published number stays a reviewed commit rather than a silent
 * build-time fetch.
 *
 * Zero dependencies, like the other scripts here.
 */

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

async function main() {
  if (process.argv.includes("--self-test")) return selfTest();
  selfTest();

  // Pin every read to ONE block, or the figures can disagree with each other.
  const at = await call("chain_getBlockHash");
  const height = Number.parseInt((await call("chain_getHeader"))?.number, 16);
  const chain = await call("system_chain");
  const genesis = await call("chain_getBlockHash", [0]);
  console.log(`\nchain    ${chain}`);
  console.log(`genesis  ${genesis}`);
  console.log(`at block ${height.toLocaleString("en-US")}  ${at}\n`);

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

  const today = new Date().toISOString().slice(0, 10);
  console.log("Paste into src/data/network-snapshot.ts:\n");
  console.log(`  chain: "Aglais",`);
  console.log(`  takenOn: "${today}",`);
  console.log(`  atBlock: ${height},`);
  console.log(`  source: "chain storage, read directly from a public bootnode RPC",`);
  console.log(`  miners: ${minerKeys.length},`);
  console.log(`  minersWithWins: ${withWins},`);
  console.log(`  validators: ${validators},`);
  console.log(`  topologyNodes: ${nodes},`);
  console.log(`  topologyEdges: ${edges},`);
  console.log(`\n  (default topology ${dflt.slice(0, 12)}…)`);
}

process.on("unhandledRejection", (err) => {
  console.error("recount-network: unhandled rejection —", err);
  process.exit(1);
});

main().catch((err) => {
  console.error("recount-network:", err.message);
  process.exit(1);
});
