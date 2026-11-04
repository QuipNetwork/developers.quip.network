import type { DiagramData, DiagramNode } from "./types";

function nameOf(node: DiagramNode) {
  return node.lines.slice(0, node.nameLines ?? node.lines.length).join(" ");
}

/** States the diagram in words, from the data that draws it. */
export function describe(data: DiagramData) {
  const names = new Map<string, string>(data.nodes.map((n) => [n.id, nameOf(n)]));
  for (const g of data.groups) names.set(g.id, g.label);
  const parts: string[] = [];

  for (const n of data.nodes) {
    const detail = n.lines.slice(n.nameLines ?? n.lines.length).join(" ");
    parts.push(detail ? `${nameOf(n)}: ${detail}.` : `${nameOf(n)}.`);
  }
  for (const g of data.groups) {
    parts.push(`${g.label} contains ${g.children.map((c) => names.get(c)).join(", ")}.`);
  }
  const highlighted = data.nodes.filter((n) => n.emphasis).map(nameOf);
  if (highlighted.length) parts.push(`Highlighted: ${highlighted.join(", ")}.`);

  for (const e of data.edges) {
    const from = names.get(e.from);
    const to = names.get(e.to);
    const label = e.label ? `: ${e.label.join(" ")}` : "";
    if (e.style === "line") parts.push(`${from} connects to ${to}${label}.`);
    else if (e.style === "both") parts.push(`${from} and ${to}, both ways${label}.`);
    else if (e.style === "thick") parts.push(`${from} to ${to}, highlighted${label}.`);
    else parts.push(`${from} to ${to}${label}.`);
  }
  return parts.join(" ");
}
