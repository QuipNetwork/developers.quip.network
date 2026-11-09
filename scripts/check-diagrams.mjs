#!/usr/bin/env node
/**
 * Proves the hand-drawn diagrams say exactly what their Mermaid sources say.
 *
 * For every *.data.ts in src/components/diagrams:
 *   1. source: its chart text is, exactly, a mermaid fence in the file it names. If not, the
 *      site is falling back to Mermaid for that page and this drawing is stale.
 *   2. data: the Mermaid source, parsed here, matches the exported data both ways: nodes and
 *      their label lines, emphasis, edges with from, to, label and style, groups and members.
 *   3. geometry: in each layout, every route starts on its `from` border and ends on its `to`
 *      border, misses other nodes, and labels clear nodes, other lines and each other.
 *   4. rendered: the page served by a running site shows this diagram, not the Mermaid fallback,
 *      and each drawing's real text, line styles and arrowheads match the data both ways.
 *
 * It also fails on any mermaid fence in docs/ or content/docs/ with no drawing, so a new
 * diagram gets noticed even though the site handles it by falling back.
 *
 * A drawing of an image (`kind: "figure"`) has no chart to parse: its data was transcribed by eye.
 * Instead it checks the image's hash, so a replaced image fails, and that each page still names the
 * image with the same alt text and caption, then runs steps 3 and 4 the same way.
 *
 * Usage: node scripts/check-diagrams.mjs [--base http://localhost:3000] [--static]
 * --static skips step 4, which needs `next dev` or `next start` running at --base.
 * Needs Node 22.18+ (it imports the .data.ts files directly) and a synced content/docs:
 * npm run docs:sync && npm run xquad:sync
 */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import net from "node:net";

// Node gives each address 250 ms to connect; under load that cutoff reports ETIMEDOUT for
// a server that is fine. See check-mcp.mjs.
net.setDefaultAutoSelectFamilyAttemptTimeout(2000);

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const diagramsDir = join(root, "src/components/diagrams");

const args = process.argv.slice(2);
const staticOnly = args.includes("--static");
const base = args.includes("--base") ? args[args.indexOf("--base") + 1] : "http://localhost:3000";

const { EDGE_LINE, EDGE_SIZE, GROUP_LABEL_BASELINE, GROUP_LABEL_INSET_X, MONO_ADVANCE, WEIGHT_SIZE } = await import(
  pathToFileURL(join(diagramsDir, "metrics.ts")).href
);

/* ---------- Mermaid parsing (the flowchart subset these docs use) ---------- */

const ARROWS = { "<-->": "both", "-->": "arrow", "==>": "thick", "---": "line" };
const NODE_REF = String.raw`[A-Za-z0-9_]+(?:\[[^\]]*\])?`;
const EDGE_RE = new RegExp(String.raw`^(${NODE_REF})\s*(<-->|-->|==>|---)\s*(?:\|([^|]*)\|)?\s*(${NODE_REF})$`);

function parseLabel(raw) {
  const text = raw.trim().replace(/^"(.*)"$/, "$1");
  const parts = text.split(/<br\s*\/?>/);
  const lines = parts.map((p) => p.replace(/<[^>]+>/g, "").trim());
  const bold = parts.map((p) => /<b>/.test(p));
  return { lines, bold };
}

function parseMermaid(source) {
  const [header, ...rest] = source.split("\n").map((l) => l.trim());
  if (!/^(flowchart|graph)\s+(LR|TD|TB|RL|BT)$/.test(header)) throw new Error(`unsupported header: ${header}`);

  const nodes = new Map();
  const edges = [];
  const groups = new Map();
  const stack = [];
  const emphasis = new Set();
  const raised = new Set();

  const addChild = (id) => {
    const g = stack.at(-1);
    if (g && !groups.get(g).children.includes(id)) groups.get(g).children.push(id);
  };
  const seeNode = (ref, inBody) => {
    const m = ref.match(/^([A-Za-z0-9_]+)(?:\[(.*)\])?$/);
    if (!m) throw new Error(`cannot parse node: ${ref}`);
    const [, id, label] = m;
    if (label !== undefined) nodes.set(id, parseLabel(label));
    else if (!nodes.has(id) && !groups.has(id)) nodes.set(id, { lines: [id], bold: [false] });
    if (inBody) addChild(id);
    return id;
  };

  for (const line of rest) {
    if (!line) continue;
    let m;
    if ((m = line.match(/^subgraph\s+([A-Za-z0-9_]+)\[(.*)\]$/))) {
      addChild(m[1]);
      groups.set(m[1], { label: parseLabel(m[2]).lines.join(" "), children: [] });
      stack.push(m[1]);
    } else if (line === "end") {
      stack.pop();
    } else if ((m = line.match(/^style\s+([A-Za-z0-9_]+)\s/))) {
      raised.add(m[1]);
    } else if (/^classDef\s/.test(line)) {
      if (!/^classDef\s+quip\s/.test(line)) throw new Error(`unknown classDef: ${line}`);
    } else if ((m = line.match(/^class\s+([A-Za-z0-9_,]+)\s+quip$/))) {
      for (const id of m[1].split(",")) emphasis.add(id);
    } else if ((m = line.match(EDGE_RE))) {
      const from = seeNode(m[1], stack.length > 0);
      const to = seeNode(m[4], stack.length > 0);
      edges.push({ from, to, style: ARROWS[m[2]], label: m[3] === undefined ? [] : parseLabel(m[3]).lines });
    } else if (new RegExp(`^${NODE_REF}$`).test(line)) {
      seeNode(line, stack.length > 0);
    } else {
      throw new Error(`cannot parse line: ${line}`);
    }
  }
  /* A subgraph id referenced before or after its definition is a group, not a node. */
  for (const id of groups.keys()) nodes.delete(id);
  for (const g of groups.values()) g.children = g.children.filter((c) => nodes.has(c) || groups.has(c));
  return { nodes, edges, groups, emphasis, raised };
}

/* ---------- Files ---------- */

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.mdx?$/.test(name)) out.push(path);
  }
  return out;
}

function fencesIn(file) {
  return [...readFileSync(file, "utf8").matchAll(/^```mermaid\r?\n([\s\S]*?)^```\s*$/gm)].map((m) => m[1].trim());
}

/* ---------- Comparing ---------- */

const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const edgeKey = (e) => JSON.stringify([e.from, e.to, e.style, e.label ?? []]);

function diffMultiset(name, want, got, fail) {
  const counts = new Map();
  for (const w of want) counts.set(w, (counts.get(w) ?? 0) + 1);
  for (const g of got) counts.set(g, (counts.get(g) ?? 0) - 1);
  for (const [k, v] of counts) {
    if (v > 0) fail(`${name}: missing ${k}${v > 1 ? ` (x${v})` : ""}`);
    if (v < 0) fail(`${name}: extra ${k}${v < -1 ? ` (x${-v})` : ""}`);
  }
}

function checkData(data, fail) {
  let parsed;
  try {
    parsed = parseMermaid(data.source);
  } catch (e) {
    fail(`data: ${e.message}`);
    return null;
  }

  diffMultiset(
    "nodes",
    [...parsed.nodes.keys()],
    data.nodes.map((n) => n.id),
    fail,
  );
  for (const n of data.nodes) {
    const src = parsed.nodes.get(n.id);
    if (!src) continue;
    if (!eq(src.lines, n.lines))
      fail(`node ${n.id}: label ${JSON.stringify(n.lines)} != source ${JSON.stringify(src.lines)}`);
    const boldCount = src.bold.filter(Boolean).length;
    if (boldCount && boldCount !== (n.nameLines ?? n.lines.length))
      fail(`node ${n.id}: source sets ${boldCount} line(s) as its name`);
    if (parsed.emphasis.has(n.id) !== Boolean(n.emphasis)) fail(`node ${n.id}: emphasis differs from source`);
  }

  diffMultiset("edges", parsed.edges.map(edgeKey), data.edges.map(edgeKey), fail);
  const ids = data.edges.map((e) => e.id);
  if (new Set(ids).size !== ids.length) fail("edges: duplicate id");

  diffMultiset(
    "groups",
    [...parsed.groups.keys()],
    data.groups.map((g) => g.id),
    fail,
  );
  for (const g of data.groups) {
    const src = parsed.groups.get(g.id);
    if (!src) continue;
    if (src.label !== g.label) fail(`group ${g.id}: label ${g.label} != source ${src.label}`);
    diffMultiset(`group ${g.id} members`, src.children, g.children, fail);
    if (parsed.raised.has(g.id) !== Boolean(g.raised)) fail(`group ${g.id}: raised differs from source`);
  }
  return parsed;
}

/* ---------- Geometry ---------- */

const NEAR = 0.51;

function onBorder([x, y], b) {
  const inX = x >= b.x - NEAR && x <= b.x + b.w + NEAR;
  const inY = y >= b.y - NEAR && y <= b.y + b.h + NEAR;
  const onX = Math.abs(x - b.x) <= NEAR || Math.abs(x - (b.x + b.w)) <= NEAR;
  const onY = Math.abs(y - b.y) <= NEAR || Math.abs(y - (b.y + b.h)) <= NEAR;
  return (onX && inY) || (onY && inX);
}

/** Liang-Barsky: does the segment enter the rectangle's interior, shrunk by `shrink`? */
function segmentHitsBox([x1, y1], [x2, y2], b, shrink = 0.6) {
  const [l, r, t, bm] = [b.x + shrink, b.x + b.w - shrink, b.y + shrink, b.y + b.h - shrink];
  if (l >= r || t >= bm) return false;
  let [u0, u1] = [0, 1];
  const [dx, dy] = [x2 - x1, y2 - y1];
  for (const [p, q] of [
    [-dx, x1 - l],
    [dx, r - x1],
    [-dy, y1 - t],
    [dy, bm - y1],
  ]) {
    if (p === 0) {
      if (q < 0) return false;
    } else {
      const u = q / p;
      if (p < 0) u0 = Math.max(u0, u);
      else u1 = Math.min(u1, u);
      if (u0 > u1) return false;
    }
  }
  return true;
}

const boxesOverlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const contains = (outer, inner) =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  inner.x + inner.w <= outer.x + outer.w &&
  inner.y + inner.h <= outer.y + outer.h;

function labelBox(label, lines) {
  const size = label.knockout ? WEIGHT_SIZE : EDGE_SIZE;
  const width = Math.max(...lines.map((l) => l.length)) * size * MONO_ADVANCE;
  const anchor = label.anchor ?? "middle";
  const x = anchor === "middle" ? label.x - width / 2 : anchor === "end" ? label.x - width : label.x;
  return { x, y: label.y - 9, w: width, h: 12 + (lines.length - 1) * EDGE_LINE };
}

function segmentsCross([a, b], [c, d]) {
  const orient = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const [d1, d2, d3, d4] = [orient(c, d, a), orient(c, d, b), orient(a, b, c), orient(a, b, d)];
  return d1 * d2 < 0 && d3 * d4 < 0;
}

const words = (lines) => lines.join(" ").split(/\s+/).join(" ");

function ancestors(data, id) {
  const out = [];
  let g = data.groups.find((x) => x.children.includes(id));
  while (g) {
    out.push(g.id);
    g = data.groups.find((x) => x.children.includes(g.id));
  }
  return out;
}

function descendants(data, id) {
  const g = data.groups.find((x) => x.id === id);
  return g ? g.children.flatMap((c) => [c, ...descendants(data, c)]) : [];
}

function checkLayout(data, layout, name, fail) {
  const say = (msg) => fail(`layout ${name}: ${msg}`);
  const boxes = new Map([...Object.entries(layout.nodes), ...Object.entries(layout.groups)]);

  diffMultiset(
    `layout ${name} nodes`,
    data.nodes.map((n) => n.id),
    Object.keys(layout.nodes),
    fail,
  );
  diffMultiset(
    `layout ${name} groups`,
    data.groups.map((g) => g.id),
    Object.keys(layout.groups),
    fail,
  );
  diffMultiset(
    `layout ${name} edges`,
    data.edges.map((e) => e.id),
    Object.keys(layout.edges),
    fail,
  );

  const canvas = { x: 0, y: 0, w: layout.width, h: layout.height };
  for (const [id, b] of boxes) if (!contains(canvas, b)) say(`${id} leaves the canvas`);

  /* Rewrapping may move line breaks, never words. */
  for (const n of data.nodes) {
    const lines = layout.nodes[n.id]?.lines;
    if (lines && words(lines) !== words(n.lines)) say(`node ${n.id}: rewrapped text differs: ${words(lines)}`);
  }

  /* Nodes never overlap; nodes sit inside exactly the groups they belong to. */
  const nodeIds = Object.keys(layout.nodes);
  nodeIds.forEach((a, i) =>
    nodeIds.slice(i + 1).forEach((b) => {
      if (boxesOverlap(layout.nodes[a], layout.nodes[b])) say(`nodes ${a} and ${b} overlap`);
    }),
  );
  for (const g of data.groups) {
    const box = layout.groups[g.id];
    if (!box) continue;
    const inside = new Set(descendants(data, g.id));
    for (const [id, b] of boxes) {
      if (id === g.id || ancestors(data, g.id).includes(id)) continue;
      if (inside.has(id)) {
        if (!contains(box, b)) say(`${id} belongs in group ${g.id} but is not inside it`);
      } else if (boxesOverlap(box, b)) {
        say(`${id} is not in group ${g.id} but overlaps it`);
      }
    }
  }

  const labels = [];
  for (const [id, b] of Object.entries(layout.groups)) {
    const g = data.groups.find((x) => x.id === id);
    if (g) {
      labels.push({
        who: `group label ${id}`,
        box: {
          x: b.x + GROUP_LABEL_INSET_X,
          y: b.y + GROUP_LABEL_BASELINE - 9,
          w: g.label.length * EDGE_SIZE * MONO_ADVANCE,
          h: 12,
        },
        ownEdge: null,
      });
    }
  }

  const routes = [];
  for (const e of data.edges) {
    const route = layout.edges[e.id];
    if (!route) continue;
    const from = boxes.get(e.from);
    const to = boxes.get(e.to);
    const first = route.points[0];
    const last = route.points.at(-1);
    if (!from || !onBorder(first, from)) say(`edge ${e.id} does not start on the border of ${e.from}: ${first}`);
    if (!to || !onBorder(last, to)) say(`edge ${e.id} does not end on the border of ${e.to}: ${last}`);

    const segs = route.points.slice(1).map((p, i) => [route.points[i], p]);
    routes.push({ id: e.id, edge: e, segs });

    for (const [id, b] of boxes) {
      const isGroup = id in layout.groups;
      if (id === e.from || id === e.to) {
        if (segs.some(([p, q]) => segmentHitsBox(p, q, b))) say(`edge ${e.id} runs through its own endpoint ${id}`);
      } else if (!isGroup) {
        if (segs.some(([p, q]) => segmentHitsBox(p, q, b))) say(`edge ${e.id} runs through node ${id}`);
      } else {
        /* A line may only enter a group that holds one of its ends. */
        const holds = [e.from, e.to].some((x) => descendants(data, id).includes(x));
        if (!holds && segs.some(([p, q]) => segmentHitsBox(p, q, b)))
          say(`edge ${e.id} enters group ${id}, which holds neither end`);
      }
    }

    const lines = route.label?.lines ?? e.label ?? [];
    if (Boolean(route.label) !== Boolean(e.label)) say(`edge ${e.id}: label presence differs from data`);
    if (route.label && e.label) {
      if (words(lines) !== words(e.label)) say(`edge ${e.id}: rewrapped label differs: ${words(lines)}`);
      labels.push({
        who: `label of ${e.id}`,
        box: labelBox(route.label, lines),
        ownEdge: e.id,
        knockout: route.label.knockout,
      });
    }
  }

  for (const l of labels) {
    if (!contains(canvas, l.box)) say(`${l.who} leaves the canvas`);
    for (const [id, b] of Object.entries(layout.nodes)) if (boxesOverlap(l.box, b)) say(`${l.who} overlaps node ${id}`);
    for (const [id, b] of Object.entries(layout.groups)) {
      if (l.who === `group label ${id}`) continue;
      const borders = [
        [
          [b.x, b.y],
          [b.x + b.w, b.y],
        ],
        [
          [b.x + b.w, b.y],
          [b.x + b.w, b.y + b.h],
        ],
        [
          [b.x + b.w, b.y + b.h],
          [b.x, b.y + b.h],
        ],
        [
          [b.x, b.y + b.h],
          [b.x, b.y],
        ],
      ];
      if (borders.some(([p, q]) => segmentHitsBox(p, q, l.box, 0))) say(`${l.who} crosses the border of group ${id}`);
    }
    for (const r of routes) {
      if (r.id === l.ownEdge && l.knockout) continue;
      if (r.segs.some(([p, q]) => segmentHitsBox(p, q, l.box, 0))) say(`${l.who} is crossed by edge ${r.id}`);
    }
    for (const o of labels) {
      if (o !== l && l.who < o.who && boxesOverlap(l.box, o.box)) say(`${l.who} overlaps ${o.who}`);
    }
  }

  /* Lines from one source, or into one target, may share a trunk. Any other crossing is a fault. */
  routes.forEach((r, i) =>
    routes.slice(i + 1).forEach((o) => {
      if (r.segs.some((s) => o.segs.some((t) => segmentsCross(s, t)))) say(`edges ${r.id} and ${o.id} cross`);
    }),
  );
}

/* ---------- Rendered page ---------- */

const decode = (s) =>
  s
    .replace(/<!--.*?-->/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'");

function textOf(fragment) {
  return [...fragment.matchAll(/<tspan[^>]*>(.*?)<\/tspan>/gs)].map((m) => decode(m[1]).trim());
}

function attr(tag, name) {
  const m = tag.match(new RegExp(`${name}="([^"]*)"`));
  return m ? decode(m[1]) : undefined;
}

function checkRendered(data, layouts, html, fail) {
  const open = html.indexOf(`data-diagram="${data.id}"`);
  if (open < 0) {
    fail(`rendered: ${data.page} does not show this diagram, so the registry missed`);
    return;
  }
  const start = html.lastIndexOf("<figure", open);
  const figure = html.slice(start, html.indexOf("</figure>", open));

  const aria = decode(attr(figure.slice(0, figure.indexOf(">") + 1), "aria-label") ?? "");
  if (!figure.startsWith("<figure") || !/role="img"/.test(figure.slice(0, figure.indexOf(">"))))
    fail("rendered: figure has no role=img");
  for (const text of [
    ...data.nodes.flatMap((n) => n.lines),
    ...data.groups.map((g) => g.label),
    ...data.edges.flatMap((e) => e.label ?? []),
  ]) {
    if (!aria.includes(text)) fail(`rendered: aria-label omits ${JSON.stringify(text)}`);
  }

  const svgs = [...figure.matchAll(/<svg\b[^>]*data-layout="(\w+)"[^>]*>(.*?)<\/svg>/gs)];
  const want = layouts.narrow ? ["wide", "narrow"] : ["single"];
  diffMultiset(
    "rendered drawings",
    want,
    svgs.map((m) => m[1]),
    fail,
  );

  for (const [, name, body] of svgs) {
    const layout = name === "narrow" ? layouts.narrow : layouts.wide;
    const say = (m) => `rendered ${name}: ${m}`;

    const nodeTexts = [...body.matchAll(/<g\b([^>]*data-kind="node"[^>]*)>(.*?)<\/g>/gs)].map(([, tag, inner]) => ({
      id: attr(tag, "data-id"),
      text: words(textOf(inner)),
    }));
    diffMultiset(
      say("node text"),
      data.nodes.map((n) => JSON.stringify([n.id, words(n.lines)])),
      nodeTexts.map((n) => JSON.stringify([n.id, n.text])),
      fail,
    );

    const groupTexts = [...body.matchAll(/<g\b([^>]*data-kind="group"[^>]*)>(.*?)<\/g>/gs)].map(([, tag, inner]) => [
      attr(tag, "data-id"),
      decode(inner.match(/<text[^>]*>(.*?)<\/text>/s)?.[1] ?? ""),
    ]);
    diffMultiset(
      say("group text"),
      data.groups.map((g) => JSON.stringify([g.id, g.label])),
      groupTexts.map((g) => JSON.stringify(g)),
      fail,
    );

    const HEADS = { arrow: 1, thick: 1, both: 2, line: 0 };
    const edges = [...body.matchAll(/<g\b([^>]*data-kind="edge"[^>]*)>(.*?)<\/g>/gs)].map(([, tag, inner]) => ({
      from: attr(tag, "data-from"),
      to: attr(tag, "data-to"),
      style: attr(tag, "data-style"),
      label: words(textOf(inner)),
      heads: (inner.match(/<polygon/g) ?? []).length,
    }));
    const key = (e) => JSON.stringify([e.from, e.to, e.style, e.label, e.heads]);
    diffMultiset(
      say("edges"),
      data.edges.map((e) => key({ ...e, label: words(e.label ?? []), heads: HEADS[e.style] })),
      edges.map(key),
      fail,
    );
    if (!layout) fail(say("no layout for this drawing"));
  }
}

/* ---------- Drawings of images ---------- */

function altIn(file, image) {
  const img = readFileSync(file, "utf8").match(new RegExp(`<img\\b[^>]*${image}[^>]*>`))?.[0];
  return img?.match(/\balt="([^"]*)"/)?.[1];
}

function checkFigure(data, layouts, fail) {
  const imagePath = join(root, data.imageFile);
  if (!existsSync(imagePath)) return fail(`source: ${data.imageFile} does not exist`);
  const hash = createHash("sha256").update(readFileSync(imagePath)).digest("hex");
  if (hash !== data.imageSha256) fail(`source: ${data.imageFile} has changed since it was transcribed; read it again`);

  const image = data.imageFile
    .split("/")
    .at(-1)
    .replace(/\.[a-z]+$/, "");
  for (const use of data.uses) {
    const file = join(root, use.sourceFile);
    use.alt = existsSync(file) ? altIn(file, image) : undefined;
    if (!use.alt) fail(`source: ${use.sourceFile} no longer shows ${image} with alt text`);
    else if (!readFileSync(file, "utf8").includes(use.caption)) fail(`source: ${use.sourceFile} changed its caption`);
  }

  /* Internal sense: blocks join adjacent layers downward; every flow and tick names something real. */
  const ids = data.layers.map((l) => l.id);
  const known = new Set([...ids, data.liquidity.id, data.bus.id]);
  for (const f of data.flows) {
    if (!known.has(f.from) || !known.has(f.to)) fail(`flow ${f.id}: unknown end`);
    if (f.style === "block" && ids.indexOf(f.to) !== ids.indexOf(f.from) + 1) {
      fail(`flow ${f.id}: not the next layer down`);
    }
  }
  const blocks = data.flows.filter((f) => f.style === "block");
  if (blocks.length !== ids.length - 1) fail(`flows: ${blocks.length} block arrows for ${ids.length} layers`);

  /* The shared geometry check, seeing the layers, Liquidity Providers and the bus as boxes. */
  for (const [name, layout] of Object.entries(layouts)) {
    const edges = data.flows.filter((f) => f.style === "thick");
    const nodes = [data.liquidity.id, data.bus.id, ...ids].map((id) => ({ id, lines: [id] }));
    const boxes = {
      [data.liquidity.id]: layout.liquidity,
      [data.bus.id]: layout.bus.attach,
      ...Object.fromEntries(
        ids.map((id, row) => [
          id,
          { x: layout.frame.x, y: layout.frame.y + row * layout.rowHeight, w: layout.frame.w, h: layout.rowHeight },
        ]),
      ),
    };
    checkLayout(
      { nodes, edges, groups: [] },
      { width: layout.width, height: layout.height, nodes: boxes, groups: {}, edges: layout.routes },
      name,
      fail,
    );
    diffMultiset(`layout ${name} ticks`, data.bus.layers, Object.keys(layout.bus.ticks), fail);
    data.bus.layers.forEach((id) => {
      const tick = layout.bus.ticks[id];
      const box = boxes[id];
      if (tick && (tick.to !== box.x || tick.y <= box.y || tick.y >= box.y + box.h)) {
        fail(`layout ${name}: the bus tick for ${id} does not reach its layer`);
      }
    });
  }
}

function checkFigureRendered(data, use, html, fail) {
  const open = html.indexOf(`data-diagram="${data.id}"`);
  if (open < 0) return fail(`rendered: ${use.page} does not show this drawing`);
  const start = html.lastIndexOf("<div", open);
  const end = html.indexOf("</figure>", open);
  const block = html.slice(start, end);
  const tag = block.slice(0, block.indexOf(">") + 1);

  if (!/role="img"/.test(tag)) fail(`rendered ${use.page}: no role=img`);
  if (use.alt && attr(tag, "aria-label") !== use.alt)
    fail(`rendered ${use.page}: aria-label is not the page's alt text`);
  const caption = block.match(/<figcaption[^>]*>(.*?)<\/figcaption>/s)?.[1] ?? "";
  if (!decode(caption).includes(use.caption)) fail(`rendered ${use.page}: caption missing`);
  const imageName = data.imageFile.split("/").at(-1);
  if (new RegExp(`<img\\b[^>]*${imageName}`).test(html)) fail(`rendered ${use.page}: still shows the image`);

  const svgs = [...block.matchAll(/<svg\b[^>]*data-layout="(\w+)"[^>]*>(.*?)<\/svg>/gs)];
  diffMultiset(
    `rendered ${use.page} drawings`,
    ["wide", "narrow"],
    svgs.map((m) => m[1]),
    fail,
  );

  for (const [, name, body] of svgs) {
    const say = (m) => `rendered ${use.page} ${name}: ${m}`;
    const groups = (kind) =>
      [...body.matchAll(new RegExp(`<g\\b([^>]*data-kind="${kind}"[^>]*)>(.*?)</g>`, "gs"))].map(([, t, inner]) => ({
        t,
        inner,
        text: words(textOf(inner)),
      }));

    diffMultiset(
      say("layer names"),
      data.layers.map((l) => JSON.stringify([l.id, words(l.name)])),
      groups("layer").map((g) => JSON.stringify([attr(g.t, "data-id"), g.text])),
      fail,
    );
    diffMultiset(
      say("items"),
      data.layers.flatMap((l) => l.items.map((i) => JSON.stringify([i.label, i.shape, i.label]))),
      groups("item").map((g) => JSON.stringify([attr(g.t, "data-id"), attr(g.t, "data-shape"), g.text])),
      fail,
    );
    diffMultiset(
      say("nodes"),
      [JSON.stringify([data.liquidity.id, words(data.liquidity.lines)])],
      groups("node").map((g) => JSON.stringify([attr(g.t, "data-id"), g.text])),
      fail,
    );
    const key = (e) => JSON.stringify([e.from, e.to, e.style, e.label, e.heads]);
    diffMultiset(
      say("flows"),
      data.flows.map((f) => key({ ...f, label: words(f.label), heads: 1 })),
      groups("edge").map((g) =>
        key({
          from: attr(g.t, "data-from"),
          to: attr(g.t, "data-to"),
          style: attr(g.t, "data-style"),
          label: g.text,
          heads: (g.inner.match(/<polygon/g) ?? []).length,
        }),
      ),
      fail,
    );
    const bus = groups("bus")[0]?.inner ?? "";
    diffMultiset(
      say("bus"),
      data.bus.layers,
      [...bus.matchAll(/data-to="([^"]*)"/g)].map((m) => m[1]),
      fail,
    );
  }
}

/* ---------- Run ---------- */

const dataFiles = readdirSync(diagramsDir)
  .filter((f) => f.endsWith(".data.ts"))
  .sort();
const specs = [];
for (const file of dataFiles) {
  const mod = await import(pathToFileURL(join(diagramsDir, file)).href);
  specs.push({ file, data: mod.data, layouts: mod.layouts });
}

const allFences = new Map();
const contentDocs = join(root, "content/docs");
for (const file of [...walk(join(root, "docs")), ...walk(contentDocs)]) {
  for (const chart of fencesIn(file)) {
    if (!allFences.has(chart)) allFences.set(chart, []);
    allFences.get(chart).push(relative(root, file));
  }
}

let failures = 0;
const pageCache = new Map();
async function fetchPage(page) {
  if (!pageCache.has(page)) {
    const res = await fetch(base + page);
    if (!res.ok) throw new Error(`${page} returned ${res.status}`);
    pageCache.set(page, await res.text());
  }
  return pageCache.get(page);
}

console.log(`Checking ${specs.length} diagrams${staticOnly ? " (static only)" : ` against ${base}`}\n`);

for (const { data, layouts } of specs) {
  const faults = [];
  const fail = (m) => faults.push(m);

  if (data.kind === "figure") {
    checkFigure(data, layouts, fail);
    let shown = staticOnly ? "skipped" : "matches";
    if (!staticOnly) {
      for (const use of data.uses) {
        try {
          checkFigureRendered(data, use, await fetchPage(use.page), fail);
        } catch (e) {
          fail(
            `rendered: could not fetch ${base}${use.page}: ${e.cause?.code ?? e.message}. Start the site or pass --static.`,
          );
          shown = "failed";
        }
      }
    }
    const items = data.layers.reduce((n, l) => n + l.items.length, 0);
    console.log(
      `${faults.length ? "FAIL" : "ok  "} ${data.id}: ${data.layers.length} layers, ${items} items, ${data.flows.length} flows; transcribed by eye; drawings: wide + narrow; ${data.uses.length} pages; rendered: ${faults.length ? "see below" : shown}`,
    );
    for (const f of faults) console.log(`     - ${f}`);
    failures += faults.length;
    continue;
  }

  const sourcePath = join(root, data.sourceFile);
  if (!existsSync(sourcePath))
    fail(`source: ${data.sourceFile} does not exist; run npm run docs:sync && npm run xquad:sync`);
  else if (!fencesIn(sourcePath).includes(data.source.trim())) {
    fail(
      `source: no fence in ${data.sourceFile} matches this chart exactly. The site is showing Mermaid here and the drawing is stale.`,
    );
  }

  const parsed = checkData(data, fail);
  checkLayout(data, layouts.wide, layouts.narrow ? "wide" : "single", fail);
  if (layouts.narrow) checkLayout(data, layouts.narrow, "narrow", fail);

  let rendered = "skipped";
  if (!staticOnly) {
    try {
      checkRendered(data, layouts, await fetchPage(data.page), fail);
      rendered = "matches";
    } catch (e) {
      fail(
        `rendered: could not fetch ${base}${data.page}: ${e.cause?.code ?? e.message}. Start the site or pass --static.`,
      );
    }
  }

  const counts = parsed
    ? `${data.nodes.length} nodes, ${data.edges.length} edges, ${data.groups.length} groups`
    : "unparsed";
  const drawings = layouts.narrow ? "wide + narrow" : "single";
  console.log(
    `${faults.length ? "FAIL" : "ok  "} ${data.id}: ${counts}; drawings: ${drawings}; rendered: ${faults.length ? "see below" : rendered}`,
  );
  for (const f of faults) console.log(`     - ${f}`);
  failures += faults.length;
}

const known = new Set(specs.filter((s) => s.data.source).map((s) => s.data.source.trim()));
const undrawn = [...allFences].filter(([chart]) => !known.has(chart));
for (const [, files] of undrawn) {
  console.log(`FAIL no drawing for the mermaid fence in ${files.join(", ")}: the site shows Mermaid there`);
  failures += 1;
}
if (!allFences.size) {
  console.log("FAIL found no mermaid fences at all; run npm run docs:sync && npm run xquad:sync");
  failures += 1;
}

console.log(
  `\n${allFences.size} distinct mermaid fences in docs/ and content/docs/, ${specs.length} drawings (${known.size} of charts), ${failures} fault(s).`,
);
process.exit(failures ? 1 : 0);
