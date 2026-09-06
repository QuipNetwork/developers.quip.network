#!/usr/bin/env node
/*
 * Build the node map's data from the chain: read MinerRegistry::NodeDescriptors,
 * take each operator's published host, and resolve it to a CITY.
 *
 * Writes src/data/network-nodes.ts. Unlike recount-network.mjs this writes the
 * file rather than printing it, because it is ~35 entries rather than five
 * numbers — the review still happens, in the diff.
 *
 * Usage:  node scripts/recount-nodes.mjs             rewrite the data file
 *         node scripts/recount-nodes.mjs --dry-run   print, change nothing
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

import { writeFileSync } from "node:fs";
import { setDefaultResultOrder, promises as dns } from "node:dns";
import {
  setDefaultAutoSelectFamily,
  setDefaultAutoSelectFamilyAttemptTimeout,
} from "node:net";
import { isIP } from "node:net";

setDefaultResultOrder("ipv4first");
setDefaultAutoSelectFamily(true);
setDefaultAutoSelectFamilyAttemptTimeout(500);

const RPC = process.env.QUIP_RPC ?? "https://bootnode-1.aglais.quip.network:20049/rpc";
/*
 * ipwho.is: HTTPS, no account, no key. Chosen over ip-api.com, whose free tier
 * is HTTP-only — sending operator addresses over plaintext to a third party to
 * build a public map is not a trade worth making. Swap freely: the output is a
 * committed file, so nothing at runtime depends on this service existing.
 */
const GEO = (ip) => `https://ipwho.is/${ip}?fields=success,city,country_code,latitude,longitude`;

const OUT = new URL("../src/data/network-nodes.ts", import.meta.url);

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

/* ---- geo ------------------------------------------------------------------- */

const CITY_DP = 2; // ~1 km. See the granularity note at the top of this file.

async function locate(ip) {
  const res = await fetch(GEO(ip), { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) return null;
  const j = await res.json();
  if (!j?.success || !j.city || typeof j.latitude !== "number") return null;
  return {
    city: j.city,
    country: j.country_code,
    lat: Number(j.latitude.toFixed(CITY_DP)),
    lng: Number(j.longitude.toFixed(CITY_DP)),
  };
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

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const at = await call("chain_getBlockHash");
  const height = Number.parseInt((await call("chain_getHeader"))?.number, 16);
  const chain = await call("system_chain");
  console.log(`${chain} @ block ${height.toLocaleString("en-US")}\n`);

  const pfx = prefix("MinerRegistry", "NodeDescriptors");
  const keys = [];
  let start = null;
  for (;;) {
    const page = await call("state_getKeysPaged", [pfx, 1000, start, at]);
    keys.push(...page);
    if (page.length < 1000) break;
    start = page[page.length - 1];
  }

  const descriptors = [];
  for (let i = 0; i < keys.length; i += 32) {
    const [{ changes }] = await call("state_queryStorageAt", [keys.slice(i, i + 32), at]);
    for (const [, v] of changes) {
      if (v) descriptors.push(decode(Buffer.from(v.slice(2), "hex")));
    }
  }
  console.log(`descriptors      ${descriptors.length}`);

  // Resolve DNS hosts to an address so they can be placed too.
  let skippedNoHost = 0, skippedPrivate = 0, skippedUnlocatable = 0;
  const placed = [];
  const cache = new Map();

  for (const d of descriptors) {
    if (!d.host) { skippedNoHost++; continue; }
    let ip = d.host.trim();
    if (isIP(ip) === 0) {
      try { ip = (await dns.resolve4(ip))[0]; } catch { skippedUnlocatable++; continue; }
    }
    if (!isPublicIPv4(ip)) { skippedPrivate++; continue; }

    if (!cache.has(ip)) cache.set(ip, await locate(ip));
    const loc = cache.get(ip);
    if (!loc) { skippedUnlocatable++; continue; }

    const kind = d.kinds
      .map((k) => TO_MAP_KIND[k])
      .reduce((a, b) => (RANK[b] > RANK[a] ? b : a), "CPU");
    placed.push({ ...loc, kind });
  }

  const cities = new Set(placed.map((p) => `${p.city}, ${p.country}`));
  console.log(`placed           ${placed.length}`);
  console.log(`  no host        ${skippedNoHost}`);
  console.log(`  private range  ${skippedPrivate}`);
  console.log(`  unlocatable    ${skippedUnlocatable}`);
  console.log(`distinct cities  ${cities.size}`);
  const byKind = placed.reduce((a, p) => ((a[p.kind] = (a[p.kind] ?? 0) + 1), a), {});
  console.log(`by kind          ${JSON.stringify(byKind)}`);

  if (!placed.length) throw new Error("no nodes could be placed — refusing to write an empty map");

  placed.sort((a, b) => a.city.localeCompare(b.city) || a.kind.localeCompare(b.kind));

  const body = `/*
 * Real node positions, generated by scripts/recount-nodes.mjs. Do not edit by
 * hand — rerun the script.
 *
 * Source: MinerRegistry::NodeDescriptors on ${chain}, block ${height}, read
 * through the public bootnode RPC. Each operator publishes its own host on
 * chain; this places that host at its CITY, never at a finer position, and
 * every node in a city shares one identical point.
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
