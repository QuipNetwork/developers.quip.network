import type { DiagramData, DiagramLayouts } from "./types";

export const data: DiagramData = {
  id: "pricing-shot-count",
  sourceFile: "docs/guides/quantum-compute-pricing-models.md",
  page: "/docs/guides/quantum-compute-pricing-models",
  source: `flowchart LR
    A["100 shots<br/>$0.0425 in shots<br/>$0.30 task fee<br/>$0.34 in total<br/>task fee: nearly 90%"]
    B["About 700 shots<br/>about $0.30 in shots<br/>$0.30 task fee<br/>about $0.60 in total<br/>task fee: about half"]
    C["10,000 shots<br/>$4.25 in shots<br/>$0.30 task fee<br/>$4.55 in total<br/>task fee: under 7%"]
    A -->|more shots| B
    B -->|more shots| C`,
  nodes: [
    {
      id: "A",
      lines: ["100 shots", "$0.0425 in shots", "$0.30 task fee", "$0.34 in total", "task fee: nearly 90%"],
      nameLines: 1,
    },
    {
      id: "B",
      lines: ["About 700 shots", "about $0.30 in shots", "$0.30 task fee", "about $0.60 in total", "task fee: about half"],
      nameLines: 1,
    },
    {
      id: "C",
      lines: ["10,000 shots", "$4.25 in shots", "$0.30 task fee", "$4.55 in total", "task fee: under 7%"],
      nameLines: 1,
    },
  ],
  groups: [],
  edges: [
    { id: "a-b", from: "A", to: "B", style: "arrow", label: ["more shots"] },
    { id: "b-c", from: "B", to: "C", style: "arrow", label: ["more shots"] },
  ],
};

/* Routes read best on one line. */
// prettier-ignore
export const layouts: DiagramLayouts = {
  wide: {
    width: 680,
    height: 106,
    nodes: {
      A: { x: 0.5, y: 0.5, w: 189, h: 105 },
      B: { x: 245.5, y: 0.5, w: 189, h: 105 },
      C: { x: 490.5, y: 0.5, w: 189, h: 105 },
    },
    groups: {},
    edges: {
      "a-b": { points: [[189.5, 70], [245.5, 70]], label: { x: 217.5, y: 46, lines: ["more", "shots"] } },
      "b-c": { points: [[434.5, 70], [490.5, 70]], label: { x: 462.5, y: 46, lines: ["more", "shots"] } },
    },
  },
  narrow: {
    width: 340,
    height: 396,
    nodes: {
      A: { x: 0.5, y: 0.5, w: 339, h: 105 },
      B: { x: 0.5, y: 145.5, w: 339, h: 105 },
      C: { x: 0.5, y: 290.5, w: 339, h: 105 },
    },
    groups: {},
    edges: {
      "a-b": { points: [[170, 105.5], [170, 145.5]], label: { x: 178, y: 130, anchor: "start" } },
      "b-c": { points: [[170, 250.5], [170, 290.5]], label: { x: 178, y: 275, anchor: "start" } },
    },
  },
};
