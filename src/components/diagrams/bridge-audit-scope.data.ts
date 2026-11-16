import type { DiagramData, DiagramLayouts } from "./types";

export const data: DiagramData = {
  id: "bridge-audit-scope",
  sourceFile: "docs/guides/blockchain-bridge-audit.md",
  page: "/docs/guides/blockchain-bridge-audit",
  source: `flowchart LR
    R["Ronin, about $624M<br/>signer threshold compromise"]
    W["Wormhole, $326M<br/>signature verification bypass"]
    N["Nomad, $190M<br/>initialization error on upgrade"]
    subgraph SCOPE["Audit scope"]
        T["Trust model<br/>relayers, guardians,<br/>multisig signers, upgrade admin"]
        V["Verification<br/>each release or mint traced<br/>to the proof it checks"]
        U["Upgrades<br/>deployment, initialization<br/>and upgrade scripts"]
        D["Deployed code<br/>audited commit compared<br/>with verified source"]
    end
    R --> T
    W --> V
    N --> U`,
  nodes: [
    { id: "R", lines: ["Ronin, about $624M", "signer threshold compromise"], nameLines: 1 },
    { id: "W", lines: ["Wormhole, $326M", "signature verification bypass"], nameLines: 1 },
    { id: "N", lines: ["Nomad, $190M", "initialization error on upgrade"], nameLines: 1 },
    { id: "T", lines: ["Trust model", "relayers, guardians,", "multisig signers, upgrade admin"], nameLines: 1 },
    { id: "V", lines: ["Verification", "each release or mint traced", "to the proof it checks"], nameLines: 1 },
    { id: "U", lines: ["Upgrades", "deployment, initialization", "and upgrade scripts"], nameLines: 1 },
    { id: "D", lines: ["Deployed code", "audited commit compared", "with verified source"], nameLines: 1 },
  ],
  groups: [{ id: "SCOPE", label: "Audit scope", children: ["T", "V", "U", "D"] }],
  edges: [
    { id: "r-t", from: "R", to: "T", style: "arrow" },
    { id: "w-v", from: "W", to: "V", style: "arrow" },
    { id: "n-u", from: "N", to: "U", style: "arrow" },
  ],
};

/* Routes read best on one line. */
// prettier-ignore
export const layouts: DiagramLayouts = {
  wide: {
    width: 680,
    height: 353,
    nodes: {
      R: { x: 0.5, y: 32, w: 220, h: 68 },
      W: { x: 0.5, y: 112, w: 220, h: 68 },
      N: { x: 0.5, y: 192, w: 220, h: 68 },
      T: { x: 292, y: 32, w: 376, h: 68 },
      V: { x: 292, y: 112, w: 376, h: 68 },
      U: { x: 292, y: 192, w: 376, h: 68 },
      D: { x: 292, y: 272, w: 376, h: 68 },
    },
    groups: {
      SCOPE: { x: 280, y: 0.5, w: 399.5, h: 352 },
    },
    edges: {
      "r-t": { points: [[220.5, 66], [292, 66]] },
      "w-v": { points: [[220.5, 146], [292, 146]] },
      "n-u": { points: [[220.5, 226], [292, 226]] },
    },
  },
  narrow: {
    width: 340,
    height: 385,
    nodes: {
      R: { x: 0.5, y: 34, w: 120, h: 72, lines: ["Ronin,", "about $624M", "signer threshold", "compromise"], nameLines: 2 },
      W: { x: 0.5, y: 114, w: 120, h: 88, lines: ["Wormhole,", "$326M", "signature", "verification", "bypass"], nameLines: 2 },
      N: { x: 0.5, y: 210, w: 120, h: 72, lines: ["Nomad,", "$190M", "initialization", "error on upgrade"], nameLines: 2 },
      T: { x: 154, y: 32, w: 176, h: 76, lines: ["Trust model", "relayers, guardians,", "multisig signers,", "upgrade admin"], nameLines: 1 },
      V: { x: 154, y: 120, w: 176, h: 76, lines: ["Verification", "each release or mint", "traced to the proof", "it checks"], nameLines: 1 },
      U: { x: 154, y: 208, w: 176, h: 76, lines: ["Upgrades", "deployment,", "initialization and", "upgrade scripts"], nameLines: 1 },
      D: { x: 154, y: 296, w: 176, h: 76, lines: ["Deployed code", "audited commit", "compared with", "verified source"], nameLines: 1 },
    },
    groups: {
      SCOPE: { x: 144, y: 0.5, w: 195.5, h: 384 },
    },
    edges: {
      "r-t": { points: [[120.5, 70], [154, 70]] },
      "w-v": { points: [[120.5, 158], [154, 158]] },
      "n-u": { points: [[120.5, 246], [154, 246]] },
    },
  },
};
