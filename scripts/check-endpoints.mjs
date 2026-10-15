#!/usr/bin/env node
/*
 * Offline guard against endpoint drift. Runs as `prebuild`, so it executes
 * inside the Netlify build: a reintroduced dead endpoint fails the deploy
 * instead of shipping to a live developer portal.
 *
 * Why this exists. src/sections/BuildWithAi.astro carried a comment claiming
 * its agent prompt was built from shared constants "so it cannot drift from the
 * facts shown in the Network panel" — three lines above a hard-coded explorer
 * URL. The URL outlived the chain it pointed at, and the portal served it to
 * coding agents for weeks. One-line fixes do not survive; a build gate does.
 *
 * DELIBERATELY OFFLINE. No network, no clock, no randomness. This gate must
 * never fail because a third party is having a bad day — that job belongs to
 * scripts/check-links.mjs, which runs on a schedule and gates nothing.
 *
 * Usage:
 *   node scripts/check-endpoints.mjs            scan src/ and README.md
 *   node scripts/check-endpoints.mjs --dist     scan the built dist/ output
 *   node scripts/check-endpoints.mjs --self-test  prove the guard still bites
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

/*
 * Strings that must never appear. Exact substrings, not patterns.
 *
 * TWO NEAR-MISSES ARE DELIBERATELY ABSENT FROM THIS LIST. Do not "tighten" it
 * by adding them — either one turns every future build red, rollbacks included:
 *
 *   "20049"              is the Substrate RPC PORT, and it is correct. It is
 *                        NOT a chain ID; QUI-974 tracks the drift where 0x4e51
 *                        (20049) leaked into docs as one. The chain ID is
 *                        20033 / 0x4e41. Ban the hex, never the decimal.
 *   "nodes.quip.network" on its own is a legitimate GitLab repo name, used at
 *                        src/data/links.ts (CODE.nodeServer) and in the
 *                        Quickstart clone command. Only the dead HTTP host path
 *                        is banned, which is why the entry below carries the
 *                        "/chain-specs" suffix.
 */
const BANNED = [
  {
    text: "testnet.quip.network",
    why: "retired zone; explorer/evm-rpc/faucet are NXDOMAIN and the bootnodes serve the old chain",
  },
  {
    text: "nodes.quip.network/chain-specs",
    why: "that host fails its TLS handshake; the spec lives in GitLab (CHAIN.chainSpecUrl)",
  },
  { text: "forecaster.quip.network", why: "NXDOMAIN; use warpcast.com/quipnetwork.eth" },
  { text: "0x4e51", why: "20049 as hex is the RPC port, not a chain ID; chain ID is 0x4e41" },
  {
    text: "985665",
    why: "the retired chain's first EVM block; on aglais pallet-revive is in genesis, so EVM starts at block 0",
  },
];

/*
 * The other half of the gate. Without these, a refactor that deletes the
 * endpoints altogether passes cleanly — "no banned strings" is not the same
 * claim as "the right endpoints are present."
 */
const REQUIRED = [
  { text: "aglais.quip.network", min: 5, why: "the live zone" },
  {
    text: "0x542a9915acf840b8940d35ca6de242f669a0c6e3b40f9a8d8c14b9bf7b8ebecb",
    min: 1,
    why: "genesis hash — the only reliable way to tell this chain from the retired one",
  },
  { text: "0x4e41", min: 1, why: "EVM chain ID 20033 in hex" },
];

const SOURCE_EXT = new Set([".ts", ".tsx", ".astro", ".mjs", ".js", ".md", ".json"]);
const SKIP_DIRS = new Set(["node_modules", ".git", ".astro", ".netlify", "dist"]);

function walk(dir, keep, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, keep, out);
    else if (keep(full)) out.push(full);
  }
  return out;
}

function scan(files) {
  const violations = [];
  const counts = new Map(REQUIRED.map((r) => [r.text, 0]));

  for (const file of files) {
    const body = readFileSync(file, "utf8");
    const lines = body.split("\n");

    for (const rule of BANNED) {
      lines.forEach((line, i) => {
        if (line.includes(rule.text)) {
          violations.push(
            `${file.replace(ROOT, "")}:${i + 1}  banned "${rule.text}" — ${rule.why}\n      ${line.trim().slice(0, 120)}`,
          );
        }
      });
    }

    for (const rule of REQUIRED) {
      const hits = body.split(rule.text).length - 1;
      counts.set(rule.text, counts.get(rule.text) + hits);
    }
  }

  for (const rule of REQUIRED) {
    const found = counts.get(rule.text);
    if (found < rule.min) {
      violations.push(
        `MISSING  "${rule.text}" appears ${found}x, expected at least ${rule.min} — ${rule.why}`,
      );
    }
  }

  return violations;
}

/*
 * The guard has to guard itself. A refactor that broke the matcher would
 * otherwise turn this into a no-op that reports success forever, which is worse
 * than having no gate at all — it looks like coverage.
 */
function selfTest() {
  const good = BANNED.every((r) => !"aglais.quip.network 0x4e41".includes(r.text));
  const bites = BANNED.some((r) =>
    "https://explorer.testnet.quip.network".includes(r.text),
  );
  const walkWorks = walk(join(ROOT, "src"), (f) => SOURCE_EXT.has(extname(f))).length > 0;

  const results = [
    ["clean string passes", good],
    ["dead endpoint is caught", bites],
    ["file walk finds sources", walkWorks],
  ];
  for (const [name, pass] of results) {
    console.log(`  ${pass ? "ok  " : "FAIL"} ${name}`);
  }
  if (!results.every(([, pass]) => pass)) {
    console.error("\ncheck-endpoints: SELF-TEST FAILED — the guard is not working");
    process.exit(1);
  }
  console.log("\ncheck-endpoints: self-test passed");
}

function main() {
  const args = process.argv.slice(2);

  if (args.includes("--self-test")) {
    selfTest();
    return;
  }

  const dist = args.includes("--dist");
  let files;

  if (dist) {
    files = walk(join(ROOT, "dist"), (f) =>
      [".html", ".js", ".txt", ".json", ".xml"].includes(extname(f)),
    );
  } else {
    files = [
      ...walk(join(ROOT, "src"), (f) => SOURCE_EXT.has(extname(f))),
      join(ROOT, "README.md"),
    ];
  }

  // Fail closed: an empty file list means the walk broke, not that all is well.
  if (files.length === 0) {
    console.error(
      `check-endpoints: found 0 files to scan${dist ? " in dist/ (did the build run?)" : ""} — refusing to report success`,
    );
    process.exit(1);
  }

  const violations = scan(files);

  if (violations.length > 0) {
    console.error(`\ncheck-endpoints: ${violations.length} problem(s) in ${files.length} files\n`);
    for (const v of violations) console.error(`  ${v}`);
    console.error("");
    process.exit(1);
  }

  console.log(
    `check-endpoints: ${files.length} files clean${dist ? " (dist)" : ""} — no retired endpoints, all required values present`,
  );
}

process.on("unhandledRejection", (err) => {
  console.error("check-endpoints: unhandled rejection —", err);
  process.exit(1);
});

try {
  main();
} catch (err) {
  console.error("check-endpoints: crashed —", err);
  process.exit(1);
}
