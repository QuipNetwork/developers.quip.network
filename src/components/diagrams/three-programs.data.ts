import type { DiagramData, DiagramLayouts } from "./types";

export const data: DiagramData = {
  id: "three-programs",
  sourceFile: "content/docs/xquad/concepts/three-programs.mdx",
  page: "/docs/xquad/concepts/three-programs",
  source: `flowchart LR
    Q[Problem definition] -->|compile| ENC[Encoder]
    Q -->|compile| VER[Verifier]
    Q -->|compile| DEC[Decoder]
    ENC -->|XQMX model| H[Host program]
    H -->|model| SLV[xqsa solver]
    SLV -->|XQMX sample| H
    H -->|model, sample| VER
    H -->|sample| DEC
    VER -->|energy, valid| H
    DEC -->|decoded result| H`,
  nodes: [
    { id: "Q", lines: ["Problem definition"] },
    { id: "ENC", lines: ["Encoder"] },
    { id: "VER", lines: ["Verifier"] },
    { id: "DEC", lines: ["Decoder"] },
    { id: "H", lines: ["Host program"] },
    { id: "SLV", lines: ["xqsa solver"] },
  ],
  groups: [],
  edges: [
    { id: "q-enc", from: "Q", to: "ENC", style: "arrow", label: ["compile"] },
    { id: "q-ver", from: "Q", to: "VER", style: "arrow", label: ["compile"] },
    { id: "q-dec", from: "Q", to: "DEC", style: "arrow", label: ["compile"] },
    { id: "enc-h", from: "ENC", to: "H", style: "arrow", label: ["XQMX model"] },
    { id: "h-slv", from: "H", to: "SLV", style: "arrow", label: ["model"] },
    { id: "slv-h", from: "SLV", to: "H", style: "arrow", label: ["XQMX sample"] },
    { id: "h-ver", from: "H", to: "VER", style: "arrow", label: ["model, sample"] },
    { id: "h-dec", from: "H", to: "DEC", style: "arrow", label: ["sample"] },
    { id: "ver-h", from: "VER", to: "H", style: "arrow", label: ["energy, valid"] },
    { id: "dec-h", from: "DEC", to: "H", style: "arrow", label: ["decoded result"] },
  ],
};

/* Routes read best on one line. */
// prettier-ignore
export const layouts: DiagramLayouts = {
  wide: {
    width: 680,
    height: 248,
    nodes: {
      Q: { x: 0.5, y: 96, w: 100, h: 48, lines: ["Problem", "definition"] },
      ENC: { x: 176, y: 0.5, w: 92, h: 48 },
      VER: { x: 176, y: 96, w: 92, h: 48 },
      DEC: { x: 176, y: 192, w: 92, h: 48 },
      H: { x: 386, y: 0.5, w: 108, h: 239.5 },
      SLV: { x: 583.5, y: 96, w: 96, h: 48 },
    },
    groups: {},
    edges: {
      "q-enc": { points: [[100.5, 120], [116, 120], [116, 24], [176, 24]], label: { x: 146, y: 18 } },
      "q-ver": { points: [[100.5, 120], [176, 120]], label: { x: 146, y: 114 } },
      "q-dec": { points: [[100.5, 120], [116, 120], [116, 216], [176, 216]], label: { x: 146, y: 210 } },
      "enc-h": { points: [[268, 24], [386, 24]], label: { x: 327, y: 18 } },
      "h-ver": { points: [[386, 110], [268, 110]], label: { x: 327, y: 104 } },
      "ver-h": { points: [[268, 130], [386, 130]], label: { x: 327, y: 146 } },
      "h-dec": { points: [[386, 206], [268, 206]], label: { x: 327, y: 200 } },
      "dec-h": { points: [[268, 226], [386, 226]], label: { x: 327, y: 242 } },
      "h-slv": { points: [[494, 110], [583.5, 110]], label: { x: 539, y: 104 } },
      "slv-h": { points: [[583.5, 130], [494, 130]], label: { x: 539, y: 146 } },
    },
  },
  narrow: {
    width: 340,
    height: 360,
    nodes: {
      Q: { x: 0.5, y: 0.5, w: 140, h: 40 },
      ENC: { x: 76, y: 64, w: 88, h: 48 },
      VER: { x: 76, y: 144, w: 88, h: 48 },
      DEC: { x: 76, y: 224, w: 88, h: 48 },
      SLV: { x: 76, y: 304, w: 88, h: 48 },
      H: { x: 269.5, y: 64, w: 70, h: 288, lines: ["Host", "program"] },
    },
    groups: {},
    edges: {
      "q-enc": { points: [[16, 40.5], [16, 88], [76, 88]], label: { x: 46, y: 82 } },
      "q-ver": { points: [[16, 40.5], [16, 168], [76, 168]], label: { x: 46, y: 162 } },
      "q-dec": { points: [[16, 40.5], [16, 248], [76, 248]], label: { x: 46, y: 242 } },
      "enc-h": { points: [[164, 88], [269.5, 88]], label: { x: 217, y: 82 } },
      "h-ver": { points: [[269.5, 158], [164, 158]], label: { x: 217, y: 152 } },
      "ver-h": { points: [[164, 178], [269.5, 178]], label: { x: 217, y: 193 } },
      "h-dec": { points: [[269.5, 238], [164, 238]], label: { x: 217, y: 232 } },
      "dec-h": { points: [[164, 258], [269.5, 258]], label: { x: 217, y: 273 } },
      "h-slv": { points: [[269.5, 318], [164, 318]], label: { x: 217, y: 312 } },
      "slv-h": { points: [[164, 338], [269.5, 338]], label: { x: 217, y: 353 } },
    },
  },
};
