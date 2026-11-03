#!/usr/bin/env node
/*
 * URL parity: every URL the live site serves must answer the same way on the new one.
 * Compares status, redirect target, content type, X-Robots-Tag and, for the agent files,
 * the exact bytes.
 *
 *   node scripts/check-parity.mjs [new origin] [reference origin]
 *
 * Zero dependencies, like check-links.mjs. Exits non-zero on any difference.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

const NEW = process.argv[2] ?? "http://localhost:3000";
const OLD = process.argv[3] ?? "https://developers.quip.network";
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
  "/fonts/ABCFavoritVariable.woff2", "/images/quip-logo-with-icon.svg",
  ...twins, ...pages, ...redirects,
];
const exactBytes = (url) => url.endsWith(".md") || url.endsWith(".txt");
// Differences the new site intends: an empty /robots.txt rule set stays, the book is unchanged.
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
  const problems = [];
  if (before.status !== after.status) problems.push(`status ${before.status} -> ${after.status}`);
  if (before.location !== after.location) problems.push(`location ${before.location} -> ${after.location}`);
  if (before.status === 200 && before.type !== after.type) problems.push(`type ${before.type} -> ${after.type}`);
  if (before.robots !== after.robots) problems.push(`x-robots-tag ${before.robots} -> ${after.robots}`);
  if (before.body !== null && before.status === 200 && before.body !== after.body) problems.push("body differs");
  if (problems.length) {
    failures += 1;
    console.log(`DIFF ${url}: ${problems.join("; ")}`);
  }
}
console.log(`${[...new Set(urls)].length} URLs checked against ${OLD}, ${failures} differ.`);
process.exit(failures ? 1 : 0);
