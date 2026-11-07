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

/*
 * The product is called QVM on quip.network and XQuad in these docs, and the docs never use the
 * word. Readers arrive with the product's name, so its names lead to the toolchain's pages.
 */
const PRODUCT_NAMES = /\b(?:qvm|(?:quip|quantum) virtual machine)\b/gi;

const withProductNames = (query: string) => query.replace(PRODUCT_NAMES, "toolchain");

interface Page {
  url: string;
  title: string;
  lowerTitle: string;
  text: string;
  lower: string;
  lowerHeadings: string[];
}

let pages: Promise<Page[]> | undefined;

/** What each page says, from the same Markdown twins the site serves. */
function loadPages() {
  pages ??= Promise.all(
    source.getPages().map(async (page) => {
      const text = await readFile(path.join(process.cwd(), "public", markdownUrlOf(page)), "utf8");
      const lower = text.toLowerCase();
      return {
        url: page.url,
        title: page.data.title,
        lowerTitle: page.data.title.toLowerCase(),
        text,
        lower,
        lowerHeadings: [...lower.matchAll(/^#{1,4} +(.+)$/gm)].map((m) => m[1].replace(/`/g, "").trim()),
      };
    }),
  );
  return pages;
}

const escape = (text: string) => text.replace(/[.*+?^\${}()|[\]\\]/g, "\\$&");

/*
 * The index splits text into loose words, so `Solver._recompute_energy()` and "big-endian" reach
 * pages that only share a word. This scores a page on what it really says: its name first, then a
 * heading, then the exact term, then all of the words. The index's own order breaks ties.
 */
function scorer(query: string) {
  const whole = new RegExp(`(?<![a-z0-9_])${escape(query)}(?![a-z0-9_])`);
  const terms = query.split(/\s+/).filter(Boolean);
  return (page: Page) => {
    if (page.lowerTitle === query) return 7;
    if (page.lowerTitle.includes(query)) return 6;
    if (page.lowerHeadings.includes(query)) return 5;
    if (page.lowerHeadings.some((h) => h.includes(query))) return 4;
    if (whole.test(page.lower)) return 3;
    if (query.length >= 4 && page.lower.includes(query)) return 2;
    if (terms.length > 1 && terms.every((t) => page.lower.includes(t))) return 1;
    return 0;
  };
}

/** The line a term sits on, for a page the index did not return it for. */
function snippetOf(page: Page, query: string) {
  const at = page.lower.indexOf(query);
  if (at < 0) return undefined;
  const start = page.text.lastIndexOf("\n", at) + 1;
  const end = page.text.indexOf("\n", at);
  return page.text.slice(start, end < 0 ? undefined : end).replace(/^[#>\-*\s]+/, "").slice(0, SNIPPET);
}

/** The search behind the dialog and the MCP server, so the two always agree. */
export async function findInDocs(input: string) {
  const asked = withProductNames(input).trim();
  if (!asked) return [];
  const query = asked.toLowerCase();
  const [hits, all] = await Promise.all([index.search(asked, { limit: 2000 }), loadPages()]);
  const score = scorer(query);

  const grouped = new Map<string, typeof hits>();
  for (const hit of hits) {
    const url = hit.url.split("#")[0];
    grouped.set(url, [...(grouped.get(url) ?? []), hit]);
  }
  const byUrl = new Map(all.map((page) => [page.url, page]));
  // A page that says the term is a result, whatever the index made of it.
  for (const page of all) {
    if (grouped.has(page.url) || score(page) < 2) continue;
    const content = snippetOf(page, query);
    grouped.set(page.url, [
      { id: page.url, type: "page", content: page.title, url: page.url },
      ...(content ? [{ id: `${page.url}-match`, type: "text" as const, content, url: page.url }] : []),
    ]);
  }

  const order = [...grouped.keys()].map((url, rank) => {
    const page = byUrl.get(url);
    return { url, rank, score: page ? score(page) : 0 };
  });
  order.sort((a, b) => b.score - a.score || a.rank - b.rank);

  const results: typeof hits = [];
  for (const { url } of order) {
    const [first, ...rest] = grouped.get(url) ?? [];
    if (!first) continue;
    // Within a page, the snippets that say the term come first.
    const says = (hit: (typeof hits)[number]) => (String(hit.content).toLowerCase().includes(query) ? 0 : 1);
    const best = [...rest].sort((a, b) => says(a) - says(b)).slice(0, HITS_PER_PAGE - 1);
    results.push(first, ...best);
    if (results.length >= MAX_HITS) break;
  }
  // Snippets are plain text, so math keeps its symbols and loses its $$ delimiters.
  return results.slice(0, MAX_HITS).map((hit) => ({ ...hit, content: String(hit.content).replaceAll("$$", "") }));
}
