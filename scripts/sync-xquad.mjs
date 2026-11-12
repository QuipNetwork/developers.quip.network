#!/usr/bin/env node
/*
 * Convert the XQuad mdBook into a Fumadocs tree at /docs/xquad.
 *
 * The book's Markdown lives in the xquad project (docs/book/src), not this one. At build
 * this script takes that source at the latest release tag and writes:
 *
 *   content/docs/xquad/**            MDX pages and meta.json files (gitignored)
 *   public/docs/xquad/<path>.md      Markdown twins, for agents and the MCP server
 *   public/docs/xquad.md             the book index's twin
 *   public/docs/xquad/llms.txt       an index of the twins
 *
 * Every page is checked in upstream at the tag, including the ones xquad generates
 * (opcode tables, example pages): `make regen-docs` commits them there. So the source is
 * complete and the build artifact is not needed. It would only add print.html, toc.html,
 * 404.html and redirect stubs, which src/proxy.ts answers instead.
 *
 * No token: xquad is a public project, so every endpoint used here is readable
 * unauthenticated. Nothing secret belongs in this build.
 *
 * Fails closed on a missing or truncated book, a tag that is not a release, a link that
 * resolves to nothing, or markup it does not understand. A red build is better than a
 * docs section that silently 404s, or one built from a branch or a prerelease.
 */
import { existsSync, readFileSync } from "node:fs";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const PROJECT_ID = "80173065"; // gitlab.com/quip.network/xquad
const API = `https://gitlab.com/api/v4/projects/${PROJECT_ID}`;
const JOB = "docs:build";
/* `tag_pattern` from xquad's cliff.toml, which is also what decides which tags publish
 * docs there. Prereleases (v0.4.1-beta1, v0.4.0-rc2) do not match. */
const RELEASE_TAG = /^v\d+\.\d+\.\d+$/;
const BOOK_PATH = "docs/book";

const projectRoot = path.resolve(import.meta.dirname, "..");
const CONTENT = path.join(projectRoot, "content/docs/xquad");
const PUBLIC = path.join(projectRoot, "public/docs/xquad");
const ROOT_TWIN = path.join(projectRoot, "public/docs/xquad.md");
/* URLs the book has moved away from. Shared with src/proxy.ts, which answers them. */
const MOVED = path.join(projectRoot, "src/data/xquad-moved.json");

const SITE_URL = "https://developers.quip.network";
const ROUTE = "/docs/xquad";
const DESCRIPTION = "Problem formulation across quantum architectures";

/* The book has 94 pages today. A floor well below that catches a truncated archive
 * without going red every time a page is added or removed. */
const PAGE_FLOOR = 80;
const ATTEMPTS = 3;
const DOWNLOADS = 8;
const TIMEOUT_MS = 60_000;

const fail = (message) => {
  console.error(`sync-xquad: ${message}`);
  process.exit(1);
};

// ---------- which release ----------

class HttpError extends Error {
  constructor(status, url) {
    super(`HTTP ${status} from ${url}`);
    /* A 4xx is an answer, not a hiccup. 429 is the one worth waiting out. */
    this.retryable = status === 429 || status >= 500;
  }
}

async function withRetries(label, run) {
  let lastError;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      if (error.retryable === false) break;
      if (attempt < ATTEMPTS) {
        const backoff = attempt * 2000;
        console.warn(`sync-xquad: ${label} attempt ${attempt} failed (${error.message}); retrying in ${backoff}ms`);
        await new Promise((resolve) => setTimeout(resolve, backoff));
      }
    }
  }
  fail(`could not ${label}: ${lastError?.message}`);
}

async function get(url, read) {
  return withRetries(`read ${url}`, async () => {
    const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) throw new HttpError(response.status, url);
    return read(response);
  });
}

const getJson = (url) => get(url, (response) => response.json());

/*
 * xquad publishes docs from release tags only (QUI-1256): its `main` is a working branch,
 * and the portal must publish the book that shipped. A release build hook names its
 * pipeline in the POST body, which Netlify passed on as INCOMING_HOOK_BODY; that pipeline
 * must be a release tag's. With no body, take the newest release whose book built.
 */
async function resolveTag() {
  const pipelineId = new URLSearchParams(process.env.INCOMING_HOOK_BODY ?? "").get("pipeline_id");
  if (!pipelineId) return latestRelease();
  if (!/^\d+$/.test(pipelineId)) fail(`the build hook sent pipeline_id="${pipelineId}", which is not a pipeline id.`);
  const pipeline = await getJson(`${API}/pipelines/${pipelineId}`);
  if (pipeline.tag !== true || !RELEASE_TAG.test(pipeline.ref)) {
    fail(`pipeline ${pipelineId} is for "${pipeline.ref}", not a release tag. Refusing to publish it.`);
  }
  if (!(await hasBuiltBook(pipelineId))) fail(`pipeline ${pipelineId} has no successful "${JOB}" job.`);
  return pipeline.ref;
}

async function hasBuiltBook(pipelineId) {
  const jobs = await getJson(`${API}/pipelines/${pipelineId}/jobs?scope[]=success&per_page=100`);
  return jobs.some((job) => job.name === JOB);
}

/*
 * A tag is listable the moment it is pushed, but its docs:build lands minutes later, and a
 * tag whose pipeline fails never gets one. Stepping back to the previous release publishes
 * what is already live instead of turning that into a red build here. GitLab's version
 * sort puts v0.4.1-beta1 ahead of v0.4.1, so filter rather than trust the first tag.
 */
async function latestRelease() {
  const tags = await getJson(`${API}/repository/tags?order_by=version&per_page=100`);
  for (const tag of tags.filter((candidate) => RELEASE_TAG.test(candidate.name))) {
    const pipelines = await getJson(`${API}/pipelines?ref=${encodeURIComponent(tag.name)}&scope=tags&per_page=100`);
    for (const pipeline of pipelines) {
      if (await hasBuiltBook(pipeline.id)) return tag.name;
    }
    console.warn(`sync-xquad: release tag ${tag.name} has no successful "${JOB}" yet; trying the previous release.`);
  }
  fail(`no xquad release tag has a successful "${JOB}", so there is no shipped book to publish.`);
}

/*
 * File by file, not a tarball: GitLab answers 406 on both of its archive URLs for minutes at
 * a time, with no rate-limit headers, while these endpoints keep working. A hundred small
 * requests stay well inside the 500 a minute it allows an unauthenticated caller.
 */
async function downloadBook(tag, staging) {
  const ref = encodeURIComponent(tag);
  const files = [];
  for (let page = "1"; page; ) {
    const url = `${API}/repository/tree?path=${BOOK_PATH}&ref=${ref}&recursive=true&per_page=100&page=${page}`;
    const { entries, next } = await get(url, async (response) => ({
      entries: await response.json(),
      next: response.headers.get("x-next-page"),
    }));
    files.push(...entries.filter((entry) => entry.type === "blob").map((entry) => entry.path));
    page = next;
  }
  const wanted = files.filter((file) => file.endsWith(".md") || file.endsWith(".toml") || file.endsWith("/head.hbs"));
  let next = 0;
  await Promise.all(
    Array.from({ length: DOWNLOADS }, async () => {
      while (next < wanted.length) {
        const file = wanted[next++];
        const url = `${API}/repository/files/${encodeURIComponent(file)}/raw?ref=${ref}`;
        const text = await get(url, (response) => response.text());
        await mkdir(path.dirname(path.join(staging, file)), { recursive: true });
        await writeFile(path.join(staging, file), text);
      }
    }),
  );
  const book = path.join(staging, BOOK_PATH);
  if (!existsSync(path.join(book, "src/SUMMARY.md"))) {
    fail(`${tag} has no ${BOOK_PATH}/src/SUMMARY.md. Has the xquad layout changed?`);
  }
  return book;
}

// ---------- SUMMARY.md ----------

/* A SUMMARY path to its URL under /docs/xquad: a section's README is the folder's index. */
export function routeOf(source) {
  return source.replace(/\.md$/, "").replace(/(^|\/)(README|index)$/i, "").replace(/\/$/, "");
}

/** The chapter tree, plus any line this parser does not recognise. */
export function parseSummary(summary) {
  const roots = [];
  const stack = []; // { indent, chapter }, the chain of open list items
  const unknown = [];
  let appendix = false;
  for (const line of summary.split("\n")) {
    if (!line.trim() || /^#\s/.test(line)) continue;
    if (/^-{3,}\s*$/.test(line)) {
      appendix = true;
      stack.length = 0;
      continue;
    }
    const item = line.match(/^(\s*)[-*]\s+\[(.+)\]\(([^)]+\.md)\)\s*$/);
    const bare = line.match(/^\[(.+)\]\(([^)]+\.md)\)\s*$/);
    if (!item && !bare) {
      unknown.push(line);
      continue;
    }
    const chapter = { title: (item?.[2] ?? bare[1]), source: path.posix.normalize(item?.[3] ?? bare[2]), children: [], appendix };
    if (bare) {
      stack.length = 0;
      roots.push(chapter);
      continue;
    }
    const indent = item[1].length;
    while (stack.length && stack.at(-1).indent >= indent) stack.pop();
    (stack.at(-1)?.chapter.children ?? roots).push(chapter);
    stack.push({ indent, chapter });
  }
  return { roots, unknown };
}

const flatten = (chapters) => chapters.flatMap((chapter) => [chapter, ...flatten(chapter.children)]);

// ---------- mdBook to Markdown ----------

/* mdBook directives run before Markdown, fences included. Only whole-file and line-range
 * includes are understood; anything else stops the build rather than print literally. */
export function expandDirectives(markdown, source, readInclude) {
  return markdown.replace(/(\\?)\{\{#(\w+)\s*([^}]*?)\s*\}\}/g, (match, escaped, name, argument) => {
    if (escaped) return match.slice(1);
    if (name !== "include") throw new Error(`${source}: unsupported mdBook directive ${match}`);
    const [file, ...range] = argument.split(":");
    if (range.some((part) => part && !/^\d+$/.test(part))) throw new Error(`${source}: unsupported include anchor ${match}`);
    const lines = readInclude(path.posix.join(path.posix.dirname(source), file)).split("\n");
    if (!range.length) return lines.join("\n").replace(/\n$/, "");
    const start = range[0] ? Number(range[0]) - 1 : 0;
    const end = range.length === 1 ? start + 1 : range[1] ? Number(range[1]) : lines.length;
    return lines.slice(start, end).join("\n");
  });
}

/*
 * Split into fenced code and everything else, by CommonMark's rules: a closing fence is
 * the same character, at least as long, with nothing after it.
 *
 * One repair: a closing fence with prose run onto its line. That is a typo upstream
 * (cli/vm/dis.md at v0.5.0) which swallows the rest of the page into the code block.
 */
export function splitFences(markdown) {
  const blocks = [];
  let text = [];
  let code = null;
  const flush = () => {
    if (text.length) blocks.push({ type: "text", value: text.join("\n") });
    text = [];
  };
  for (const line of markdown.split("\n")) {
    if (code) {
      const closing = line.match(/^\s*(`{3,}|~{3,})(.*)$/);
      const closes = closing && closing[1][0] === code.fence[0] && closing[1].length >= code.fence.length;
      if (closes && !closing[2].trim()) {
        blocks.push({ type: "code", lines: [...code.lines, line], indent: code.indent, info: code.info });
        code = null;
      } else if (closes && code.fence[0] === "`" && /^\s+[A-Z]/.test(closing[2])) {
        blocks.push({ type: "code", lines: [...code.lines, line.slice(0, line.indexOf(closing[2]))], indent: code.indent, info: code.info });
        code = null;
        text.push("", closing[2].trim());
      } else {
        code.lines.push(line);
      }
      continue;
    }
    const opening = line.match(/^(\s*)(`{3,}|~{3,})(.*)$/);
    if (opening && !(opening[2][0] === "`" && opening[3].includes("`"))) {
      flush();
      code = { fence: opening[2], indent: opening[1], info: opening[3].trim(), lines: [line] };
      continue;
    }
    text.push(line);
  }
  flush();
  if (code) blocks.push({ type: "code", lines: code.lines, indent: code.indent, info: code.info, unclosed: true });
  return blocks;
}

/* MDX has no indented code blocks, and would run this into a paragraph. A list's
 * continuation lines are indented too, so only a block after unindented prose counts. */
export function fenceIndentedCode(markdown) {
  const out = [];
  let inFence = null;
  const lines = markdown.split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    const marker = lines[i].match(/^\s*(`{3,}|~{3,})/);
    if (marker) {
      if (!inFence) inFence = marker[1];
      else if (marker[1][0] === inFence[0] && marker[1].length >= inFence.length) inFence = null;
    }
    const startsBlock = !inFence && /^ {4}\S/.test(lines[i]) && out.at(-1) === "" && /^[^\s*+|>-]/.test(out.at(-2) ?? "") && !/^\d+[.)]\s/.test(out.at(-2) ?? "");
    if (!startsBlock) {
      out.push(lines[i]);
      continue;
    }
    out.push("```text");
    while (i < lines.length && /^ {4}/.test(lines[i])) out.push(lines[i++].slice(4));
    out.push("```");
    i -= 1;
  }
  return out.join("\n");
}

/*
 * Tokenise everything outside fences into text, inline code and math. mdBook math is
 * written \\( \\) and \\[ \\], with $$ $$ also accepted; a code span can hold any of those
 * literally, so all of it has to be found in one pass.
 */
export function tokenize(text) {
  const tokens = [];
  let plain = "";
  const push = (token) => {
    if (plain) tokens.push({ type: "text", value: plain });
    plain = "";
    tokens.push(token);
  };
  const delimiters = [
    { open: "\\\\(", close: "\\\\)", type: "inline" },
    { open: "\\\\[", close: "\\\\]", type: "display" },
    { open: "$$", close: "$$", type: "display" },
  ];
  let i = 0;
  while (i < text.length) {
    const delimiter = delimiters.find((d) => text.startsWith(d.open, i));
    if (delimiter) {
      const end = text.indexOf(delimiter.close, i + delimiter.open.length);
      if (end !== -1 && !text.slice(i, end).includes("\n\n")) {
        push({ type: delimiter.type, value: normalizeMath(text.slice(i + delimiter.open.length, end)) });
        i = end + delimiter.close.length;
        continue;
      }
    }
    if (text[i] === "\\" && i + 1 < text.length) {
      plain += text.slice(i, i + 2);
      i += 2;
      continue;
    }
    if (text[i] === "`") {
      const run = text.slice(i).match(/^`+/)[0];
      const close = new RegExp(`(?<!\`)${run}(?!\`)`, "g");
      close.lastIndex = i + run.length;
      const found = close.exec(text);
      if (found && !text.slice(i, found.index).includes("\n\n")) {
        push({ type: "code", value: text.slice(i, found.index + run.length) });
        i = found.index + run.length;
        continue;
      }
      plain += run;
      i += run.length;
      continue;
    }
    plain += text[i];
    i += 1;
  }
  if (plain) tokens.push({ type: "text", value: plain });
  return tokens;
}

/* Markdown turned \\ into \ before MathJax saw it, so the source doubles what it needs
 * to survive: \\{ means \{. Singles are left alone: \{ was meant as a literal brace too,
 * and only printed bare in the old book because Markdown ate the backslash. */
function normalizeMath(body) {
  return body.replace(/\\\\/g, "\\").replace(/\s*\n\s*/g, " ").trim();
}

/* Link targets: relative .md and folder links become site URLs; anything unresolved is
 * collected, because a dead link is a build failure rather than a surprise. */
export function linkResolver(routes, errors) {
  return (target, source) => {
    if (/^([a-z][a-z0-9+.-]*:|\/\/|#)/i.test(target)) return target;
    const [file, hash] = target.split(/(?=#)/);
    const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(source), file));
    const route = routes.get(resolved) ?? routes.get(`${resolved.replace(/\/$/, "")}/README.md`.replace(/^\.\//, ""));
    if (route === undefined) {
      errors.push(`${source}: link to "${target}" matches no page in SUMMARY.md`);
      return target;
    }
    return `${ROUTE}${route ? `/${route}` : ""}${hash ?? ""}`;
  };
}

function rewriteLinks(text, source, resolveLink) {
  return text
    .replace(/\]\(\s*<?([^)\s>]+)>?((?:\s+"[^"]*")?)\s*\)/g, (_, target, title) => `](${resolveLink(target, source)}${title})`)
    .replace(/^(\s*\[[^\]]+\]:\s+)(\S+)/gm, (_, label, target) => `${label}${resolveLink(target, source)}`)
    .replace(/href="([^"]+)"/g, (_, target) => `href="${resolveLink(target, source)}"`);
}

const KNOWN_TAGS = new Set("a b br code details div em i img kbd p span strong sub summary sup".split(" "));

/* Anything in prose that MDX would read as JSX or an expression. */
function escapeProse(text) {
  return text
    .replace(/<(https?:\/\/[^>\s]+)>/g, "[$1]($1)")
    .replace(/(?<!\\)[{}]/g, (brace) => `\\${brace}`)
    .replace(/(?<!\\)<(?!\/?([A-Za-z][\w-]*)\b[^<>\n]*>)/g, "&lt;")
    .replace(/(?<!\\)<\/?([A-Za-z][\w-]*)/g, (match, tag) => (KNOWN_TAGS.has(tag.toLowerCase()) ? match : match.replace("<", "&lt;")))
    .replace(/<(br|img)\b([^>]*?)\s*\/?>/gi, (_, tag, attributes) => `<${tag}${attributes} />`)
    // A line starting "import " or "export " would be read as an ES module statement.
    .replace(/^(\s*)([ie])(mport|xport)(?=\s)/gm, (_, indent, first, rest) => `${indent}&#${first.charCodeAt(0)};${rest}`)
    // mdBook's smart punctuation, which it applies to prose and the old book showed.
    .replace(/(^|[\s>])--(?=\s|$)/gm, "$1–");
}

/* The whole line a token sits on, to tell a display equation from one inside a sentence. */
function isAloneOnLine(before, after) {
  return /(^|\n)[ \t]*$/.test(before) && /^[ \t]*(\n|$)/.test(after);
}

function renderTokens(tokens, renderText, renderMath) {
  let out = "";
  tokens.forEach((token, index) => {
    if (token.type === "text") out += renderText(token.value);
    else if (token.type === "code") out += token.value;
    else {
      const after = tokens[index + 1]?.value ?? "";
      const alone = token.type === "display" && tokens[index + 1]?.type !== "code" && isAloneOnLine(out, after);
      const inTable = /(^|\n)[ \t]*\|[^\n]*$/.test(out);
      out += renderMath(token, { alone, inTable, indent: out.match(/(?:^|\n)([ \t]*)$/)?.[1] ?? "" });
    }
  });
  return out;
}

/* A closed code span or fence is fine to leave; an info string needs Shiki's name. */
function normalizeFence(block) {
  const [first, ...rest] = block.lines;
  const language = block.info.split(/[\s,]/)[0];
  const fixed = { pycon: "python" }[language] ?? language;
  return [first.replace(block.info, fixed), ...rest].join("\n");
}

const CALLOUT = {
  NOTE: ["info", "Note"],
  TIP: ["info", "Tip"],
  IMPORTANT: ["warn", "Important"],
  WARNING: ["warn", "Warning"],
  CAUTION: ["error", "Caution"],
};

/** GitHub-style admonitions, which mdBook renders; the book has none at v0.5.0. */
function admonitionsToCallouts(markdown) {
  return markdown.replace(/^> \[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*\n((?:>.*(?:\n|$))*)/gm, (_, kind, body) => {
    const [type, title] = CALLOUT[kind];
    const content = body.replace(/^> ?/gm, "").trim();
    return `<Callout type="${type}" title="${title}">\n\n${content}\n\n</Callout>\n`;
  });
}

/** Comments out, then math, links and escapes, for one page: the MDX and the twin. */
export function convert(markdown, source, resolveLink) {
  const blocks = splitFences(markdown);
  if (blocks.some((block) => block.unclosed)) throw new Error(`${source}: a code fence is never closed`);
  let mdx = "";
  let twin = "";
  const join = (block) => (block === blocks[0] ? "" : "\n");
  for (const block of blocks) {
    if (block.type === "code") {
      const fence = normalizeFence(block);
      mdx += join(block) + fence;
      twin += join(block) + fence;
      continue;
    }
    const tokens = tokenize(block.value.replace(/<!--[\s\S]*?-->\n*/g, ""));
    const links = (value) => rewriteLinks(value, source, resolveLink);
    mdx += join(block) + renderTokens(
      tokens,
      (value) => escapeProse(links(value)),
      ({ value }, { alone, inTable, indent }) => {
        if (alone) return `$$\n${indent}${value}\n${indent}$$`;
        // Only $$ opens math, see src/lib/source.ts. A bare | would end the table cell.
        return `$$${inTable ? value.replace(/\|/g, "\\vert ") : value}$$`;
      },
    );
    twin += join(block) + renderTokens(
      tokens,
      links,
      ({ type, value }, { alone, inTable, indent }) => {
        if (type === "inline" || !alone) return `$${inTable ? value.replace(/\|/g, "\\vert ") : value}$`;
        return `$$\n${indent}${value}\n${indent}$$`;
      },
    );
  }
  return { mdx: admonitionsToCallouts(mdx), twin };
}

/** The page's leading H1, for the twin index. The body keeps it. */
export function takeTitle(mdx, fallback) {
  const match = mdx.match(/^\s*# +(.+)\n*/);
  if (!match) return { title: fallback, body: mdx };
  const title = match[1]
    .replace(/&lt;/g, "<")
    .replace(/\\([{}])/g, "$1")
    .replace(/[`*]/g, "")
    .trim();
  return { title, body: mdx.slice(match[0].length) };
}

// ---------- the Fumadocs tree ----------

const fileOf = (chapter) => {
  const route = routeOf(chapter.source);
  return /(^|\/)(README|index)\.md$/i.test(chapter.source) ? path.posix.join(route, "index") : route;
};

/*
 * The sidebar follows SUMMARY.md, but URLs must follow the source paths, and the two do
 * not agree: solving/ and running/ are children of modelling/, and solving/quip-network.md
 * is a page with children but no folder of its own. Fumadocs builds the tree from meta.json
 * files, whose `pages` and `pagesIndex` may point anywhere with "../". So a chapter with
 * children gets its own folder's meta.json when its source is a README, or an otherwise
 * empty (route group) beside its page, which adds nothing to URLs.
 */
const folderOf = (chapter) => {
  if (!chapter.children.length) return null;
  const route = routeOf(chapter.source);
  if (/(^|\/)(README|index)\.md$/i.test(chapter.source)) return route;
  return path.posix.join(path.posix.dirname(route), `(${path.posix.basename(route)})`);
};

export function buildMetas(roots) {
  const metas = new Map();
  const ref = (chapter, from) => path.posix.relative(from, folderOf(chapter) ?? fileOf(chapter));
  const visit = (chapter) => {
    const folder = folderOf(chapter);
    if (!folder) return;
    const meta = { title: chapter.title };
    if (!/(^|\/)(README|index)\.md$/i.test(chapter.source)) meta.pagesIndex = ref({ ...chapter, children: [] }, folder);
    meta.pages = chapter.children.map((child) => ref(child, folder));
    metas.set(folder, meta);
    chapter.children.forEach(visit);
  };
  roots.forEach(visit);
  const pages = [];
  let inAppendix = false;
  for (const chapter of roots) {
    if (chapter.appendix && !inAppendix) {
      pages.push("---Appendix---");
      inAppendix = true;
    }
    pages.push(ref(chapter, ""));
  }
  metas.set("", { title: "XQuad", description: DESCRIPTION, root: true, pages });
  return metas;
}

// ---------- run ----------

async function main() {
  const staging = await mkdtemp(path.join(os.tmpdir(), "quip-xquad-source-"));
  try {
    const tag = await resolveTag();
    console.log(`sync-xquad: taking the book from release tag ${tag}.`);
    const book = await downloadBook(tag, staging);
    const srcRoot = path.join(book, "src");

    /* The QUI-988 pre-launch gate lives in the book's own theme. Assert it survived, and
     * carry it over as noindex on every page: losing it here would publish the book to the
     * host that owns the docs canonical. To launch, xquad deletes the tag from head.hbs,
     * and this check and the `noindex` line below are deleted in the same change. */
    const head = await readFile(path.join(book, "theme/head.hbs"), "utf8").catch(() => "");
    if (!/<meta\s+name="robots"\s+content="noindex, nofollow">/.test(head)) {
      fail("the book is no longer noindex; QUI-988's gate must be lifted deliberately, not here.");
    }

    const summary = await readFile(path.join(srcRoot, "SUMMARY.md"), "utf8");
    const { roots, unknown } = parseSummary(summary);
    if (unknown.length) fail(`SUMMARY.md has lines this script cannot read:\n${unknown.join("\n")}`);
    const chapters = flatten(roots);
    if (chapters.length < PAGE_FLOOR) fail(`only ${chapters.length} pages in SUMMARY.md, expected at least ${PAGE_FLOOR}.`);
    if (!chapters.some((chapter) => routeOf(chapter.source) === "")) fail("SUMMARY.md has no README.md; /docs/xquad would 404.");
    const sources = chapters.map((chapter) => chapter.source);
    const repeated = sources.find((source, index) => sources.indexOf(source) !== index);
    if (repeated) fail(`SUMMARY.md lists ${repeated} twice.`);

    const routes = new Map(chapters.map((chapter) => [chapter.source, routeOf(chapter.source)]));
    await checkMoved(book, new Set(routes.values()));

    const errors = [];
    const resolveLink = linkResolver(routes, errors);
    const output = path.join(staging, "out");
    const contentOut = path.join(output, "content");
    const publicOut = path.join(output, "public");
    await mkdir(contentOut, { recursive: true });
    await mkdir(publicOut, { recursive: true });

    const index = [
      "# XQuad documentation",
      "",
      `> ${DESCRIPTION}. Each page below is the Markdown twin of a page under ${SITE_URL}${ROUTE}.`,
      "",
    ];
    let rootTwin;
    const sectionOf = new Map(roots.flatMap((root) => flatten([root]).map((chapter) => [chapter, root.title])));

    for (const chapter of chapters) {
      const raw = await readFile(path.join(srcRoot, chapter.source), "utf8").catch(() =>
        fail(`SUMMARY.md lists ${chapter.source}, which is not in the book.`),
      );
      const expanded = expandDirectives(raw, chapter.source, (file) => {
        const included = path.join(srcRoot, file);
        if (!existsSync(included)) throw new Error(`${chapter.source}: include of ${file}, which is not in the book`);
        return readFileSync(included, "utf8");
      });
      const { mdx, twin } = convert(fenceIndentedCode(expanded), chapter.source, resolveLink);
      // The H1 stays in the body, as the old book printed it. The sidebar and <title> use
      // SUMMARY's label, as mdBook did.
      const { title } = takeTitle(mdx, chapter.title);
      const body = mdx;
      const route = routeOf(chapter.source);
      const frontmatter = [`title: ${JSON.stringify(chapter.title)}`, "noindex: true"].join("\n");
      const contentPath = path.join(contentOut, `${fileOf(chapter)}.mdx`);
      await mkdir(path.dirname(contentPath), { recursive: true });
      await writeFile(contentPath, `---\n${frontmatter}\n---\n\n${body.trim()}\n`);

      const hasHeading = /^\s*# /.test(twin);
      const twinText = `${hasHeading ? "" : `# ${title}\n\n`}${twin.trim()}\n`;
      if (route) {
        const twinPath = path.join(publicOut, `${route}.md`);
        await mkdir(path.dirname(twinPath), { recursive: true });
        await writeFile(twinPath, twinText);
      } else {
        rootTwin = twinText;
      }
      const url = `${SITE_URL}${ROUTE}${route ? `/${route}` : ""}.md`;
      index.push(`- [${title}](${url}): ${sectionOf.get(chapter)}.`);
    }

    if (errors.length) fail(`links that do not resolve:\n${[...new Set(errors)].join("\n")}`);

    for (const [folder, meta] of buildMetas(roots)) {
      const metaPath = path.join(contentOut, folder, "meta.json");
      await mkdir(path.dirname(metaPath), { recursive: true });
      await writeFile(metaPath, `${JSON.stringify(meta, null, 2)}\n`);
    }
    await writeFile(path.join(publicOut, "llms.txt"), `${index.join("\n")}\n`);

    // Everything converted, so only now replace what was there.
    await rm(CONTENT, { recursive: true, force: true });
    await rm(PUBLIC, { recursive: true, force: true });
    await mkdir(path.dirname(CONTENT), { recursive: true });
    await mkdir(path.dirname(PUBLIC), { recursive: true });
    await cp(contentOut, CONTENT, { recursive: true });
    await cp(publicOut, PUBLIC, { recursive: true });
    await writeFile(ROOT_TWIN, rootTwin);
    console.log(`sync-xquad: wrote ${chapters.length} pages from ${tag}.`);
  } catch (error) {
    fail(error.message);
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

const htmlToRoute = (file) => file.replace(/^\//, "").replace(/\.html$/, "").replace(/(^|\/)index$/, "");

/* Every mdBook redirect has to be answered by src/proxy.ts, or a published URL dies when
 * xquad moves a page. And every redirect target has to still exist. */
async function checkMoved(book, routes) {
  const moved = JSON.parse(await readFile(MOVED, "utf8"));
  const toml = await readFile(path.join(book, "book.toml"), "utf8");
  const section = toml.split("[output.html.redirect]")[1]?.split(/^\[/m)[0] ?? "";
  for (const [, from, to] of section.matchAll(/^"([^"]+)"\s*=\s*"([^"]+)"/gm)) {
    const key = htmlToRoute(from);
    const target = htmlToRoute(path.posix.join(path.posix.dirname(from), to));
    if (moved[key] !== target) {
      fail(`book.toml redirects ${from} to ${to}, but src/data/xquad-moved.json sends "${key}" to "${moved[key]}". Add it there.`);
    }
  }
  for (const [from, to] of Object.entries(moved)) {
    if (!routes.has(to)) fail(`src/data/xquad-moved.json sends "${from}" to "${to}", which is no longer a page.`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
