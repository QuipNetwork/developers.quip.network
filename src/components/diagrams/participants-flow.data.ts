import type { DiagramData, DiagramLayouts } from "./types";

export const data: DiagramData = {
  id: "participants-flow",
  sourceFile: "docs/network/participants.md",
  page: "/docs/network/participants",
  source: `flowchart LR
    C["Client"] -->|pays fees| TN["Transaction<br/>network"]
    TN -->|stores and<br/>processes QUIPs| C
    TN -->|splits fees| V["Quip Network<br/>validators"]
    V -->|publishes QUIP<br/>commitments| TN
    V -->|pays yield| N["Nominators"]
    N -->|stake funds| V
    N -->|pays bounties| W["Whitehat<br/>hackers"]
    W -->|proves algorithm<br/>security| N`,
  nodes: [
    { id: "C", lines: ["Client"] },
    { id: "TN", lines: ["Transaction", "network"] },
    { id: "V", lines: ["Quip Network", "validators"] },
    { id: "N", lines: ["Nominators"] },
    { id: "W", lines: ["Whitehat", "hackers"] },
  ],
  groups: [],
  edges: [
    { id: "c-tn", from: "C", to: "TN", style: "arrow", label: ["pays fees"] },
    { id: "tn-c", from: "TN", to: "C", style: "arrow", label: ["stores and", "processes QUIPs"] },
    { id: "tn-v", from: "TN", to: "V", style: "arrow", label: ["splits fees"] },
    { id: "v-tn", from: "V", to: "TN", style: "arrow", label: ["publishes QUIP", "commitments"] },
    { id: "v-n", from: "V", to: "N", style: "arrow", label: ["pays yield"] },
    { id: "n-v", from: "N", to: "V", style: "arrow", label: ["stake funds"] },
    { id: "n-w", from: "N", to: "W", style: "arrow", label: ["pays bounties"] },
    { id: "w-n", from: "W", to: "N", style: "arrow", label: ["proves algorithm", "security"] },
  ],
};

/* Routes read best on one line. */
// prettier-ignore
export const layouts: DiagramLayouts = {
  wide: {
    width: 680,
    height: 222,
    nodes: {
      C: { x: 8, y: 0.5, w: 120, h: 56 },
      TN: { x: 260, y: 0.5, w: 120, h: 56 },
      V: { x: 512, y: 0.5, w: 120, h: 56 },
      N: { x: 512, y: 150, w: 120, h: 56 },
      W: { x: 260, y: 150, w: 120, h: 56 },
    },
    groups: {},
    edges: {
      "c-tn": { points: [[128, 18], [260, 18]], label: { x: 194, y: 12 } },
      "tn-c": { points: [[260, 38], [128, 38]], label: { x: 194, y: 53 } },
      "tn-v": { points: [[380, 18], [512, 18]], label: { x: 446, y: 12 } },
      "v-tn": { points: [[512, 38], [380, 38]], label: { x: 446, y: 53 } },
      "v-n": { points: [[556, 56.5], [556, 150]], label: { x: 548, y: 107, anchor: "end" } },
      "n-v": { points: [[588, 150], [588, 56.5]], label: { x: 596, y: 107, anchor: "start" } },
      "n-w": { points: [[512, 168], [380, 168]], label: { x: 446, y: 162 } },
      "w-n": { points: [[380, 188], [512, 188]], label: { x: 446, y: 203 } },
    },
  },
  narrow: {
    width: 340,
    height: 481,
    nodes: {
      C: { x: 90, y: 0.5, w: 160, h: 48 },
      TN: { x: 90, y: 108, w: 160, h: 48 },
      V: { x: 90, y: 216, w: 160, h: 48 },
      N: { x: 90, y: 324, w: 160, h: 48 },
      W: { x: 90, y: 432, w: 160, h: 48 },
    },
    groups: {},
    edges: {
      "c-tn": { points: [[150, 48.5], [150, 108]], label: { x: 142, y: 82, anchor: "end" } },
      "tn-c": { points: [[190, 108], [190, 48.5]], label: { x: 198, y: 75, anchor: "start" } },
      "tn-v": { points: [[150, 156], [150, 216]], label: { x: 142, y: 190, anchor: "end" } },
      "v-tn": { points: [[190, 216], [190, 156]], label: { x: 198, y: 183, anchor: "start" } },
      "v-n": { points: [[150, 264], [150, 324]], label: { x: 142, y: 298, anchor: "end" } },
      "n-v": { points: [[190, 324], [190, 264]], label: { x: 198, y: 298, anchor: "start" } },
      "n-w": { points: [[150, 372], [150, 432]], label: { x: 142, y: 406, anchor: "end" } },
      "w-n": { points: [[190, 432], [190, 372]], label: { x: 198, y: 399, anchor: "start" } },
    },
  },
};
