#!/usr/bin/env node
/*
 * URL parity: every URL the live site serves must answer the same way on the new one.
 * Compares status, redirect target, content type, X-Robots-Tag and, for the agent files,
 * the exact bytes.
 *
 *   node scripts/check-parity.mjs [new origin] [reference origin] [--staging]
 *
 * --staging accepts the noindex staging adds to every URL.
 *
 * Zero dependencies, like check-links.mjs. Exits non-zero on any difference.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const STAGING = args.includes("--staging");
const [NEW = "http://localhost:3000", OLD = "https://developers.quip.network"] = args.filter((arg) => arg !== "--staging");
const root = path.resolve(import.meta.dirname, "..");

// The docs' own index lists every page; the redirects come from next.config.mjs.
const llms = readFileSync(path.join(root, "public/docs/llms.txt"), "utf8");
const twins = [...llms.matchAll(/\]\(https:\/\/developers\.quip\.network(\/[^)]+)\)/g)].map((m) => m[1]);
const pages = twins.map((t) => (t === "/docs.md" ? "/docs" : t.replace(/\.md$/, "")));
const config = readFileSync(path.join(root, "next.config.mjs"), "utf8");
const redirects = [...config.matchAll(/moved\("([^"]+)"/g)].map((m) => m[1]).filter((u) => u !== "/sitemap-index.xml");

const urls = [
  "/", "/llms.txt", "/robots.txt",
  "/docs/llms.txt", "/docs/llms-full.txt",
  "/docs/", "/docs/getting-started/quickstart/",
  "/docs/xquad", "/docs/xquad/", "/docs/xquad/index.html",
  "/sg", "/sg/", "/sg/index.html",
  "/fonts/ABCFavoritVariable.woff2", "/images/quip-logo-with-icon.svg",
  ...twins, ...pages, ...redirects,
];
const exactBytes = (url) => url.endsWith(".md") || url.endsWith(".txt");
// Differences the new site intends. The XQuad book was static mdBook output, whose relative
// links needed a folder URL ending in "/". It is now real pages, under the same rule as every
// other URL: no trailing slash. scripts/check-xquad-urls.mjs covers the rest of the book.
const INTENDED = new Map([
  ["/docs/xquad", { status: 200, location: null }],
  ["/docs/xquad/", { status: 301, location: "/docs/xquad" }],
  ["/docs/xquad/index.html", { status: 301, location: "/docs/xquad" }],
  // The Singapore guest pass is retired; old links land on the home page.
  ["/sg", { status: 301, location: "/" }],
  ["/sg/", { status: 301, location: "/" }],
  ["/sg/index.html", { status: 301, location: "/" }],
]);
// Text the new site changed on purpose. Anything else in these bodies still has to match.
const QVM_EDIT = ["XQuad compiles quadratic", "XQuad is the toolchain for building on the Quip Virtual Machine (QVM). It compiles quadratic"];
const TEXT_EDITS = new Map([
  ["/docs/xquad-toolchain.md", QVM_EDIT],
  ["/docs/llms-full.txt", QVM_EDIT],
]);
const stripCharset = (type) => (type ?? "").split(";")[0].trim().toLowerCase();

async function probe(origin, url) {
  const response = await fetch(origin + url, { redirect: "manual" });
  const location = response.headers.get("location");
  return {
    status: response.status,
    location: location ? location.replace(origin, "") : null,
    type: stripCharset(response.headers.get("content-type")),
    robots: response.headers.get("x-robots-tag"),
    body: exactBytes(url) ? await response.text() : null,
  };
}

let failures = 0;
for (const url of [...new Set(urls)]) {
  const [before, after] = await Promise.all([probe(OLD, url), probe(NEW, url)]);
  const intended = INTENDED.get(url);
  if (intended) {
    if (after.status === intended.status && after.location === intended.location) {
      console.log(`INTENDED ${url}: status ${before.status} -> ${after.status}, location ${before.location} -> ${after.location}`);
    } else {
      failures += 1;
      console.log(`DIFF ${url}: expected ${intended.status} ${intended.location}, got ${after.status} ${after.location}`);
    }
    continue;
  }
  const problems = [];
  if (before.status !== after.status) problems.push(`status ${before.status} -> ${after.status}`);
  if (before.location !== after.location) problems.push(`location ${before.location} -> ${after.location}`);
  if (before.status === 200 && before.type !== after.type) problems.push(`type ${before.type} -> ${after.type}`);
  if (before.robots !== after.robots && !(STAGING && after.robots === "noindex")) problems.push(`x-robots-tag ${before.robots} -> ${after.robots}`);
  const expected = TEXT_EDITS.has(url) ? before.body?.replace(...TEXT_EDITS.get(url)) : before.body;
  if (before.body !== null && before.status === 200 && expected !== after.body) problems.push("body differs");
  if (problems.length) {
    failures += 1;
    console.log(`DIFF ${url}: ${problems.join("; ")}`);
  }
}
console.log(`${[...new Set(urls)].length} URLs checked against ${OLD}, ${failures} differ.`);
process.exit(failures ? 1 : 0);
