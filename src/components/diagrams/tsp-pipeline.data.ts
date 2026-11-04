import type { DiagramData, DiagramLayouts } from "./types";

export const data: DiagramData = {
  id: "tsp-pipeline",
  sourceFile: "content/docs/xquad/examples/tsp.mdx",
  page: "/docs/xquad/examples/tsp",
  source: `flowchart LR
    ENC[Encoder] -->|model| SLV[xqsa solver]
    ENC -->|model| VER[Verifier]
    SLV -->|sample| VER
    SLV -->|sample| DEC[Decoder]
    VER -->|energy, valid| OUT[Host program]
    DEC -->|tour| OUT`,
  nodes: [
    { id: "ENC", lines: ["Encoder"] },
    { id: "SLV", lines: ["xqsa solver"] },
    { id: "VER", lines: ["Verifier"] },
    { id: "DEC", lines: ["Decoder"] },
    { id: "OUT", lines: ["Host program"] },
  ],
  groups: [],
  edges: [
    { id: "enc-slv", from: "ENC", to: "SLV", style: "arrow", label: ["model"] },
    { id: "enc-ver", from: "ENC", to: "VER", style: "arrow", label: ["model"] },
    { id: "slv-ver", from: "SLV", to: "VER", style: "arrow", label: ["sample"] },
    { id: "slv-dec", from: "SLV", to: "DEC", style: "arrow", label: ["sample"] },
    { id: "ver-out", from: "VER", to: "OUT", style: "arrow", label: ["energy, valid"] },
    { id: "dec-out", from: "DEC", to: "OUT", style: "arrow", label: ["tour"] },
  ],
};

/* Routes read best on one line. */
// prettier-ignore
export const layouts: DiagramLayouts = {
  wide: {
    width: 680,
    height: 176,
    nodes: {
      ENC: { x: 0.5, y: 0.5, w: 110, h: 56 },
      SLV: { x: 0.5, y: 114, w: 110, h: 56 },
      VER: { x: 285, y: 0.5, w: 110, h: 56 },
      DEC: { x: 285, y: 114, w: 110, h: 56 },
      OUT: { x: 569.5, y: 0.5, w: 110, h: 170 },
    },
    groups: {},
    edges: {
      "enc-ver": { points: [[110.5, 18], [285, 18]], label: { x: 197, y: 12 } },
      "enc-slv": { points: [[55, 56.5], [55, 114]], label: { x: 63, y: 89, anchor: "start" } },
      "slv-ver": { points: [[110.5, 132], [200, 132], [200, 38], [285, 38]], label: { x: 208, y: 89, anchor: "start" } },
      "slv-dec": { points: [[110.5, 152], [285, 152]], label: { x: 197, y: 168 } },
      "ver-out": { points: [[395, 28], [569.5, 28]], label: { x: 482, y: 22 } },
      "dec-out": { points: [[395, 142], [569.5, 142]], label: { x: 482, y: 136 } },
    },
  },
  narrow: {
    width: 340,
    height: 265,
    nodes: {
      ENC: { x: 0.5, y: 14, w: 130, h: 40 },
      SLV: { x: 209.5, y: 14, w: 130, h: 40 },
      VER: { x: 0.5, y: 124, w: 130, h: 40 },
      DEC: { x: 209.5, y: 124, w: 130, h: 40 },
      OUT: { x: 0.5, y: 224, w: 339, h: 40 },
    },
    groups: {},
    edges: {
      "enc-slv": { points: [[130.5, 34], [209.5, 34]], label: { x: 170, y: 28 } },
      "enc-ver": { points: [[40, 54], [40, 124]], label: { x: 48, y: 92, anchor: "start" } },
      "slv-ver": { points: [[240, 54], [240, 84], [100, 84], [100, 124]], label: { x: 170, y: 78 } },
      "slv-dec": { points: [[300, 54], [300, 124]], label: { x: 292, y: 106, anchor: "end" } },
      "ver-out": { points: [[65, 164], [65, 224]], label: { x: 73, y: 198, anchor: "start" } },
      "dec-out": { points: [[275, 164], [275, 224]], label: { x: 283, y: 198, anchor: "start" } },
    },
  },
};
