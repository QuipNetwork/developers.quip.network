import "./diagram.css";
import { describe } from "./describe";
import {
  DETAIL_LINE,
  EDGE_LINE,
  GROUP_LABEL_BASELINE,
  GROUP_LABEL_INSET_X,
  MONO_ADVANCE,
  NAME_LINE,
  WEIGHT_SIZE,
} from "./metrics";
import type { DiagramData, DiagramEdge, DiagramLayout, DiagramLayouts, DiagramNode, Point } from "./types";

const NODE_INSET = 12;
/** From the middle of a text block's line box to its first baseline. */
const CAP_OFFSET = 4.5;

function Head({ tip, from, thick }: { tip: Point; from: Point; thick: boolean }) {
  const length = thick ? 11 : 8;
  const half = thick ? 5 : 3.5;
  const [dx, dy] = [tip[0] - from[0], tip[1] - from[1]];
  const d = Math.hypot(dx, dy) || 1;
  const [ux, uy] = [dx / d, dy / d];
  const base: Point = [tip[0] - ux * length, tip[1] - uy * length];
  const points = [tip, [base[0] - uy * half, base[1] + ux * half], [base[0] + uy * half, base[1] - ux * half]]
    .map(([x, y]) => `${round(x)},${round(y)}`)
    .join(" ");
  return <polygon className="qd-head" points={points} />;
}

const round = (n: number) => Math.round(n * 100) / 100;

/** Pull a route's end back along its last segment, so a thick line stops inside the arrowhead. */
function pullBack(tip: Point, from: Point, by: number): Point {
  const [dx, dy] = [tip[0] - from[0], tip[1] - from[1]];
  const d = Math.hypot(dx, dy) || 1;
  return [round(tip[0] - (dx / d) * by), round(tip[1] - (dy / d) * by)];
}

function Edge({ edge, layout }: { edge: DiagramEdge; layout: DiagramLayout }) {
  const route = layout.edges[edge.id];
  const points = [...route.points];
  const last = points.length - 1;
  const thick = edge.style === "thick";
  const inset = thick ? 10 : 7;
  const headEnd = edge.style !== "line";
  const headStart = edge.style === "both";
  if (headEnd) points[last] = pullBack(route.points[last], route.points[last - 1], inset);
  if (headStart) points[0] = pullBack(route.points[0], route.points[1], inset);
  const lines = route.label?.lines ?? edge.label ?? [];
  const label = route.label;

  return (
    <g data-kind="edge" data-id={edge.id} data-from={edge.from} data-to={edge.to} data-style={edge.style}>
      <path className="qd-edge" d={points.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ")} />
      {headEnd && <Head tip={route.points[last]} from={route.points[last - 1]} thick={thick} />}
      {headStart && <Head tip={route.points[0]} from={route.points[1]} thick={thick} />}
      {label && label.knockout && (
        <rect
          className="qd-knockout"
          x={label.x - (lines[0].length * WEIGHT_SIZE * MONO_ADVANCE) / 2 - 4}
          y={label.y - 12}
          width={lines[0].length * WEIGHT_SIZE * MONO_ADVANCE + 8}
          height={16}
        />
      )}
      {label && (
        <text className="qd-edge-label" x={label.x} y={label.y} textAnchor={label.anchor ?? "middle"}>
          {lines.map((line, i) => (
            <tspan key={i} x={label.x} dy={i ? EDGE_LINE : 0}>
              {line}
            </tspan>
          ))}
        </text>
      )}
    </g>
  );
}

function Node({ node, layout }: { node: DiagramNode; layout: DiagramLayout }) {
  const box = layout.nodes[node.id];
  const lines = box.lines ?? node.lines;
  const nameLines = box.lines ? (box.nameLines ?? lines.length) : (node.nameLines ?? lines.length);
  const blockHeight = nameLines * NAME_LINE + (lines.length - nameLines) * DETAIL_LINE;
  const centred = node.mono;
  const x = centred ? box.x + box.w / 2 : box.x + NODE_INSET;
  let y = (box.top ? box.y + NODE_INSET : box.y + (box.h - blockHeight) / 2) + NAME_LINE / 2 + CAP_OFFSET;

  return (
    <g data-kind="node" data-id={node.id}>
      <rect
        className="qd-node"
        x={box.x}
        y={box.y}
        width={box.w}
        height={box.h}
        data-emphasis={node.emphasis ? "" : undefined}
      />
      <text x={x} textAnchor={centred ? "middle" : undefined}>
        {lines.map((line, i) => {
          const isName = i < nameLines;
          const lineY = y;
          y += isName ? NAME_LINE : DETAIL_LINE;
          return (
            <tspan key={i} x={x} y={lineY} className={node.mono ? "qd-mono-node" : isName ? "qd-name" : "qd-detail"}>
              {line}
            </tspan>
          );
        })}
      </text>
    </g>
  );
}

function Drawing({
  data,
  layout,
  name,
}: {
  data: DiagramData;
  layout: DiagramLayout;
  name: "wide" | "narrow" | "single";
}) {
  /* Outer groups first, so inner ones paint over them. */
  const depth = (id: string): number => {
    const parent = data.groups.find((g) => g.children.includes(id));
    return parent ? 1 + depth(parent.id) : 0;
  };
  const groups = [...data.groups].sort((a, b) => depth(a.id) - depth(b.id));

  return (
    <svg
      className={`qd-${name}`}
      data-layout={name}
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      style={name === "single" ? { maxWidth: layout.width } : undefined}
      aria-hidden="true"
    >
      {groups.map((g) => {
        const box = layout.groups[g.id];
        return (
          <g key={g.id} data-kind="group" data-id={g.id}>
            <rect
              className="qd-group"
              x={box.x}
              y={box.y}
              width={box.w}
              height={box.h}
              data-raised={g.raised ? "" : undefined}
            />
            <text className="qd-group-label" x={box.x + GROUP_LABEL_INSET_X} y={box.y + GROUP_LABEL_BASELINE}>
              {g.label}
            </text>
          </g>
        );
      })}
      {data.edges.map((e) => (
        <Edge key={e.id} edge={e} layout={layout} />
      ))}
      {data.nodes.map((n) => (
        <Node key={n.id} node={n} layout={layout} />
      ))}
    </svg>
  );
}

/**
 * Draws a diagram from its data. A second drawing, when there is one, is shown by a container
 * query at phone widths, so no client JavaScript is involved in choosing between them.
 */
export function Diagram({ data, layouts }: { data: DiagramData; layouts: DiagramLayouts }) {
  return (
    <figure className="quip-diagram not-prose" role="img" aria-label={describe(data)} data-diagram={data.id}>
      <Drawing data={data} layout={layouts.wide} name={layouts.narrow ? "wide" : "single"} />
      {layouts.narrow && <Drawing data={data} layout={layouts.narrow} name="narrow" />}
    </figure>
  );
}
