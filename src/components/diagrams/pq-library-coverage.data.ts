import type { DiagramData, DiagramLayouts } from "./types";

export const data: DiagramData = {
  id: "pq-library-coverage",
  sourceFile: "docs/guides/post-quantum-cryptography-libraries.md",
  page: "/docs/guides/post-quantum-cryptography-libraries",
  source: `flowchart TD
    H["pqhybridsign<br/>ed25519 or sr25519<br/>paired with one of<br/>three schemes"]
    subgraph LAT["Lattice-based"]
        ML["ML-DSA<br/>FIPS 204, final<br/>liboqs, RustCrypto ml-dsa,<br/>CIRCL, noble-post-quantum"]
        FAL["Falcon (FN-DSA)<br/>FIPS 206 still in development<br/>liboqs, rust-fn-dsa,<br/>noble-post-quantum (Round 3)"]
    end
    subgraph HASH["Hash-based"]
        SH["SHRINCS<br/>the hash-based scheme in Quip signatures"]
        SLH["SLH-DSA<br/>FIPS 205, final<br/>liboqs, RustCrypto slh-dsa,<br/>CIRCL, noble-post-quantum"]
        LMS["LMS and XMSS<br/>SP 800-208, final<br/>liboqs, RustCrypto lms and xmss"]
    end
    H --> ML
    H --> FAL
    H --> SH
    classDef quip fill:#FFEDEE,stroke:#C93A3F,color:#1A1618
    class H quip`,
  nodes: [
    { id: "H", lines: ["pqhybridsign", "ed25519 or sr25519", "paired with one of", "three schemes"], nameLines: 1, emphasis: true },
    {
      id: "ML",
      lines: ["ML-DSA", "FIPS 204, final", "liboqs, RustCrypto ml-dsa,", "CIRCL, noble-post-quantum"],
      nameLines: 1,
    },
    {
      id: "FAL",
      lines: ["Falcon (FN-DSA)", "FIPS 206 still in development", "liboqs, rust-fn-dsa,", "noble-post-quantum (Round 3)"],
      nameLines: 1,
    },
    { id: "SH", lines: ["SHRINCS", "the hash-based scheme in Quip signatures"], nameLines: 1 },
    {
      id: "SLH",
      lines: ["SLH-DSA", "FIPS 205, final", "liboqs, RustCrypto slh-dsa,", "CIRCL, noble-post-quantum"],
      nameLines: 1,
    },
    { id: "LMS", lines: ["LMS and XMSS", "SP 800-208, final", "liboqs, RustCrypto lms and xmss"], nameLines: 1 },
  ],
  groups: [
    { id: "LAT", label: "Lattice-based", children: ["ML", "FAL"] },
    { id: "HASH", label: "Hash-based", children: ["SH", "SLH", "LMS"] },
  ],
  edges: [
    { id: "h-ml", from: "H", to: "ML", style: "arrow" },
    { id: "h-fal", from: "H", to: "FAL", style: "arrow" },
    { id: "h-sh", from: "H", to: "SH", style: "arrow" },
  ],
};

/* Routes read best on one line. */
// prettier-ignore
export const layouts: DiagramLayouts = {
  wide: {
    width: 680,
    height: 353,
    nodes: {
      H: { x: 0.5, y: 0.5, w: 679, h: 52, lines: ["pqhybridsign", "ed25519 or sr25519 paired with one of three schemes"], nameLines: 1 },
      ML: { x: 12.5, y: 128, w: 290, h: 76 },
      FAL: { x: 12.5, y: 216, w: 290, h: 76 },
      SH: { x: 361.5, y: 128, w: 306, h: 52 },
      SLH: { x: 361.5, y: 192, w: 306, h: 76 },
      LMS: { x: 361.5, y: 280, w: 306, h: 60 },
    },
    groups: {
      LAT: { x: 0.5, y: 96, w: 330, h: 256 },
      HASH: { x: 349.5, y: 96, w: 330, h: 256 },
    },
    edges: {
      "h-ml": { points: [[157.5, 52.5], [157.5, 128]] },
      "h-fal": { points: [[316, 52.5], [316, 254], [302.5, 254]] },
      "h-sh": { points: [[514, 52.5], [514, 128]] },
    },
  },
  narrow: {
    width: 340,
    height: 589,
    nodes: {
      H: { x: 0.5, y: 0.5, w: 339, h: 68, lines: ["pqhybridsign", "ed25519 or sr25519 paired with", "one of three schemes"], nameLines: 1 },
      ML: { x: 12.5, y: 140, w: 260, h: 76 },
      FAL: { x: 12.5, y: 228, w: 260, h: 76 },
      SH: { x: 12.5, y: 364, w: 290, h: 52 },
      SLH: { x: 12.5, y: 428, w: 290, h: 76 },
      LMS: { x: 12.5, y: 516, w: 290, h: 60 },
    },
    groups: {
      LAT: { x: 0.5, y: 108.5, w: 310, h: 207.5 },
      HASH: { x: 0.5, y: 332.5, w: 339, h: 255.5 },
    },
    edges: {
      "h-ml": { points: [[140, 68.5], [140, 140]] },
      "h-fal": { points: [[291, 68.5], [291, 266], [272.5, 266]] },
      "h-sh": { points: [[326, 68.5], [326, 390], [302.5, 390]] },
    },
  },
};
