#!/usr/bin/env node
/*
 * The XQuad book's URLs, against a running site:
 *
 *   node scripts/check-xquad-urls.mjs [origin]
 *
 * 1. Every URL the old mdBook site published (scripts/xquad-urls.txt) answers 200, or a
 *    single 301 to a 200.
 * 2. Every page and Markdown twin in public/docs/xquad/llms.txt answers 200.
 * 3. Every link between book pages reaches a page, and its #fragment exists there.
 *
 * Zero dependencies, like check-parity.mjs. Exits non-zero on any failure.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

const ORIGIN = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const root = path.resolve(import.meta.dirname, "..");
const CONCURRENCY = 8;

const published = readFileSync(path.join(root, "scripts/xquad-urls.txt"), "utf8")
  .split("\n")
  .filter((line) => line && !line.startsWith("#"));
const twins = [...readFileSync(path.join(root, "public/docs/xquad/llms.txt"), "utf8").matchAll(/\]\(https:\/\/developers\.quip\.network(\/[^)]+)\)/g)].map((m) => m[1]);
const pages = twins.map((twin) => twin.replace(/\.md$/, ""));

const probe = (url) => fetch(ORIGIN + url, { redirect: "manual" });

async function inParallel(items, run) {
  const results = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await run(items[index]);
      }
    }),
  );
  return results;
}

const failures = [];

// 1. The old site's URLs.
await inParallel(published, async (url) => {
  const first = await probe(url);
  if (first.status === 200) return;
  if (first.status !== 301) return failures.push(`${url}: answered ${first.status}`);
  const location = first.headers.get("location").replace(ORIGIN, "");
  const second = await probe(location);
  if (second.status !== 200) failures.push(`${url}: 301 to ${location}, which answered ${second.status}`);
});

// 2. Pages and twins, keeping the pages' HTML for the link check.
const html = new Map();
await inParallel(pages, async (url) => {
  const response = await probe(url);
  if (response.status !== 200) return failures.push(`${url}: answered ${response.status}`);
  html.set(url, await response.text());
});
await inParallel(twins, async (url) => {
  const response = await probe(url);
  const type = response.headers.get("content-type") ?? "";
  if (response.status !== 200 || !type.startsWith("text/markdown")) failures.push(`${url}: answered ${response.status} ${type}`);
});

// 3. Links between pages, fragments included. Only the article, not the sidebar.
const idsOf = (page) => new Set([...page.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
let links = 0;
for (const [url, page] of html) {
  const article = page.slice(page.indexOf('<div class="prose'));
  for (const [, href] of article.matchAll(/href="((?:\/docs\/xquad[^"]*)|(?:#[^"]*))"/g)) {
    const [target, fragment] = href.split("#");
    if (target.endsWith(".md")) continue; // The page's own twin, in the footer; checked above.
    links += 1;
    const pathname = target || url;
    const body = html.get(pathname);
    if (body === undefined) failures.push(`${url}: link to ${href}, which is not a page in the book`);
    else if (fragment && !idsOf(body).has(decodeURIComponent(fragment))) failures.push(`${url}: link to ${href}, no such anchor`);
  }
}

for (const failure of failures) console.log(`FAIL ${failure}`);
console.log(`${published.length} published URLs, ${pages.length} pages, ${twins.length} twins, ${links} internal links checked: ${failures.length} failed.`);
process.exit(failures.length ? 1 : 0);
