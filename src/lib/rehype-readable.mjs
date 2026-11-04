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

/** Ends in inline code: tie that code to the word before it, when the code is short. */
function joinBeforeTrailingCode(node) {
  const children = (node.children ?? []).filter((c) => !(c.type === "text" && !c.value.trim()));
  const last = children[children.length - 1];
  const before = children[children.length - 2];
  if (!last || last.type !== "element" || last.tagName !== "code") return;
  if (textOf(last).length > MAX_LAST_WORD + 6) return;
  if (before?.type === "text" && /[ \t\n]+$/.test(before.value)) before.value = before.value.replace(/[ \t\n]+$/, NBSP);
}

function joinLastWords(node) {
  joinBeforeTrailingCode(node);
  const text = lastTextNode(node);
  if (!text) return;
  const match = text.value.match(/^([\s\S]*\S)?[ \t\n]+(\S+)(\s*)$/);
  if (!match || match[2].length > MAX_LAST_WORD) return;
  // With nothing before it in this node, the word follows inline code or a link: tie it to that.
  text.value = `${match[1] ?? ""}${NBSP}${match[2]}${match[3]}`;
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

/*
 * Tables holding long values in two or more columns, such as contract addresses, cannot fit
 * side by side at any width. They read as label and value everywhere.
 */
const LONG_VALUE = 30;

function needsStacking(table) {
  const columns = new Set();
  const scan = (node) => {
    for (const child of node.children ?? []) {
      if (child.type !== "element") continue;
      if (child.tagName === "tr") {
        child.children
          .filter((c) => c.type === "element" && c.tagName === "td")
          .forEach((cell, index) => {
            const hasLongCode = (n) =>
              n.type === "element" && n.tagName === "code" ? textOf(n).length >= LONG_VALUE : (n.children ?? []).some(hasLongCode);
            if (hasLongCode(cell)) columns.add(index);
          });
      } else scan(child);
    }
  };
  scan(table);
  return columns.size >= 2;
}

function walk(node) {
  if (node.type === "element") {
    if (node.tagName === "table") {
      labelTable(node);
      if (needsStacking(node)) node.properties = { ...node.properties, "data-stack": "true" };
    }
    if (JOIN.has(node.tagName)) joinLastWords(node);
  }
  for (const child of node.children ?? []) walk(child);
}

export function rehypeReadable() {
  return (tree) => walk(tree);
}
