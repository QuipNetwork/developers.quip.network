import type { DiagramData, DiagramLayouts } from "./types";

export const data: DiagramData = {
  id: "pq-signature-sizes",
  sourceFile: "docs/guides/post-quantum-signatures-for-blockchains.md",
  page: "/docs/guides/post-quantum-signatures-for-blockchains",
  source: `flowchart TD
    B["Classical baseline: BIP-340 Schnorr<br/>signature 64 bytes, public key 32 bytes"]
    F["Falcon-512<br/>signature 666 bytes<br/>public key 897 bytes<br/>standard not final"]
    M["ML-DSA-44<br/>signature 2,420 bytes<br/>public key 1,312 bytes<br/>FIPS 204, final"]
    S["SLH-DSA-128s<br/>signature 7,856 bytes<br/>public key 32 bytes<br/>FIPS 205, final"]
    L["LMS or XMSS<br/>sizes depend on<br/>the parameter set<br/>SP 800-208, final"]
    B -->|smallest signature| F
    B -->|finalized lattice| M
    B -->|stateless hash-based| S
    B -->|stateful hash-based| L`,
  nodes: [
    { id: "B", lines: ["Classical baseline: BIP-340 Schnorr", "signature 64 bytes, public key 32 bytes"], nameLines: 1 },
    { id: "F", lines: ["Falcon-512", "signature 666 bytes", "public key 897 bytes", "standard not final"], nameLines: 1 },
    { id: "M", lines: ["ML-DSA-44", "signature 2,420 bytes", "public key 1,312 bytes", "FIPS 204, final"], nameLines: 1 },
    { id: "S", lines: ["SLH-DSA-128s", "signature 7,856 bytes", "public key 32 bytes", "FIPS 205, final"], nameLines: 1 },
    { id: "L", lines: ["LMS or XMSS", "sizes depend on", "the parameter set", "SP 800-208, final"], nameLines: 1 },
  ],
  groups: [],
  edges: [
    { id: "b-f", from: "B", to: "F", style: "arrow", label: ["smallest signature"] },
    { id: "b-m", from: "B", to: "M", style: "arrow", label: ["finalized lattice"] },
    { id: "b-s", from: "B", to: "S", style: "arrow", label: ["stateless hash-based"] },
    { id: "b-l", from: "B", to: "L", style: "arrow", label: ["stateful hash-based"] },
  ],
};

/* Routes read best on one line. */
// prettier-ignore
export const layouts: DiagramLayouts = {
  wide: {
    width: 680,
    height: 221,
    nodes: {
      B: { x: 140, y: 0.5, w: 400, h: 52 },
      F: { x: 0.5, y: 136, w: 160, h: 84 },
      M: { x: 173.5, y: 136, w: 160, h: 84 },
      S: { x: 346.5, y: 136, w: 160, h: 84 },
      L: { x: 519.5, y: 136, w: 160, h: 84 },
    },
    groups: {},
    edges: {
      "b-f": { points: [[340, 52.5], [340, 94], [12.5, 94], [12.5, 136]], label: { x: 20.5, y: 120, anchor: "start" } },
      "b-m": { points: [[340, 52.5], [340, 94], [185.5, 94], [185.5, 136]], label: { x: 193.5, y: 120, anchor: "start" } },
      "b-s": { points: [[340, 52.5], [340, 94], [358.5, 94], [358.5, 136]], label: { x: 366.5, y: 120, anchor: "start" } },
      "b-l": { points: [[340, 52.5], [340, 94], [531.5, 94], [531.5, 136]], label: { x: 539.5, y: 120, anchor: "start" } },
    },
    junctions: [[340, 94], [185.5, 94], [358.5, 94]],
  },
  narrow: {
    width: 340,
    height: 385,
    nodes: {
      B: { x: 0.5, y: 0.5, w: 339, h: 52 },
      F: { x: 0.5, y: 136, w: 160, h: 84 },
      M: { x: 179.5, y: 136, w: 160, h: 84 },
      S: { x: 0.5, y: 300, w: 160, h: 84 },
      L: { x: 179.5, y: 300, w: 160, h: 84 },
    },
    groups: {},
    edges: {
      "b-f": { points: [[12.5, 52.5], [12.5, 136]], label: { x: 20.5, y: 120, anchor: "start" } },
      "b-m": { points: [[191.5, 52.5], [191.5, 136]], label: { x: 199.5, y: 120, anchor: "start" } },
      "b-s": { points: [[170, 52.5], [170, 260], [12.5, 260], [12.5, 300]], label: { x: 20.5, y: 286, anchor: "start" } },
      "b-l": { points: [[170, 52.5], [170, 260], [191.5, 260], [191.5, 300]], label: { x: 199.5, y: 286, anchor: "start" } },
    },
    junctions: [[170, 260]],
  },
};
