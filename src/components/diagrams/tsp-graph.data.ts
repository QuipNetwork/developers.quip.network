import type { DiagramData, DiagramLayouts, Point } from "./types";

export const data: DiagramData = {
  id: "tsp-graph",
  sourceFile: "content/docs/xquad/examples/tsp.mdx",
  page: "/docs/xquad/examples/tsp",
  source: `graph LR
    0 ---|82| 1
    0 ---|15| 2
    0 ---|95| 3
    1 ---|4| 2
    1 ---|36| 3
    2 ---|32| 3`,
  nodes: [
    { id: "0", lines: ["0"], mono: true },
    { id: "1", lines: ["1"], mono: true },
    { id: "2", lines: ["2"], mono: true },
    { id: "3", lines: ["3"], mono: true },
  ],
  groups: [],
  edges: [
    { id: "0-1", from: "0", to: "1", style: "line", label: ["82"] },
    { id: "0-2", from: "0", to: "2", style: "line", label: ["15"] },
    { id: "0-3", from: "0", to: "3", style: "line", label: ["95"] },
    { id: "1-2", from: "1", to: "2", style: "line", label: ["4"] },
    { id: "1-3", from: "1", to: "3", style: "line", label: ["36"] },
    { id: "2-3", from: "2", to: "3", style: "line", label: ["32"] },
  ],
};

/* The complete graph on four cities is planar, so city 2 sits inside the triangle of the others and no edges cross. */
const SIZE = 40;
const centres: Record<string, Point> = {
  "0": [170, 20.5],
  "1": [20.5, 269.5],
  "3": [319.5, 269.5],
  "2": [170, 182],
};

/** Where the line between two centres leaves a city's square. */
function leave(from: Point, to: Point): Point {
  const [dx, dy] = [to[0] - from[0], to[1] - from[1]];
  const scale = SIZE / 2 / Math.max(Math.abs(dx), Math.abs(dy));
  return [Math.round((from[0] + dx * scale) * 100) / 100, Math.round((from[1] + dy * scale) * 100) / 100];
}

function route(a: string, b: string, along = 0.5) {
  const [p, q] = [centres[a], centres[b]];
  return {
    points: [leave(p, q), leave(q, p)],
    label: {
      x: p[0] + (q[0] - p[0]) * along,
      y: p[1] + (q[1] - p[1]) * along + 4,
      knockout: true,
    },
  };
}

const box = (id: string) => ({
  x: centres[id][0] - SIZE / 2,
  y: centres[id][1] - SIZE / 2,
  w: SIZE,
  h: SIZE,
});

/* One drawing at every width: it is already phone-sized, and a graph has no stacked form. */
// prettier-ignore
export const layouts: DiagramLayouts = {
  wide: {
    width: 340,
    height: 291,
    nodes: { "0": box("0"), "1": box("1"), "2": box("2"), "3": box("3") },
    groups: {},
    edges: {
      "0-1": route("0", "1"),
      "0-2": route("0", "2"),
      "0-3": route("0", "3"),
      "1-2": route("1", "2"),
      "1-3": route("1", "3"),
      "2-3": route("2", "3"),
    },
  },
};
