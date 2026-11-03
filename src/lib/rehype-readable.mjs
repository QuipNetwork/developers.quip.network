/*
 * Two typographic rules applied to every page at build, so no page needs its own fixes.
 *
 * 1. No stranded last word. In paragraphs, list items, table cells and captions, the last two
 *    words are joined with a no-break space, so a line can never end up holding one short word.
 *    Text is otherwise unchanged, and the Markdown twins do not pass through here.
 * 2. Tables can stack. Each cell records its column's header in data-label, so on small screens
 *    a row reads as label and value (see global.css) rather than scrolling sideways.
 */
const NBSP = " ";
const JOIN = new Set(["p", "li", "td", "th", "figcaption", "dt", "dd"]);
// Inline code, math and nested blocks are left alone.
const SKIP = new Set(["code", "pre", "ul", "ol", "table", "svg", "math", "kbd"]);
const MAX_LAST_WORD = 14;

function lastTextNode(node) {
  const children = node.children ?? [];
  for (let i = children.length - 1; i >= 0; i--) {
    const child = children[i];
    if (child.type === "text") {
      if (child.value.trim()) return child;
      continue;
    }
    if (child.type === "element") {
      if (SKIP.has(child.tagName)) return null;
      if (String(child.properties?.className ?? "").includes("katex")) return null;
      const found = lastTextNode(child);
      if (found) return found;
      continue;
    }
    if (child.type === "mdxJsxTextElement") return null;
  }
  return null;
}

function joinLastWords(node) {
  const text = lastTextNode(node);
  if (!text) return;
  const match = text.value.match(/^([\s\S]*\S)[ \t\n]+(\S+)(\s*)$/);
  if (!match || match[2].length > MAX_LAST_WORD) return;
  text.value = `${match[1]}${NBSP}${match[2]}${match[3]}`;
}

function textOf(node) {
  if (node.type === "text") return node.value;
  return (node.children ?? []).map(textOf).join("");
}

function labelTable(table) {
  const rows = [];
  const collect = (node) => {
    for (const child of node.children ?? []) {
      if (child.type !== "element") continue;
      if (child.tagName === "tr") rows.push(child);
      else if (child.tagName === "thead" || child.tagName === "tbody") collect(child);
    }
  };
  collect(table);
  const cellsOf = (row) => (row.children ?? []).filter((c) => c.type === "element" && (c.tagName === "td" || c.tagName === "th"));
  const header = rows.find((row) => cellsOf(row).every((c) => c.tagName === "th"));
  if (!header) return;
  const labels = cellsOf(header).map((c) => textOf(c).trim());
  for (const row of rows) {
    if (row === header) continue;
    cellsOf(row).forEach((cell, index) => {
      cell.properties = { ...cell.properties, "data-label": labels[index] ?? "" };
    });
  }
}

function walk(node) {
  if (node.type === "element") {
    if (node.tagName === "table") labelTable(node);
    if (JOIN.has(node.tagName)) joinLastWords(node);
  }
  for (const child of node.children ?? []) walk(child);
}

export function rehypeReadable() {
  return (tree) => walk(tree);
}
