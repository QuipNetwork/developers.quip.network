import type { DiagramData, DiagramLayouts } from "./types";

export const data: DiagramData = {
  id: "how-quip-fits-together",
  sourceFile: "docs/interlock/how-quip-fits-together.md",
  page: "/docs/quip-interlock-protocol/how-quip-fits-together",
  source: `flowchart LR
    SC["<b><u>Supported chains</u></b><br/>Ethereum, Base, and more"]
    JS["<b><u>Job submitters</u></b><br/>post problems with rewards"]
    OP["<b><u>Operators</u></b><br/>mine solutions on quantum<br/>and classical hardware"]
    subgraph QN["Quip Network"]
        A["<b><u>Quip Account</u></b><br/>holds your assets"]
        S["<b><u>QuipSwap</u></b><br/>settles atomic trades"]
        subgraph SUB["Subnets"]
            OPT["<b><u>Optimization</u></b><br/>Subnet 1, solves jobs"]
            RND["<b><u>Randomness</u></b><br/>Subnet 2, serves QVRF"]
        end
    end
    SC --> A
    A -->|authorizes| S
    S ==>|pays for work| SUB
    SUB -->|returns the result| S
    JS -->|submit jobs| SUB
    OP -->|mine solutions| SUB
    style SUB fill:#FFFFFF,stroke:#8B8083
    classDef quip fill:#FFEDEE,stroke:#C93A3F,color:#1A1618
    class A,S quip`,
  nodes: [
    { id: "SC", lines: ["Supported chains", "Ethereum, Base, and more"], nameLines: 1 },
    { id: "JS", lines: ["Job submitters", "post problems with rewards"], nameLines: 1 },
    { id: "OP", lines: ["Operators", "mine solutions on quantum", "and classical hardware"], nameLines: 1 },
    { id: "A", lines: ["Quip Account", "holds your assets"], nameLines: 1, emphasis: true },
    { id: "S", lines: ["QuipSwap", "settles atomic trades"], nameLines: 1, emphasis: true },
    { id: "OPT", lines: ["Optimization", "Subnet 1, solves jobs"], nameLines: 1 },
    { id: "RND", lines: ["Randomness", "Subnet 2, serves QVRF"], nameLines: 1 },
  ],
  groups: [
    { id: "QN", label: "Quip Network", children: ["A", "S", "SUB"] },
    { id: "SUB", label: "Subnets", children: ["OPT", "RND"], raised: true },
  ],
  edges: [
    { id: "sc-a", from: "SC", to: "A", style: "arrow" },
    { id: "a-s", from: "A", to: "S", style: "arrow", label: ["authorizes"] },
    { id: "s-sub", from: "S", to: "SUB", style: "thick", label: ["pays for work"] },
    { id: "sub-s", from: "SUB", to: "S", style: "arrow", label: ["returns the result"] },
    { id: "js-sub", from: "JS", to: "SUB", style: "arrow", label: ["submit jobs"] },
    { id: "op-sub", from: "OP", to: "SUB", style: "arrow", label: ["mine solutions"] },
  ],
};

/* Routes read best on one line. */
// prettier-ignore
export const layouts: DiagramLayouts = {
  wide: {
    width: 680,
    height: 333,
    nodes: {
      SC: { x: 16, y: 0.5, w: 172, h: 71.5 },
      JS: { x: 296, y: 0.5, w: 176, h: 71.5 },
      OP: { x: 488, y: 0.5, w: 176, h: 71.5 },
      A: { x: 16, y: 212, w: 112, h: 56 },
      S: { x: 212, y: 212, w: 136, h: 56 },
      OPT: { x: 500, y: 192, w: 152, h: 52 },
      RND: { x: 500, y: 252, w: 152, h: 52 },
    },
    groups: {
      QN: { x: 0.5, y: 136, w: 679, h: 196 },
      SUB: { x: 488, y: 164, w: 176, h: 152 },
    },
    edges: {
      "sc-a": { points: [[112, 72], [112, 212]] },
      "a-s": { points: [[128, 240], [212, 240]], label: { x: 170, y: 232 } },
      "s-sub": { points: [[348, 230], [488, 230]], label: { x: 418, y: 222 } },
      "sub-s": { points: [[488, 250], [348, 250]], label: { x: 418, y: 266 } },
      "js-sub": { points: [[384, 72], [384, 100], [512, 100], [512, 164]], label: { x: 448, y: 94 } },
      "op-sub": { points: [[632, 72], [632, 164]], label: { x: 626, y: 112, anchor: "end" } },
    },
  },
  narrow: {
    width: 340,
    height: 617,
    nodes: {
      SC: { x: 0.5, y: 0.5, w: 339, h: 56 },
      A: { x: 12, y: 120, w: 316, h: 52 },
      S: { x: 12, y: 212, w: 316, h: 52 },
      OPT: { x: 24, y: 356, w: 292, h: 52 },
      RND: { x: 24, y: 416, w: 292, h: 52 },
      JS: { x: 0.5, y: 544, w: 158, h: 72, lines: ["Job submitters", "post problems", "with rewards"], nameLines: 1 },
      OP: { x: 170, y: 544, w: 169.5, h: 72 },
    },
    groups: {
      QN: { x: 0.5, y: 92, w: 339, h: 404 },
      SUB: { x: 12, y: 328, w: 316, h: 152 },
    },
    edges: {
      "sc-a": { points: [[170, 56.5], [170, 120]] },
      "a-s": { points: [[170, 172], [170, 212]], label: { x: 178, y: 196, anchor: "start" } },
      "s-sub": { points: [[152, 264], [152, 328]], label: { x: 144, y: 300, anchor: "end" } },
      "sub-s": { points: [[188, 328], [188, 264]], label: { x: 196, y: 300, anchor: "start" } },
      "js-sub": { points: [[60, 544], [60, 480]], label: { x: 68, y: 526, anchor: "start" } },
      "op-sub": { points: [[220, 544], [220, 480]], label: { x: 228, y: 526, anchor: "start" } },
    },
  },
};
