import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const projectRoot = path.resolve(import.meta.dirname, "..");
const sourceRoot = path.resolve(process.argv[2] ?? path.join(projectRoot, ".docs-source/gitbook"));
const contentRoot = path.join(projectRoot, "src/content/docs");
const publicRoot = path.join(projectRoot, "public/docs");
const rootMirror = path.join(projectRoot, "public/docs.md");
const slugify = (value) => value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const summaryPath = path.join(sourceRoot, "SUMMARY.md");
const summary = await readFile(summaryPath, "utf8").catch(() => {
  throw new Error(`Cannot read ${summaryPath}. Pass the GitBook checkout as the first argument.`);
});

let group = "Overview";
let order = 0;
const pages = [];
for (const line of summary.split("\n")) {
  const heading = line.match(/^##\s+(.+)$/);
  if (heading) {
    group = heading[1].trim();
    continue;
  }
  const item = line.match(/^\* \[([^\]]+)\]\(([^)]+\.md)\)$/);
  if (!item) continue;
  const [, title, sourcePath] = item;
  const basename = path.basename(sourcePath, ".md");
  const route = sourcePath === "README.md" ? "" : `${slugify(group)}/${basename}`;
  pages.push({ title, sourcePath, route, group, order: order++ });
}
if (pages.length < 19) throw new Error(`Expected at least 19 pages in SUMMARY.md, found ${pages.length}.`);

const routeBySource = new Map(pages.map((page) => [page.sourcePath, page.route]));
const splitFrontmatter = (markdown) => {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n?/);
  return match ? { frontmatter: match[1], body: markdown.slice(match[0].length) } : { frontmatter: "", body: markdown };
};

function normalizeBody(markdown, sourcePath) {
  const sourceDir = path.posix.dirname(sourcePath);
  const resolveLink = (target, hash = "") => {
    const resolved = path.posix.normalize(path.posix.join(sourceDir, target));
    const route = routeBySource.get(resolved);
    return route === undefined ? undefined : `/docs${route ? `/${route}` : ""}${hash}`;
  };
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
  return normalized.join("\n")
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

await rm(contentRoot, { recursive: true, force: true });
await rm(publicRoot, { recursive: true, force: true });
await rm(rootMirror, { force: true });
await mkdir(contentRoot, { recursive: true });
await mkdir(publicRoot, { recursive: true });
const full = [];
const index = ["# Quip Network documentation", "", "> Technical documentation for Quip Network.", ""];

for (const page of pages) {
  const raw = await readFile(path.join(sourceRoot, page.sourcePath), "utf8");
  const { frontmatter, body } = splitFrontmatter(raw);
  const normalized = `${normalizeBody(body, page.sourcePath).trim()}\n`;
  const metadata = [
    frontmatter.replace(/^cover:.*\n?/gm, "").trim(),
    `title: ${JSON.stringify(page.title)}`,
    `group: ${JSON.stringify(page.group)}`,
    `order: ${page.order}`,
    `route: ${JSON.stringify(page.route)}`,
    `source_path: ${JSON.stringify(page.sourcePath)}`,
  ].filter(Boolean).join("\n");
  const relativeOutput = page.route ? `${page.route}.md` : "index.md";
  const contentPath = path.join(contentRoot, relativeOutput);
  const mirrorPath = page.route ? path.join(publicRoot, relativeOutput) : rootMirror;
  await mkdir(path.dirname(contentPath), { recursive: true });
  await mkdir(path.dirname(mirrorPath), { recursive: true });
  await writeFile(contentPath, `---\n${metadata}\n---\n\n${normalized}`);
  await writeFile(mirrorPath, normalized);
  const url = `https://developers.quip.network/docs${page.route ? `/${page.route}` : ""}.md`;
  index.push(`- [${page.title}](${url}): ${page.group}.`);
  full.push(normalized);
}

await cp(path.join(sourceRoot, ".gitbook/assets"), path.join(publicRoot, "assets"), { recursive: true });
await writeFile(path.join(publicRoot, "llms.txt"), `${index.join("\n")}\n`);
await writeFile(path.join(publicRoot, "llms-full.txt"), full.join("\n---\n\n"));
const files = await readdir(contentRoot, { recursive: true });
console.log(`Synced ${pages.length} pages and ${files.filter((file) => file.endsWith(".md")).length} entries from ${sourceRoot}.`);
