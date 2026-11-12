import type { DiagramData, DiagramLayouts } from "./types";

export const data: DiagramData = {
  id: "quip-account-paths",
  sourceFile: "docs/interlock/quip-accounts.md",
  page: "/docs/quip-interlock-protocol/quip-accounts",
  source: `graph TD
    C["One public key commitment<br/>(the account's quantum-resistant identity)"]
    C --> A["Everyday path<br/>cheap signatures,<br/>one slot consumed per signature"]
    C --> B["Break-glass path<br/>expensive recovery signatures,<br/>no slot records needed"]
    A --> V["Account verifies the signature<br/>and executes the operation"]
    B --> V`,
  nodes: [
    { id: "C", lines: ["One public key commitment", "(the account's quantum-resistant identity)"], nameLines: 1 },
    { id: "A", lines: ["Everyday path", "cheap signatures,", "one slot consumed per signature"], nameLines: 1 },
    { id: "B", lines: ["Break-glass path", "expensive recovery signatures,", "no slot records needed"], nameLines: 1 },
    { id: "V", lines: ["Account verifies the signature", "and executes the operation"] },
  ],
  groups: [],
  edges: [
    { id: "c-a", from: "C", to: "A", style: "arrow" },
    { id: "c-b", from: "C", to: "B", style: "arrow" },
    { id: "a-v", from: "A", to: "V", style: "arrow" },
    { id: "b-v", from: "B", to: "V", style: "arrow" },
  ],
};

/* Routes read best on one line. */
// prettier-ignore
export const layouts: DiagramLayouts = {
  wide: {
    width: 680,
    height: 283,
    nodes: {
      C: { x: 0.5, y: 0.5, w: 679, h: 56 },
      A: { x: 0.5, y: 104, w: 328, h: 74 },
      B: { x: 351.5, y: 104, w: 328, h: 74 },
      V: { x: 0.5, y: 226, w: 679, h: 56 },
    },
    groups: {},
    edges: {
      "c-a": { points: [[164, 56.5], [164, 104]] },
      "c-b": { points: [[516, 56.5], [516, 104]] },
      "a-v": { points: [[164, 178], [164, 226]] },
      "b-v": { points: [[516, 178], [516, 226]] },
    },
  },
  narrow: {
    width: 340,
    height: 297,
    nodes: {
      C: { x: 0.5, y: 0.5, w: 339, h: 56 },
      A: {
        x: 0.5,
        y: 96,
        w: 164,
        h: 104,
        lines: ["Everyday path", "cheap signatures,", "one slot consumed", "per signature"],
        nameLines: 1,
        top: true,
      },
      B: {
        x: 175.5,
        y: 96,
        w: 164,
        h: 104,
        lines: ["Break-glass path", "expensive recovery", "signatures,", "no slot records", "needed"],
        nameLines: 1,
        top: true,
      },
      V: { x: 0.5, y: 240, w: 339, h: 56 },
    },
    groups: {},
    edges: {
      "c-a": { points: [[82, 56.5], [82, 96]] },
      "c-b": { points: [[258, 56.5], [258, 96]] },
      "a-v": { points: [[82, 200], [82, 240]] },
      "b-v": { points: [[258, 200], [258, 240]] },
    },
  },
};
