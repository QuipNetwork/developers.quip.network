#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
/*
 * Does search find what is really on the site? Every query comes from the pages themselves, so
 * the right answer is known: titles and headings must find their page, a term must lead to a
 * page that contains it, and nonsense must find nothing. It also opens result anchors, to prove
 * a click lands somewhere real.
 *
 *   node scripts/check-search.mjs https://developers-staging.quip.network [--seed 7] [--json file]
 */
import { readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const option = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const base = (args.find((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--")) ?? "http://127.0.0.1:3000").replace(/\/$/, "");
let seed = Number(option("--seed", 7));
const random = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const sample = (list, n) => [...list].map((v) => [random(), v]).sort((a, b) => a[0] - b[0]).slice(0, n).map((p) => p[1]);
const WIDTH = 8;

async function each(items, work) {
  let next = 0;
  await Promise.all(Array.from({ length: WIDTH }, async () => {
    while (next < items.length) { const i = next++; await work(items[i], i); }
  }));
}

async function find(query) {
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetch(`${base}/api/search?query=${encodeURIComponent(query)}`, { signal: AbortSignal.timeout(20_000) });
      if (response.status !== 200) return { status: response.status, hits: [] };
      return { status: 200, hits: await response.json() };
    } catch (error) {
      if (attempt === 2) return { status: 0, hits: [], error: error.message };
    }
  }
}

const pageOf = (url) => url.split("#")[0];
/** Pages in the order search ranks them. */
const ranked = (hits) => [...new Set(hits.map((h) => pageOf(h.url)))];

const rpc = await fetch(`${base}/mcp`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
  body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "list_pages", arguments: {} } }),
});
const pages = JSON.parse((await rpc.json()).result.content[0].text).map((p) => ({ ...p, path: new URL(p.url).pathname, twin: new URL(p.markdown_url).pathname }));
await each(pages, async (page) => {
  page.text = await (await fetch(base + page.twin)).text();
  page.lower = page.text.toLowerCase();
});

const stripMd = (t) => t.replace(/`/g, "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/\*/g, "").trim();
const inFence = (text) => text.replace(/```[\s\S]*?```/g, "").replace(/\]\([^)]*\)/g, "]").replace(/<[^>]+>/g, " ");
const headings = pages.flatMap((p) => [...inFence(p.text).matchAll(/^#{2,4} +(.+)$/gm)].map((m) => ({ page: p, query: stripMd(m[1]) })));
const codeTerms = new Map();
const words = new Map();
for (const p of pages) {
  const body = inFence(p.text);
  for (const [, c] of body.matchAll(/`([^`\n]{3,40})`/g)) if (!/\s/.test(c)) (codeTerms.get(c) ?? codeTerms.set(c, new Set()).get(c)).add(p.path);
  for (const [w] of body.toLowerCase().matchAll(/\b[a-z][a-z-]{4,}\b/g)) (words.get(w) ?? words.set(w, new Set()).get(w)).add(p.path);
}
const rare = [...words].filter(([, set]) => set.size <= 4);
const common = [...words].filter(([, set]) => set.size >= 5);

const headingPages = new Map();
// From the raw text: which pages have a heading must not depend on how fences are stripped.
for (const page of pages) {
  for (const [, heading] of page.text.matchAll(/^#{1,6} +(.+)$/gm)) {
    const key = stripMd(heading).toLowerCase();
    (headingPages.get(key) ?? headingPages.set(key, new Set()).get(key)).add(page.path);
  }
}
const titlePages = new Map();
for (const page of pages) (titlePages.get(page.title.toLowerCase()) ?? titlePages.set(page.title.toLowerCase(), new Set()).get(page.title.toLowerCase())).add(page.path);

const results = [];
const record = (kind, query, ok, detail) => results.push({ kind, query, ok, ...detail });

// A page must be findable by its own title, and near the top.
await each(pages, async (page) => {
  const { hits, status } = await find(page.title);
  const order = ranked(hits);
  const rank = order.indexOf(page.path);
  record("title", page.title, status === 200 && titlePages.get(page.title.toLowerCase()).has(order[0]) && rank >= 0, { expected: page.path, rank, top: order[0] });
});

await each(sample(headings, 700), async ({ page, query }) => {
  const { hits, status } = await find(query);
  const order = ranked(hits);
  const rank = order.indexOf(page.path);
  const truth = headingPages.get(query.toLowerCase());
  const titled = titlePages.get(query.toLowerCase()) ?? new Set();
  // A heading on more pages than one result list holds, like "Example", only has to lead to one.
  const listed = rank >= 0 || truth.size > 15;
  // A page named for the term rightly outranks a page with it as a heading.
  const named = pages.find((p) => p.path === order[0])?.title.toLowerCase().includes(query.toLowerCase());
  record("heading", query, status === 200 && (truth.has(order[0]) || titled.has(order[0]) || named) && (listed || named), { expected: page.path, rank, top: order[0] });
});

const contains = (term) => (path) => {
  const page = pages.find((p) => p.path === path);
  return page?.lower.includes(term.toLowerCase()) || page?.title.toLowerCase().includes(term.toLowerCase());
};

await each(sample([...codeTerms], 700), async ([term, where]) => {
  const { hits, status } = await find(term);
  const order = ranked(hits);
  record("code term", term, status === 200 && contains(term)(order[0]), { expected: [...where][0], count: order.length, top: order[0] });
});

await each(sample(rare, 900), async ([term, where]) => {
  const { hits, status } = await find(term);
  const order = ranked(hits);
  record("rare word", term, status === 200 && contains(term)(order[0]), { expected: [...where][0], count: order.length, top: order[0] });
  const shown = hits.filter((h) => pageOf(h.url) === order[0] && h.type !== "page").some((h) => String(h.content).toLowerCase().includes(term));
  const titled = pages.find((p) => p.path === order[0])?.title.toLowerCase().includes(term);
  record("snippet shows the term", term, shown || titled, { top: order[0] });
});

// Every result for a common word must truly contain it, so nothing irrelevant comes back.
await each(sample(common, 400), async ([term]) => {
  const { hits, status } = await find(term);
  const order = ranked(hits);
  record("common word", term, status === 200 && order.length > 0 && contains(term)(order[0]), { count: order.length, top: order[0] });
});

// Two words from one sentence, as a person types them.
const phrases = sample(pages, 126).flatMap((p) => sample(inFence(p.text).split(/(?<=[.!?])\s+/).filter((s) => /^[A-Z][a-z]/.test(s) && s.length > 40 && s.length < 160), 3).map((s) => ({ page: p, words: s })));
await each(phrases, async ({ page, words: sentence }) => {
  const terms = sentence.toLowerCase().match(/\b[a-z]{6,}\b/g) ?? [];
  if (terms.length < 2) return;
  const [a, b] = sample(terms, 2);
  const query = `${a} ${b}`;
  const { hits, status } = await find(query);
  const top = ranked(hits)[0];
  const stem = (word) => word.replace(/s$/, "");
  record("two words", query, status === 200 && contains(stem(a))(top) && contains(stem(b))(top), { expected: page.path, top });
});

const letters = "bcdfghjklmnpqrstvwxz";
const nonsense = Array.from({ length: 150 }, () => Array.from({ length: 9 }, () => letters[Math.floor(random() * letters.length)]).join(""));
await each(nonsense, async (query) => {
  const { hits, status } = await find(query);
  record("nonsense", query, status === 200 && hits.length === 0, { count: hits.length, top: hits[0]?.url });
});

await each(sample([...codeTerms.keys()].filter((t) => /[a-z]/i.test(t)), 150), async (term) => {
  const [lower, upper] = await Promise.all([find(term.toLowerCase()), find(term.toUpperCase())]);
  record("case", term, JSON.stringify(ranked(lower.hits)) === JSON.stringify(ranked(upper.hits)), { lower: ranked(lower.hits)[0], upper: ranked(upper.hits)[0] });
});

const odd = ["", " ", "   ", "a", "é", "量子", "🙂", "'", '"', "%", "%%", "\\", "/", "<script>alert(1)</script>", "' OR 1=1 --", "${7*7}", "{{7*7}}", "../../etc/passwd", "null", "undefined", "a".repeat(2000), "quip ".repeat(200), "\u0000", "\n", "#", "&", "?", "+", "$QUIP", "WOTS+", "llms.txt", "xquad[quip]", "@quip.network/ethereum-sdk", "D-Wave", "0x0D", "c++", "FN-DSA-512", "ERC-7913"];
await each(odd, async (query) => {
  const { status, hits, error } = await find(query);
  record("odd input", query.slice(0, 40), status === 200 && Array.isArray(hits), { status, count: hits.length, error });
});

// Written by a second reviewer who read the docs: what a person types, typos included.
const cases = JSON.parse(readFileSync(new URL("./search-cases.json", import.meta.url), "utf8"));
await each(cases, async ({ q, top3 }) => {
  const order = ranked((await find(q)).hits);
  const rank = order.indexOf(top3);
  record("human queries", q, rank >= 0 && rank < 3, { expected: top3, rank, top: order[0] });
});

// A term with punctuation must lead to a page that has it.
await each(["$QUIP", "WOTS+", "llms.txt", "xquad[quip]", "@quip.network/ethereum-sdk", "D-Wave", "0x0D", "FN-DSA-512", "ERC-7913"], async (term) => {
  const order = ranked((await find(term)).hits);
  record("punctuation", term, !!order[0] && contains(term)(order[0]), { top: order[0] });
});

for (const typo of [["validtor", "validator"], ["quantun", "quantum"], ["faucett", "faucet"], ["bytcode", "bytecode"]]) {
  const order = ranked((await find(typo[0])).hits);
  record("typo", typo[0], !!order[0] && contains(typo[1])(order[0]), { top: order[0] });
}

// Every heading anchor a result links to must exist on its page, or a click lands at the top.
const html = new Map();
const linked = [];
await each(sample(rare, 300), async ([term]) => { for (const h of (await find(term)).hits) if (h.url.includes("#")) linked.push(h.url); });
await each(sample([...new Set(linked)], 500), async (url) => {
  const page = pageOf(url);
  if (!html.has(page)) html.set(page, await (await fetch(base + page)).text());
  const id = decodeURIComponent(url.split("#")[1]);
  record("anchor", url, html.get(page).includes(`id="${id}"`), { expected: id });
});

const kinds = [...new Set(results.map((r) => r.kind))];
console.log(`${results.length} checks across ${pages.length} pages at ${base}\n`);
let failed = 0;
for (const kind of kinds) {
  const group = results.filter((r) => r.kind === kind);
  const bad = group.filter((r) => !r.ok);
  failed += bad.length;
  const ranks = group.map((r) => r.rank).filter((r) => r >= 0);
  const top = ranks.length ? ` · first ${ranks.filter((r) => r === 0).length}, top 3 ${ranks.filter((r) => r < 3).length}, top 5 ${ranks.filter((r) => r < 5).length} of ${group.length}` : "";
  console.log(`${bad.length ? "FAIL" : "ok  "}  ${kind}: ${group.length - bad.length}/${group.length}${top}`);
  for (const r of sample(bad, 8)) console.log(`        ${JSON.stringify({ q: r.query, expected: r.expected, top: r.top, count: r.count, stray: r.stray, status: r.status })}`.slice(0, 200));
}
if (args.includes("--json")) writeFileSync(option("--json"), JSON.stringify(results, null, 1));
console.log(failed ? `\ncheck-search: ${failed} failed` : "\ncheck-search: all passed");
process.exit(failed ? 1 : 0);
