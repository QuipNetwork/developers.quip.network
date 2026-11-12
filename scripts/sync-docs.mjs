import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const sourceRoot = path.join(projectRoot, "docs");
// Fumadocs reads MDX from content/docs. Generated, never edited by hand: docs/ stays the
// source until the cutover, so edits merged to main carry over with a rebase.
//
// Three sidebar trees share content/docs: this generated one in the (docs) route group,
// which adds nothing to URLs, plus xquad/ and reference/, which this script leaves alone.
const docsRoot = path.join(projectRoot, "content/docs");
const contentRoot = path.join(docsRoot, "(docs)");
const publicRoot = path.join(projectRoot, "public/docs");
const rootMirror = path.join(projectRoot, "public/docs.md");
const slugify = (value) => value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const summaryPath = path.join(sourceRoot, "SUMMARY.md");
const summary = await readFile(summaryPath, "utf8").catch(() => {
  throw new Error(`Cannot read ${summaryPath}. The merged documentation source is missing.`);
});

// A route is normally <group-slug>/<basename>, which cannot express a one-segment
// path. The XQuad book is served from /docs/xquad/*, so the toolchain page has to
// leave that prefix, and renaming its SUMMARY group would only move it to
// xquad-toolchain/toolchain. QUI-1331.
const routeOverrides = new Map([["xquad/toolchain.md", "xquad-toolchain"]]);

let group = "Overview";
let order = 0;
const pages = [];
const links = [];
// Counted so the assertion below can see an entry this loop failed to classify.
// A SUMMARY entry that matched nothing used to be skipped in silence, which is
// how the XQuad "Documentation" link went missing for a day. QUI-1331.
let listItems = 0;
for (const line of summary.split("\n")) {
  const heading = line.match(/^##\s+(.+)$/);
  if (heading) {
    group = heading[1].trim();
    continue;
  }
  if (/^\* \[/.test(line)) listItems += 1;
  const item = line.match(/^\* \[([^\]]+)\]\(([^)]+)\)$/);
  if (!item) continue;
  const [, title, target] = item;
  // A target that is not a Markdown path is a link to somewhere we do not render:
  // it becomes a nav entry with an href and no page of its own.
  if (!target.endsWith(".md")) {
    links.push({ title, href: target, group, order: order++ });
    continue;
  }
  const basename = path.basename(target, ".md");
  const route =
    target === "README.md" ? "" : (routeOverrides.get(target) ?? `${slugify(group)}/${basename}`);
  pages.push({ title, sourcePath: target, route, group, order: order++ });
}
// Fail on a dropped entry rather than on a page count, which cannot see one.
if (pages.length + links.length !== listItems) {
  throw new Error(
    `SUMMARY.md has ${listItems} entries but only ${pages.length + links.length} were parsed. ` +
      `An entry was dropped; every "* [title](target)" line must be matched.`,
  );
}
if (pages.length < 19) throw new Error(`Expected at least 19 pages in SUMMARY.md, found ${pages.length}.`);
// The assertion above catches an entry the parser drops. It cannot catch one deleted
// from SUMMARY.md, which is how the nav would lose the XQuad book link a second time,
// so nav links get a floor of their own exactly as pages do.
if (links.length < 1) throw new Error(`Expected at least 1 nav link in SUMMARY.md, found ${links.length}.`);
for (const [source] of routeOverrides) {
  if (!pages.some((page) => page.sourcePath === source)) {
    throw new Error(`Route override for ${source} matches no SUMMARY entry; remove it or fix the path.`);
  }
}

const routeBySource = new Map(pages.map((page) => [page.sourcePath, page.route]));
const splitFrontmatter = (markdown) => {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n?/);
  return match ? { frontmatter: match[1], body: markdown.slice(match[0].length) } : { frontmatter: "", body: markdown };
};

function normalizeBody(markdown, sourcePath) {
  const normalized = [];
  let hint = null;
  for (const line of markdown.replaceAll("&#x20;", "").split("\n")) {
    const hintStart = line.match(/^\{% hint style="([^"]+)" %\}$/);
    if (hintStart) {
      hint = hintStart[1];
      normalized.push(`> **${hint === "danger" ? "Warning" : "Note"}**`);
      continue;
    }
    if (line === "{% endhint %}") {
      hint = null;
      continue;
    }
    const tabStart = line.match(/^\{% tab title="([^"]+)" %\}$/);
    if (tabStart) {
      normalized.push(`### ${tabStart[1]}`);
      continue;
    }
    if (/^\{% (?:tabs|endtabs|endtab) %\}$/.test(line)) continue;
    normalized.push(hint ? `> ${line}` : line);
  }
  return rewriteLinks(normalized.join("\n"), sourcePath);
}

// The link and asset rewrites shared by the Markdown twins and the MDX pages. Kept
// byte-for-byte as they were so the twins do not change.
function rewriteLinks(text, sourcePath) {
  const sourceDir = path.posix.dirname(sourcePath);
  const resolveLink = (target, hash = "") => {
    const resolved = path.posix.normalize(path.posix.join(sourceDir, target));
    const route = routeBySource.get(resolved);
    return route === undefined ? undefined : `/docs${route ? `/${route}` : ""}${hash}`;
  };
  return text
    .replaceAll("https://quip.gitbook.io/docs/llms.txt", "https://developers.quip.network/docs/llms.txt")
    .replaceAll("https://quip.gitbook.io/docs/llms-full.txt", "https://developers.quip.network/docs/llms-full.txt")
    .replace(/(?:\.\.\/)?\.gitbook\/assets\/([^"')\s]+)/g, "/docs/assets/$1")
    .replace(/\]\(([^):#]+\.md)(#[^)]+)?\)/g, (match, target, hash = "") => {
      const route = resolveLink(target, hash);
      return route === undefined ? match : `](${route})`;
    })
    .replace(/href="([^":#]+\.md)(#[^"]+)?"/g, (match, target, hash = "") => {
      const route = resolveLink(target, hash);
      return route === undefined ? match : `href="${route}"`;
    });
}

// ---------- MDX for Fumadocs ----------
//
// The twins above stay plain Markdown, exactly as agents read them today. The pages
// Fumadocs renders get real components instead of the blockquote and heading stand-ins:
// GitBook hints become <Callout>, tabs become headings, the card table becomes <Cards>.
// Everything else is made safe for MDX: braces, comments, void tags and stray "<".

const CALLOUT_TYPE = { info: "info", warning: "warn", danger: "error", success: "success" };
const CALLOUT_TITLE = { info: "Note", warning: "Warning", danger: "Warning", success: "Success" };
const KNOWN_TAGS = new Set(
  "a b br code div em figcaption figure i img kbd mark p picture source span strong sub sup table tbody td th thead tr u details summary"
    .split(" "),
);

function escapeLine(line) {
  // Inline code is left alone; everything between code spans is made MDX-safe.
  return line
    .split(/(`+[^`]*`+)/)
    .map((part, index) => {
      if (index % 2 === 1) return part;
      return part
        .replace(/<(https?:\/\/[^>\s]+)>/g, "[$1]($1)")
        .replace(/\{(?!%)/g, "\\{")
        .replace(/(?<!%)\}/g, "\\}")
        .replace(/<!--([\s\S]*?)-->/g, "{/*$1*/}")
        .replace(/<\/?([A-Za-z][\w-]*)/g, (match, tag) => (KNOWN_TAGS.has(tag.toLowerCase()) ? match : match.replace("<", "&lt;")))
        .replace(/<(br|img|source)\b([^>]*?)\s*\/?>/gi, (_, tag, attrs) => `<${tag}${attrs} />`)
        .replace(/\sclass=/g, " className=")
        .replace(/\ssrcset=/g, " srcSet=");
    })
    .join("");
}

function escapeOutsideFences(markdown) {
  let fence = null;
  return markdown
    .split("\n")
    .map((line) => {
      const marker = line.match(/^\s*(`{3,}|~{3,})/);
      if (marker) {
        if (!fence) fence = marker[1];
        else if (marker[1].startsWith(fence[0]) && marker[1].length >= fence.length) fence = null;
        return line;
      }
      return fence ? line : escapeLine(line);
    })
    .join("\n");
}

const stripTags = (html) => html.replace(/<[^>]+>/g, "").trim();
const jsxString = (value) => `{${JSON.stringify(value)}}`;

function cardsToMdx(table) {
  const body = table.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1] ?? "";
  const cards = [...body.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(([, row]) => {
    const cells = [...row.matchAll(/<td>([\s\S]*?)<\/td>/g)].map((cell) => cell[1]);
    const href = row.match(/<a href="([^"]+)"/)?.[1];
    const title = stripTags(cells[0] ?? "");
    const description = stripTags(cells[1] ?? "");
    return `<Card title=${jsxString(title)} description=${jsxString(description)}${href ? ` href="${href}"` : ""} />`;
  });
  return `<Cards>\n${cards.join("\n")}\n</Cards>`;
}

function toMdx(markdown, sourcePath) {
  // The page's own H1 stays in the body: it is often worded differently from the sidebar
  // title in SUMMARY.md, and the old site printed it.
  let text = escapeOutsideFences(markdown.replaceAll("&#x20;", ""));
  // GitBook tabs become plain headings, as on the live site. Tabs would hide their content from
  // browser find, crawlers and AI tools, and lose the published anchors such as #validators.
  text = text.replace(/^\{% tabs %\}\n([\s\S]*?)^\{% endtabs %\}$/gm, (_, inner) =>
    [...inner.matchAll(/^\{% tab title="([^"]+)" %\}\n([\s\S]*?)^\{% endtab %\}$/gm)]
      .map(([, title, content]) => `### ${title}\n\n${content.trim()}`)
      .join("\n\n"),
  );
  text = text.replace(/^\{% hint style="([^"]+)" %\}\n([\s\S]*?)^\{% endhint %\}$/gm, (_, style, content) => {
    const type = CALLOUT_TYPE[style] ?? "info";
    const title = CALLOUT_TITLE[style] ?? "Note";
    return `<Callout type="${type}" title="${title}">\n\n${content.trim()}\n\n</Callout>`;
  });
  text = text.replace(/<table data-view="cards">[\s\S]*?<\/table>/g, cardsToMdx);
  const leftover = text.match(/\{%[^%]*%\}/);
  if (leftover) throw new Error(`${sourcePath}: unconverted GitBook tag ${leftover[0]}`);
  // Point straight at the book's page URLs, rather than through the old .html redirects.
  return rewriteLinks(text, sourcePath).replace(/(\/docs\/xquad\/[^)"#\s]*)\.html/g, "$1");
}

function descriptionOf(frontmatter) {
  const folded = frontmatter.match(/^description:\s*>-?\n((?:[ \t]+.*\n?)+)/m);
  if (folded) return folded[1].split("\n").map((line) => line.trim()).filter(Boolean).join(" ");
  return frontmatter.match(/^description:\s*(.+)$/m)?.[1].trim().replace(/^["']|["']$/g, "");
}

// ---------- write ----------

await rm(contentRoot, { recursive: true, force: true });
// Twins this script does not write: the XQuad book's (scripts/sync-xquad.mjs) and the
// Reference tree's (scripts/sync-reference.mjs). Keep them.
for (const entry of await readdir(publicRoot).catch(() => [])) {
  if (!["xquad", "xquad.md", "reference", "reference.md"].includes(entry)) await rm(path.join(publicRoot, entry), { recursive: true, force: true });
}
await rm(rootMirror, { force: true });
await mkdir(contentRoot, { recursive: true });
await mkdir(publicRoot, { recursive: true });
const full = [];
const index = [
  "# Quip Network documentation",
  "",
  "> Developer documentation for Quip Network: post-quantum protection for assets on existing chains, and a marketplace for optimization jobs on quantum hardware. Every link below is a page's Markdown file, and llms-full.txt has all of them in one file.",
  "",
  "Coding assistants can also search and read these docs through the MCP server at https://developers.quip.network/mcp (Streamable HTTP, no sign-in). Setup for each assistant: https://developers.quip.network/docs/getting-started/use-with-ai",
  "",
  "## Documentation",
  "",
];
// Sidebar order: one meta.json per folder. Every group is a collapsible folder, so every
// section name in the sidebar behaves the same. A group of one-segment pages (XQuad's
// toolchain page and its book link) uses a "(group)" folder, which adds nothing to the URL.
const folderPages = new Map();
const rootPages = [];

for (const page of pages) {
  const raw = await readFile(path.join(sourceRoot, page.sourcePath), "utf8");
  const { frontmatter, body } = splitFrontmatter(raw);
  const normalized = `${normalizeBody(body, page.sourcePath).trim()}\n`;
  const description = descriptionOf(frontmatter);
  const metadata = [
    `title: ${JSON.stringify(page.title)}`,
    description ? `description: ${JSON.stringify(description)}` : "",
    `source_path: ${JSON.stringify(page.sourcePath)}`,
  ].filter(Boolean).join("\n");
  const bare = page.route && !page.route.includes("/") && page.group !== "Overview";
  const relativeOutput = page.route ? `${bare ? `(${slugify(page.group)})/` : ""}${page.route}.mdx` : "index.mdx";
  const contentPath = path.join(contentRoot, relativeOutput);
  const mirrorPath = page.route ? path.join(publicRoot, `${page.route}.md`) : rootMirror;
  await mkdir(path.dirname(contentPath), { recursive: true });
  await mkdir(path.dirname(mirrorPath), { recursive: true });
  await writeFile(contentPath, `---\n${metadata}\n---\n\n${toMdx(body, page.sourcePath).trim()}\n`);
  await writeFile(mirrorPath, normalized);
  const url = `https://developers.quip.network/docs${page.route ? `/${page.route}` : ""}.md`;
  index.push(`- [${page.title}](${url}): ${description ?? `${page.group}.`}`);
  full.push(normalized);

  const [folder, file] = page.route.includes("/")
    ? page.route.split("/")
    : bare
      ? [`(${slugify(page.group)})`, page.route]
      : [null, page.route || "index"];
  if (folder) {
    // A collapsible group in the sidebar. The section you are in opens by itself.
    if (!folderPages.has(folder)) {
      folderPages.set(folder, { title: page.group, pages: [] });
      rootPages.push(folder);
    }
    folderPages.get(folder).pages.push(file);
  } else {
    rootPages.push(file);
  }
}

// Nav-only links (the XQuad book) go into their group's folder, after its pages.
for (const link of links) {
  const folder = `(${slugify(link.group)})`;
  if (!folderPages.has(folder)) {
    folderPages.set(folder, { title: link.group, pages: [] });
    rootPages.push(folder);
  }
  folderPages.get(folder).pages.push(`[${link.title}](${link.href})`);
}

for (const [folder, meta] of folderPages) {
  await writeFile(path.join(contentRoot, folder, "meta.json"), `${JSON.stringify(meta, null, 2)}\n`);
}
await writeFile(
  path.join(contentRoot, "meta.json"),
  `${JSON.stringify({ title: "Documentation", description: "Guides and concepts", root: true, pages: rootPages }, null, 2)}\n`,
);
await writeFile(
  path.join(docsRoot, "meta.json"),
  `${JSON.stringify({ pages: ["(docs)", "xquad", "reference"] }, null, 2)}\n`,
);

await cp(path.join(sourceRoot, ".gitbook/assets"), path.join(publicRoot, "assets"), { recursive: true });
// The indexes cover every page the site serves, not only the ones this script writes: the
// XQuad book and the Reference tree follow, from the twins their own scripts wrote. Those
// run first in prebuild, so a build always indexes all three. `npm run dev` syncs only
// docs/, so locally a tree that was never synced is left out, with a note.
const extra = [...(await xquadSection()), ...(await referenceSection())];
for (const section of extra) {
  index.push("", `## ${section.title}`, "");
  for (const page of section.pages) {
    index.push(`- [${page.title}](${page.url})${page.description ? `: ${page.description}` : ""}`);
    full.push(page.twin);
  }
}
await writeFile(path.join(publicRoot, "llms.txt"), `${index.join("\n")}\n`);
await writeFile(path.join(publicRoot, "llms-full.txt"), full.join("\n---\n\n"));
const extraPages = extra.reduce((sum, section) => sum + section.pages.length, 0);
console.log(`Synced ${pages.length} pages and ${links.length} nav links from ${sourceRoot}; the indexes list ${pages.length + extraPages} pages.`);

/** The XQuad book, in its own index's order. Its pages have no descriptions, so each gets its section. */
async function xquadSection() {
  const bookIndex = await readFile(path.join(publicRoot, "xquad/llms.txt"), "utf8").catch(() => undefined);
  if (bookIndex === undefined) {
    console.warn("sync-docs: no XQuad twins (run npm run xquad:sync); the indexes leave the book out.");
    return [];
  }
  const pages = [];
  for (const [, title, url, section] of bookIndex.matchAll(/^- \[([^\]]+)\]\((https:\/\/developers\.quip\.network\/docs\/xquad[^)]*\.md)\)(?:: (.+))?$/gm)) {
    const twin = await readFile(path.join(projectRoot, "public", new URL(url).pathname), "utf8");
    pages.push({ title, url, description: section, twin });
  }
  if (pages.length < 80) throw new Error(`public/docs/xquad/llms.txt lists ${pages.length} pages; expected the whole book.`);
  return [{ title: "XQuad book", pages }];
}

/** The Reference tree, in its sidebar's order, with each page's own title and description. */
async function referenceSection() {
  const referenceRoot = path.join(docsRoot, "reference");
  if (!(await readdir(path.join(publicRoot, "reference")).catch(() => undefined))) {
    console.warn("sync-docs: no Reference twins (run node scripts/sync-reference.mjs); the indexes leave Reference out.");
    return [];
  }
  const { pages: order } = JSON.parse(await readFile(path.join(referenceRoot, "meta.json"), "utf8"));
  const pages = [];
  for (const slug of order) {
    const { frontmatter } = splitFrontmatter(await readFile(path.join(referenceRoot, `${slug}.mdx`), "utf8"));
    const field = (name) => frontmatter.match(new RegExp(`^${name}:\\s*(.+)$`, "m"))?.[1].trim().replace(/^"(.*)"$/, "$1");
    // markdownUrlOf() puts a folder's index beside the folder: /docs/reference.md.
    const twinPath = slug === "index" ? "/docs/reference.md" : `/docs/reference/${slug}.md`;
    pages.push({
      title: field("title"),
      description: field("description"),
      url: `https://developers.quip.network${twinPath}`,
      twin: await readFile(path.join(projectRoot, "public", twinPath), "utf8"),
    });
  }
  return [{ title: "Reference", pages }];
}
