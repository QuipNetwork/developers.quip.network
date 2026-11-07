import { readFile } from "node:fs/promises";
import path from "node:path";
import { createFromSource } from "fumadocs-core/search/server";
import { markdownUrlOf } from "./shared";
import { source } from "./source";

const index = createFromSource(source);

/** How many results come back, and how many of them one page may take. */
const MAX_HITS = 60;
const HITS_PER_PAGE = 4;
const SNIPPET = 220;
const MAX_QUERY = 200;

/*
 * The product is called QVM on quip.network and XQuad in these docs, and the docs never use the
 * word. Readers arrive with the product's name, so its names lead to the toolchain's pages.
 */
const PRODUCT_NAMES = /\b(?:qvm|(?:quip|quantum) virtual machine)\b/gi;

const withProductNames = (query: string) => query.replace(PRODUCT_NAMES, "toolchain");

const STOP_WORDS = new Set("a an and are at be can do does for from how i in is it my of on or the to what when where which why with you your".split(" "));

interface Page {
  url: string;
  title: string;
  lowerTitle: string;
  text: string;
  lower: string;
  lowerLines: string[];
  lowerHeadings: string[];
}

let loading: Promise<{ pages: Page[]; words: Set<string> }> | undefined;

/** What each page says, from the same Markdown twins the site serves. They are fixed at build. */
function load() {
  loading ??= Promise.all(
    source.getPages().map(async (page): Promise<Page> => {
      const text = await readFile(path.join(process.cwd(), "public", markdownUrlOf(page)), "utf8");
      const lower = text.toLowerCase();
      const prose = lower.replace(/^```[\s\S]*?^```/gm, "");
      return {
        url: page.url,
        title: page.data.title,
        lowerTitle: page.data.title.toLowerCase(),
        text,
        lower,
        lowerLines: lower.split("\n"),
        lowerHeadings: [...prose.matchAll(/^#{1,6} +(.+)$/gm)].map((m) => m[1].replace(/[`*_]/g, "").trim()),
      };
    }),
  )
    .then((pages) => ({ pages, words: new Set(pages.flatMap((page) => page.lower.match(/[a-z][a-z0-9_]{3,}/g) ?? [])) }))
    .catch((error) => {
      // A failed read must not stay cached, or every later search fails with it.
      loading = undefined;
      throw error;
    });
  return loading;
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Splits a query into words, dropping the small ones a question is made of. */
function termsOf(query: string) {
  const all = query.split(/[\s\-_.:/]+/).filter(Boolean);
  const kept = all.filter((term) => !STOP_WORDS.has(term));
  return kept.length ? kept : all;
}

/*
 * The index splits text into loose words, so `Solver._recompute_energy()` and "big-endian" reach
 * pages that only share a word. This scores a page on what it really says: its name first, then a
 * heading, the exact term, the term with other separators, a word that starts with it, all the
 * words on one line, then all the words on the page. The index's own order breaks ties.
 */
function scorer(query: string) {
  const start = "(?<![a-z0-9_])";
  const end = "(?![a-z0-9_])";
  const whole = new RegExp(`${start}${escape(query)}${end}`);
  const prefix = new RegExp(`${start}${escape(query)}`);
  const terms = termsOf(query);
  const loose = new RegExp(`${start}${terms.map(escape).join("[\\W_]+")}`);
  const words = terms.map((term) => new RegExp(`${start}${escape(term)}`));
  return (page: Page) => {
    if (page.lowerTitle === query) return 9;
    if (whole.test(page.lowerTitle)) return 8;
    if (page.lowerHeadings.includes(query)) return 7;
    if (page.lowerHeadings.some((heading) => whole.test(heading))) return 6;
    if (whole.test(page.lower)) return 5;
    if (terms.length > 1 && loose.test(page.lower)) return 4;
    if (query.length >= 3 && prefix.test(page.lower)) return 3;
    if (terms.length > 1) {
      if (page.lowerLines.some((line) => words.every((word) => word.test(line)))) return 2;
      if (words.every((word) => word.test(page.lower))) return 1;
    }
    return 0;
  };
}

/** A window of text around a term, starting at a word. */
function snippetOf(page: Page, term: string) {
  const at = page.lower.indexOf(term);
  if (at < 0) return undefined;
  const lineStart = page.text.lastIndexOf("\n", at) + 1;
  const lineEnd = page.text.indexOf("\n", at);
  const line = page.text.slice(lineStart, lineEnd < 0 ? undefined : lineEnd).replace(/^[#>\-*\s]+/, "");
  const offset = Math.max(0, line.toLowerCase().indexOf(term) - SNIPPET / 3);
  const from = offset ? line.indexOf(" ", offset) + 1 : 0;
  return line.slice(from, from + SNIPPET);
}

/** One or two letters off a word the docs use, for a typo that found nothing. */
function nearest(term: string, words: Set<string>) {
  const allowed = term.length >= 8 ? 2 : 1;
  let best: string | undefined;
  let bestDistance = allowed + 1;
  for (const word of words) {
    if (Math.abs(word.length - term.length) > allowed || word[0] !== term[0]) continue;
    const distance = editDistance(term, word, bestDistance);
    if (distance < bestDistance) [best, bestDistance] = [word, distance];
  }
  return best;
}

function editDistance(a: string, b: string, limit: number) {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(previous[j] + 1, row[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    if (Math.min(...row) >= limit) return limit;
    previous = row;
  }
  return previous[b.length];
}

async function rank(asked: string) {
  const query = asked.toLowerCase();
  const [hits, { pages }] = await Promise.all([index.search(asked, { limit: 2000 }), load()]);
  const score = scorer(query);
  const terms = termsOf(query);

  const grouped = new Map<string, typeof hits>();
  for (const hit of hits) {
    const url = hit.url.split("#")[0];
    const group = grouped.get(url);
    if (group) group.push(hit);
    else grouped.set(url, [hit]);
  }

  const results: typeof hits = [];
  const order = pages
    .map((page) => ({ page, score: score(page), rank: [...grouped.keys()].indexOf(page.url) }))
    // A page that says the term is a result, whatever the index made of it.
    .filter((entry) => entry.score > 0 || entry.rank >= 0)
    .sort((a, b) => b.score - a.score || (a.rank < 0 ? 1e6 : a.rank) - (b.rank < 0 ? 1e6 : b.rank));

  for (const { page, score: pageScore } of order) {
    const [first, ...rest] = grouped.get(page.url) ?? [{ id: page.url, type: "page" as const, content: page.title, url: page.url }];
    const says = (hit: (typeof hits)[number]) => (String(hit.content).toLowerCase().includes(query) ? 0 : 1);
    const best = rest.sort((a, b) => says(a) - says(b)).slice(0, HITS_PER_PAGE - 1);
    // When no passage shows why the page matched, quote the line that does.
    if (pageScore > 0 && !best.some((hit) => says(hit) === 0)) {
      const content = snippetOf(page, query) ?? terms.map((term) => snippetOf(page, term)).find(Boolean);
      if (content) best.unshift({ id: `${page.url}-match`, type: "text", content, url: page.url });
    }
    results.push(first, ...best.slice(0, HITS_PER_PAGE - 1));
    if (results.length >= MAX_HITS) break;
  }
  return results.slice(0, MAX_HITS);
}

/** The search behind the dialog and the MCP server, so the two always agree. */
export async function findInDocs(input: string) {
  const asked = withProductNames(input).replace(/\s+/g, " ").trim().slice(0, MAX_QUERY);
  if (!asked) return [];
  let results = await rank(asked);
  if (results.length === 0) {
    const { words } = await load();
    const corrected = termsOf(asked.toLowerCase()).map((term) => nearest(term, words) ?? term).join(" ");
    if (corrected !== asked.toLowerCase()) results = await rank(corrected);
  }
  // Snippets are plain text, so math keeps its symbols and loses its $$ delimiters.
  return results.map((hit) => ({ ...hit, content: String(hit.content).replaceAll("$$", "") }));
}
