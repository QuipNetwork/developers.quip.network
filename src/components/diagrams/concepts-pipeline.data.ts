import type { DiagramData, DiagramLayouts } from "./types";

export const data: DiagramData = {
  id: "concepts-pipeline",
  sourceFile: "content/docs/xquad/concepts/index.mdx",
  page: "/docs/xquad/concepts",
  source: `flowchart LR
    P["DSL (xqcp) or hand-written .xqasm"] --> ASM[Assembler]
    ASM --> B[XQVM bytecode]
    B --> V["VM: xqvm"]
    H[Host program] -->|calldata| V
    V -->|model-building program| M[XQMX model]
    M --> H
    H --> SLV[xqsa solver]
    SLV -->|sample| H
    H -->|sample as calldata| V
    V -->|verifier / decoder programs| H`,
  nodes: [
    { id: "P", lines: ["DSL (xqcp) or hand-written .xqasm"] },
    { id: "ASM", lines: ["Assembler"] },
    { id: "B", lines: ["XQVM bytecode"] },
    { id: "V", lines: ["VM: xqvm"] },
    { id: "H", lines: ["Host program"] },
    { id: "M", lines: ["XQMX model"] },
    { id: "SLV", lines: ["xqsa solver"] },
  ],
  groups: [],
  edges: [
    { id: "p-asm", from: "P", to: "ASM", style: "arrow" },
    { id: "asm-b", from: "ASM", to: "B", style: "arrow" },
    { id: "b-v", from: "B", to: "V", style: "arrow" },
    { id: "h-v-calldata", from: "H", to: "V", style: "arrow", label: ["calldata"] },
    { id: "v-m", from: "V", to: "M", style: "arrow", label: ["model-building program"] },
    { id: "m-h", from: "M", to: "H", style: "arrow" },
    { id: "h-slv", from: "H", to: "SLV", style: "arrow" },
    { id: "slv-h", from: "SLV", to: "H", style: "arrow", label: ["sample"] },
    { id: "h-v-sample", from: "H", to: "V", style: "arrow", label: ["sample as calldata"] },
    { id: "v-h", from: "V", to: "H", style: "arrow", label: ["verifier / decoder programs"] },
  ],
};

/* Routes read best on one line. */
// prettier-ignore
export const layouts: DiagramLayouts = {
  wide: {
    width: 680,
    height: 290,
    nodes: {
      P: { x: 0.5, y: 0.5, w: 150, h: 56, lines: ["DSL (xqcp) or", "hand-written .xqasm"] },
      ASM: { x: 206, y: 0.5, w: 88, h: 56 },
      B: { x: 350, y: 0.5, w: 122, h: 56 },
      V: { x: 164, y: 104, w: 300, h: 48 },
      M: { x: 573.5, y: 104, w: 106, h: 48 },
      H: { x: 164, y: 232, w: 300, h: 48 },
      SLV: { x: 0.5, y: 232, w: 92, h: 48 },
    },
    groups: {},
    edges: {
      "p-asm": { points: [[150.5, 28], [206, 28]] },
      "asm-b": { points: [[294, 28], [350, 28]] },
      "b-v": { points: [[411, 56.5], [411, 104]] },
      "h-v-calldata": { points: [[176, 232], [176, 152]], label: { x: 184, y: 196, anchor: "start" } },
      "h-v-sample": {
        points: [[250, 232], [250, 152]],
        label: { x: 258, y: 189, anchor: "start", lines: ["sample as", "calldata"] },
      },
      "v-h": {
        points: [[330, 152], [330, 232]],
        label: { x: 338, y: 189, anchor: "start", lines: ["verifier / decoder", "programs"] },
      },
      "v-m": {
        points: [[464, 128], [573.5, 128]],
        label: { x: 518, y: 107, lines: ["model-building", "program"] },
      },
      "m-h": { points: [[626, 152], [626, 256], [464, 256]] },
      "h-slv": { points: [[164, 246], [92.5, 246]] },
      "slv-h": { points: [[92.5, 266], [164, 266]], label: { x: 128, y: 282 } },
    },
  },
  narrow: {
    width: 340,
    height: 501,
    nodes: {
      P: { x: 0.5, y: 0.5, w: 236, h: 40 },
      ASM: { x: 0.5, y: 68, w: 236, h: 40 },
      B: { x: 0.5, y: 136, w: 236, h: 40 },
      V: { x: 0.5, y: 204, w: 236, h: 40 },
      M: { x: 253.5, y: 264, w: 86, h: 52, lines: ["XQMX", "model"] },
      H: { x: 0.5, y: 360, w: 236, h: 40 },
      SLV: { x: 0.5, y: 460, w: 236, h: 40 },
    },
    groups: {},
    edges: {
      "p-asm": { points: [[118, 40.5], [118, 68]] },
      "asm-b": { points: [[118, 108], [118, 136]] },
      "b-v": { points: [[118, 176], [118, 204]] },
      "h-v-calldata": { points: [[14, 360], [14, 244]], label: { x: 22, y: 306, anchor: "start" } },
      "h-v-sample": {
        points: [[88, 360], [88, 244]],
        label: { x: 96, y: 299, anchor: "start", lines: ["sample as", "calldata"] },
      },
      "v-h": {
        points: [[168, 244], [168, 360]],
        label: { x: 176, y: 292, anchor: "start", lines: ["verifier /", "decoder", "programs"] },
      },
      "v-m": {
        points: [[236.5, 224], [296, 224], [296, 264]],
        label: { x: 241, y: 202, anchor: "start", lines: ["model-building", "program"] },
      },
      "m-h": { points: [[296, 316], [296, 380], [236.5, 380]] },
      "h-slv": { points: [[104, 400], [104, 460]] },
      "slv-h": { points: [[132, 460], [132, 400]], label: { x: 140, y: 434, anchor: "start" } },
    },
  },
};
