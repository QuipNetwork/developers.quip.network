import type { DiagramData, DiagramLayouts } from "./types";

export const data: DiagramData = {
  id: "qvm-stack",
  sourceFile: "docs/guides/what-is-a-qvm.md",
  page: "/docs/guides/what-is-a-qvm",
  source: `flowchart LR
    M["Your model<br/>constraint language<br/>or Python"]
    subgraph QVM["Quip Virtual Machine"]
        X["XQuad<br/>compiles the model"]
        S["xqsa<br/>solver adapters"]
    end
    CPU["CPU<br/>simulated annealing"]
    GPU["GPU<br/>CUDA or Metal annealer"]
    DW["D-Wave Advantage<br/>quantum annealer"]
    QN["Quip Network<br/>network-provided solvers"]
    M --> X
    X -->|XQVM bytecode| S
    S --> CPU
    S --> GPU
    S --> DW
    S --> QN
    classDef quip fill:#FFEDEE,stroke:#C93A3F,color:#1A1618
    class QN quip`,
  nodes: [
    { id: "M", lines: ["Your model", "constraint language", "or Python"], nameLines: 1 },
    { id: "X", lines: ["XQuad", "compiles the model"], nameLines: 1 },
    { id: "S", lines: ["xqsa", "solver adapters"], nameLines: 1 },
    { id: "CPU", lines: ["CPU", "simulated annealing"], nameLines: 1 },
    { id: "GPU", lines: ["GPU", "CUDA or Metal annealer"], nameLines: 1 },
    { id: "DW", lines: ["D-Wave Advantage", "quantum annealer"], nameLines: 1 },
    { id: "QN", lines: ["Quip Network", "network-provided solvers"], nameLines: 1, emphasis: true },
  ],
  groups: [{ id: "QVM", label: "Quip Virtual Machine", children: ["X", "S"] }],
  edges: [
    { id: "m-x", from: "M", to: "X", style: "arrow" },
    { id: "x-s", from: "X", to: "S", style: "arrow", label: ["XQVM bytecode"] },
    { id: "s-cpu", from: "S", to: "CPU", style: "arrow" },
    { id: "s-gpu", from: "S", to: "GPU", style: "arrow" },
    { id: "s-dw", from: "S", to: "DW", style: "arrow" },
    { id: "s-qn", from: "S", to: "QN", style: "arrow" },
  ],
};

/* Routes read best on one line. */
// prettier-ignore
export const layouts: DiagramLayouts = {
  wide: {
    width: 680,
    height: 245,
    nodes: {
      M: { x: 0.5, y: 42, w: 150, h: 68 },
      X: { x: 212, y: 48, w: 196, h: 56 },
      S: { x: 212, y: 128.5, w: 196, h: 52 },
      CPU: { x: 499.5, y: 0.5, w: 180, h: 52 },
      GPU: { x: 499.5, y: 64.5, w: 180, h: 52 },
      DW: { x: 499.5, y: 128.5, w: 180, h: 52 },
      QN: { x: 499.5, y: 192.5, w: 180, h: 52 },
    },
    groups: {
      QVM: { x: 200, y: 20.5, w: 220, h: 204 },
    },
    edges: {
      "m-x": { points: [[150.5, 76], [212, 76]] },
      "x-s": { points: [[310, 104], [310, 128.5]], label: { x: 318, y: 120, anchor: "start" } },
      "s-cpu": { points: [[408, 154.5], [455, 154.5], [455, 26.5], [499.5, 26.5]] },
      "s-gpu": { points: [[408, 154.5], [455, 154.5], [455, 90.5], [499.5, 90.5]] },
      "s-dw": { points: [[408, 154.5], [499.5, 154.5]] },
      "s-qn": { points: [[408, 154.5], [455, 154.5], [455, 218.5], [499.5, 218.5]] },
    },
    junctions: [[455, 154.5], [455, 90.5]],
  },
  narrow: {
    width: 340,
    height: 481,
    nodes: {
      M: { x: 0.5, y: 0.5, w: 339, h: 68 },
      X: { x: 12, y: 124, w: 316, h: 52 },
      S: { x: 12, y: 216, w: 316, h: 52 },
      CPU: { x: 0.5, y: 336, w: 160, h: 52 },
      GPU: { x: 179.5, y: 336, w: 160, h: 52 },
      DW: { x: 0.5, y: 412, w: 160, h: 52 },
      QN: { x: 179.5, y: 412, w: 160, h: 68, lines: ["Quip Network", "network-provided", "solvers"], nameLines: 1 },
    },
    groups: {
      QVM: { x: 0.5, y: 96, w: 339, h: 188 },
    },
    edges: {
      "m-x": { points: [[170, 68.5], [170, 124]] },
      "x-s": { points: [[170, 176], [170, 216]], label: { x: 178, y: 200, anchor: "start" } },
      "s-cpu": { points: [[82, 268], [82, 336]] },
      "s-gpu": { points: [[258, 268], [258, 336]] },
      "s-dw": { points: [[170, 268], [170, 396], [82, 396], [82, 412]] },
      "s-qn": { points: [[170, 268], [170, 396], [258, 396], [258, 412]] },
    },
    junctions: [[170, 396]],
  },
};
