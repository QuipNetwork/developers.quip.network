import type { DiagramData, DiagramLayouts } from "./types";

export const data: DiagramData = {
  id: "who-pays-whom",
  sourceFile: "docs/interlock/how-quip-fits-together.md",
  page: "/docs/quip-interlock-protocol/how-quip-fits-together",
  source: `flowchart LR
    CC["Compute<br/>Consumers"] -->|USD| AD["Application<br/>Developers"]
    AD -->|"$QUIP"| ALG["Algorithm<br/>Developers"]
    ALG -->|"$QUIP"| PD["Protocol<br/>Developers"]
    PD -->|"$QUIP"| CP["Compute Providers<br/>QPU, GPU, CPU"]
    LP["Liquidity<br/>Providers"] <-->|"USD to $QUIP,<br/>via QuipSwap"| AD`,
  nodes: [
    { id: "CC", lines: ["Compute", "Consumers"] },
    { id: "AD", lines: ["Application", "Developers"] },
    { id: "ALG", lines: ["Algorithm", "Developers"] },
    { id: "PD", lines: ["Protocol", "Developers"] },
    { id: "CP", lines: ["Compute Providers", "QPU, GPU, CPU"], nameLines: 1 },
    { id: "LP", lines: ["Liquidity", "Providers"] },
  ],
  groups: [],
  edges: [
    { id: "cc-ad", from: "CC", to: "AD", style: "arrow", label: ["USD"] },
    { id: "ad-alg", from: "AD", to: "ALG", style: "arrow", label: ["$QUIP"] },
    { id: "alg-pd", from: "ALG", to: "PD", style: "arrow", label: ["$QUIP"] },
    { id: "pd-cp", from: "PD", to: "CP", style: "arrow", label: ["$QUIP"] },
    { id: "lp-ad", from: "LP", to: "AD", style: "both", label: ["USD to $QUIP,", "via QuipSwap"] },
  ],
};

/* Routes read best on one line. */
// prettier-ignore
export const layouts: DiagramLayouts = {
  wide: {
    width: 680,
    height: 185,
    nodes: {
      CC: { x: 0.5, y: 0.5, w: 90, h: 56 },
      AD: { x: 136, y: 0.5, w: 90, h: 56 },
      ALG: { x: 272, y: 0.5, w: 90, h: 56 },
      PD: { x: 408, y: 0.5, w: 90, h: 56 },
      CP: { x: 544, y: 0.5, w: 135.5, h: 56 },
      LP: { x: 136, y: 128, w: 90, h: 56 },
    },
    groups: {},
    edges: {
      "cc-ad": { points: [[90.5, 28], [136, 28]], label: { x: 113, y: 22 } },
      "ad-alg": { points: [[226, 28], [272, 28]], label: { x: 249, y: 22 } },
      "alg-pd": { points: [[362, 28], [408, 28]], label: { x: 385, y: 22 } },
      "pd-cp": { points: [[498, 28], [544, 28]], label: { x: 521, y: 22 } },
      "lp-ad": { points: [[181, 128], [181, 56.5]], label: { x: 189, y: 89, anchor: "start" } },
    },
  },
  narrow: {
    width: 340,
    height: 421,
    nodes: {
      CC: { x: 0.5, y: 0.5, w: 132, h: 52 },
      AD: { x: 0.5, y: 92, w: 132, h: 52 },
      ALG: { x: 0.5, y: 184, w: 132, h: 52 },
      PD: { x: 0.5, y: 276, w: 132, h: 52 },
      CP: { x: 0.5, y: 368, w: 132, h: 52 },
      LP: { x: 247.5, y: 92, w: 92, h: 52 },
    },
    groups: {},
    edges: {
      "cc-ad": { points: [[66, 52.5], [66, 92]], label: { x: 74, y: 76, anchor: "start" } },
      "ad-alg": { points: [[66, 144], [66, 184]], label: { x: 74, y: 168, anchor: "start" } },
      "alg-pd": { points: [[66, 236], [66, 276]], label: { x: 74, y: 260, anchor: "start" } },
      "pd-cp": { points: [[66, 328], [66, 368]], label: { x: 74, y: 352, anchor: "start" } },
      "lp-ad": { points: [[247.5, 118], [132.5, 118]], label: { x: 190, y: 98 } },
    },
  },
};
