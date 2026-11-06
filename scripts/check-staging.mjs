#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
/*
 * The acceptance suite: is every function of a running copy of the site working?
 *
 *   npm run check:staging -- https://developers-staging.quip.network
 *   npm run check:staging -- https://developers.quip.network --production --reference <netlify URL>
 *
 * Runs the other checks, then what they leave out: every MCP tool, Markdown for every page,
 * search engine signals, not-found pages, caching and redirects. Needs a synced content/docs.
 */
import { spawnSync } from "node:child_process";
import { get as getHttp } from "node:http";
import { get as getHttps } from "node:https";

const args = process.argv.slice(2);
const PRODUCTION = args.includes("--production");
const referenceAt = args.indexOf("--reference");
const reference = referenceAt >= 0 ? args[referenceAt + 1] : undefined;
const base = (args.find((arg, index) => !arg.startsWith("--") && (referenceAt < 0 || index !== referenceAt + 1)) ?? "").replace(/\/$/, "");
if (!base) {
  console.error("usage: check-staging.mjs <url> [--production] [--reference <origin>]");
  process.exit(2);
}
const SITE = "https://developers.quip.network";
const PAGE_CHARS = 40_000;

const at = (path, init) => fetch(`${base}${path}`, { redirect: "manual", signal: AbortSignal.timeout(30_000), ...init });
const pathOf = (url) => new URL(url, SITE).pathname + new URL(url, SITE).search;

let failed = 0;
function fail(group, detail) {
  failed += 1;
  console.error(`FAIL  ${group}: ${detail}`);
}
async function group(name, run) {
  const before = failed;
  try {
    await run((detail) => fail(name, detail));
  } catch (error) {
    fail(name, error.message);
  }
  if (failed === before) console.log(`ok    ${name}`);
}

/** Runs in parallel, a few at a time, so a small server is not the thing under test. */
async function each(items, work, width = 6) {
  let next = 0;
  await Promise.all(Array.from({ length: width }, async () => {
    while (next < items.length) await work(items[next++]);
  }));
}

function script(name, ...rest) {
  const { status } = spawnSync(process.execPath, [`scripts/${name}`, ...rest], { stdio: ["ignore", "ignore", "inherit"] });
  if (status !== 0) fail(name, `exited ${status}; run it alone for the detail`);
  else console.log(`ok    ${name}`);
}

let id = 10;
async function rpc(method, params) {
  id += 1;
  const response = await at("/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
  });
  return { status: response.status, body: await response.json() };
}
const tool = async (name, input) => (await rpc("tools/call", { name, arguments: input })).body.result;

script("smoke.mjs", base);
script("check-parity.mjs", base, ...(reference ? [reference] : []), ...(PRODUCTION ? [] : ["--staging"]));
script("check-xquad-urls.mjs", base);
script("check-diagrams.mjs", "--base", base);

const pages = JSON.parse((await tool("list_pages", {})).content[0].text);
const twins = new Map();

await group(`Markdown for all ${pages.length} pages`, async (bad) => {
  let noVary = 0;
  await each(pages, async (page) => {
    const twinPath = pathOf(page.markdown_url);
    const twin = await at(twinPath);
    if (twin.status !== 200) return bad(`${twinPath} answered ${twin.status}`);
    const text = await twin.text();
    twins.set(page.url, text);
    const negotiated = await at(pathOf(page.url), { headers: { Accept: "text/markdown" } });
    if (!negotiated.headers.get("content-type")?.startsWith("text/markdown")) return bad(`${page.url} gave no Markdown`);
    if ((await negotiated.text()) !== text) bad(`${page.url}: negotiated body differs from ${twinPath}`);
    if (!negotiated.headers.get("vary")?.toLowerCase().includes("accept")) bad(`${page.url}: Markdown without Vary: Accept`);
    const html = await at(pathOf(page.url), { headers: { Accept: "text/html" } });
    if (!html.headers.get("content-type")?.startsWith("text/html")) bad(`${page.url}: HTML was not preferred`);
    if (!/(^|,\s*)accept(,|$)/i.test(html.headers.get("vary") ?? "")) noVary += 1;
  });
  if (noVary) bad(`${noVary} pages of HTML lack Vary: Accept, which Caddy adds (deploy/host/Caddyfile)`);
});

await group("MCP tools", async (bad) => {
  const hits = JSON.parse((await tool("search_docs", { query: "validator", limit: 2 })).content[0].text);
  if (hits.length !== 2) bad(`limit 2 returned ${hits.length}`);
  const none = await tool("search_docs", { query: "zzqqxxnothing" });
  if (none.isError || !none.content[0].text.startsWith("No pages match")) bad("an empty search is not a clean answer");
  await each(pages, async (page) => {
    const twin = twins.get(page.url);
    if (twin === undefined) return;
    let joined = "";
    for (let offset = 0; offset === 0 || offset < twin.length; offset += PAGE_CHARS) {
      const part = (await tool("get_page", { path: page.url, offset })).content[0].text;
      joined += part.replace(/^# .*\nSource: .*\n\n/, offset === 0 ? "" : "$&").replace(/\n\n\[Truncated\..*\]$/, "");
    }
    if (joined !== twin) bad(`get_page ${page.url} differs from its Markdown file`);
  });
  const missing = await tool("get_page", { path: "/docs/no-such-page" });
  if (!missing.isError) bad("an unknown page is not an error");
  const invalid = await rpc("tools/call", { name: "get_page", arguments: {} });
  if (!invalid.body.error && !invalid.body.result?.isError) bad("a missing argument is not an error");
  const malformed = await at("/mcp", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" }, body: "{" });
  if (malformed.status >= 500 || malformed.status < 400) bad(`malformed JSON answered ${malformed.status}`);
  const preflight = await at("/mcp", { method: "OPTIONS" });
  if (preflight.status !== 204 || preflight.headers.get("access-control-allow-origin") !== "*") bad("CORS preflight is wrong");
  const get = await at("/mcp", { headers: { Accept: "application/json, text/event-stream" } });
  if (get.status >= 500) bad(`GET answered ${get.status}`);
});

await group("search", async (bad) => {
  for (const [query, tree] of [["validator", "/docs/"], ["xquad", "/docs/xquad"], ["faucet", "/docs/reference"]]) {
    const hits = await (await at(`/api/search?query=${query}`)).json();
    if (!hits.some((hit) => hit.url.startsWith(tree))) bad(`"${query}" found nothing under ${tree}`);
  }
  for (const query of ["%E2%9C%93%20%E9%87%8F%E5%AD%90", "a".repeat(1000), "%3Cscript%3E"]) {
    const response = await at(`/api/search?query=${query}`);
    if (response.status !== 200) bad(`an odd query answered ${response.status}`);
  }
});

await group("search engines", async (bad) => {
  const sitemap = await (await at("/sitemap.xml")).text();
  const locations = [...sitemap.matchAll(/<loc>([^<]+)/g)].map((match) => match[1]);
  if (locations.length < 30) bad(`the sitemap lists ${locations.length} URLs`);
  await each(locations, async (location) => {
    if (!location.startsWith(SITE)) bad(`${location} is not production`);
    const page = await at(pathOf(location));
    if (page.status !== 200) return bad(`${location} answered ${page.status}`);
    const html = await page.text();
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    if (canonical?.replace(/\/$/, "") !== location.replace(/\/$/, "")) bad(`${location} has canonical ${canonical}`);
    if (/<meta name="robots" content="[^"]*noindex/.test(html)) bad(`${location} is in the sitemap but noindex`);
    const robots = page.headers.get("x-robots-tag");
    if (PRODUCTION ? robots : robots !== "noindex") bad(`${location} has X-Robots-Tag: ${robots}`);
    if (/umami/i.test(html)) bad(`${location} loads analytics`);
  });
  if (!PRODUCTION) {
    for (const path of ["/api/health", "/fonts/ABCFavoritVariable.woff2", "/docs/", "/docs/llms.txt"]) {
      if ((await at(path)).headers.get("x-robots-tag") !== "noindex") bad(`${path} is indexable on staging`);
    }
  } else {
    for (const path of ["/docs/llms.txt", "/docs/getting-started/quickstart.md"]) {
      if ((await at(path)).headers.get("x-robots-tag") !== "noindex") bad(`${path} lost its noindex`);
    }
  }
  if ((await at("/robots.txt")).status !== 200) bad("no robots.txt");
});

await group("not found", async (bad) => {
  for (const path of ["/no-such-page", "/docs/no-such-page", "/docs/xquad/no-such-page", "/docs/no-such-page.md", "/api/no-such-route", "/_next/static/no-such-file.js", "/images/no-such-file.png"]) {
    const response = await at(path);
    if (response.status !== 404) bad(`${path} answered ${response.status}`);
  }
  if (!(await (await at("/docs/no-such-page")).text()).includes("This page does not exist")) bad("not the site's own 404 page");
});

await group("caching and compression", async (bad) => {
  const home = await (await at("/")).text();
  const asset = home.match(/\/_next\/static\/[^"']+\.css/)?.[0];
  const cache = async (path) => (await at(path)).headers.get("cache-control") ?? "";
  if (!(await cache(asset)).includes("immutable")) bad("hashed assets are not immutable");
  if (!(await cache("/fonts/ABCFavoritVariable.woff2")).includes("max-age=604800")) bad("fonts have the wrong lifetime");
  for (const path of ["/", "/docs", "/docs/llms.txt", "/docs/getting-started/quickstart.md"]) {
    if (!(await cache(path)).includes("must-revalidate")) bad(`${path} does not revalidate`);
  }
  const page = await at("/docs", { headers: { "Accept-Encoding": "gzip" } });
  if (page.headers.get("content-encoding") !== "gzip") bad("pages are not compressed");
  const etag = page.headers.get("etag");
  // Not fetch: it adds no-cache to a conditional request, which makes the server send the page.
  const conditional = await new Promise((resolve, reject) => {
    const get = base.startsWith("https:") ? getHttps : getHttp;
    get(`${base}/docs`, { headers: { "Accept-Encoding": "gzip", "If-None-Match": etag } }, (response) => {
      response.resume();
      resolve(response.statusCode);
    }).on("error", reject);
  });
  if (etag && conditional !== 304) bad(`an unchanged page answered ${conditional}, not 304`);
  if (PRODUCTION && !page.headers.get("strict-transport-security")) bad("no HSTS");
  if (/(localhost|127\.0\.0\.1|:300[0-9])/.test(JSON.stringify([...page.headers]))) bad("a header leaks an internal address");
});

await group("redirects", async (bad) => {
  const cases = [["/docs/?a=1", "/docs?a=1"], ["/docs/nodes/classical?a=1", "/docs/nodes/miners?a=1"], ["/docs/xquad/index.html?a=1", "/docs/xquad?a=1"], ["/sitemap-index.xml", "/sitemap.xml"], ["/sg", "/"]];
  for (const [from, to] of cases) {
    const response = await at(from);
    const location = response.headers.get("location") ?? "";
    if (response.status !== 301 || pathOf(new URL(location, base).href) !== to) bad(`${from} went to ${response.status} ${location}`);
    if (/localhost|127\.0\.0\.1|0\.0\.0\.0|:3000/.test(location)) bad(`${from} leaks ${location}`);
    if ((await at(to)).status !== 200) bad(`${from} lands on a dead page`);
  }
  if (base.startsWith("https://")) {
    const plain = await fetch(`${base.replace("https://", "http://")}/docs`, { redirect: "manual" });
    if (![301, 308].includes(plain.status) || !plain.headers.get("location")?.startsWith("https://")) bad("HTTP does not go to HTTPS");
  }
});

console.log(failed ? `check-staging: ${failed} failed against ${base}` : `check-staging: all passed against ${base}`);
process.exit(failed ? 1 : 0);
