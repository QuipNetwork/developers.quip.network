import type { EdgeRoute, EdgeStyle } from "./types";

export type ItemShape = "person" | "cube" | "sheets" | "rects";

export interface StackLayer {
  id: string;
  /** Set on two lines in the image. */
  name: string[];
  items: { label: string; shape: ItemShape }[];
}

export interface Flow {
  id: string;
  from: string;
  to: string;
  style: Extract<EdgeStyle, "thick"> | "block";
  label: string[];
}

/**
 * Transcribed by eye from docs/.gitbook/assets/stakeholder-categories-2.png. There is no chart
 * source to compare with, so the image's hash stands in: scripts/check-diagrams.mjs fails if the
 * image changes, and this file has to be read against it again.
 */
export const data = {
  id: "participant-stack",
  kind: "figure" as const,
  imageFile: "docs/.gitbook/assets/stakeholder-categories-2.png",
  imageSha256: "5d5d7f2570e49b87ec3a3029f792b30f710e6d3429d6055adecc6007dcbae7fb",
  uses: [
    {
      sourceFile: "docs/network/participants.md",
      page: "/docs/network/participants",
      caption: "The different participants in the compute protocol",
    },
    {
      sourceFile: "docs/basics/key-properties.md",
      page: "/docs/basics/key-properties",
      caption: "The layers of the Quip Network Protocol",
    },
  ],
  layers: [
    {
      id: "consumers",
      name: ["Compute", "Consumers"],
      items: [
        { label: "Finance", shape: "person" },
        { label: "Logistics", shape: "person" },
        { label: "Materials", shape: "person" },
      ],
    },
    {
      id: "applications",
      name: ["Application", "Developers"],
      items: [
        { label: "Web", shape: "cube" },
        { label: "Mobile", shape: "cube" },
        { label: "Desktop", shape: "cube" },
      ],
    },
    { id: "algorithms", name: ["Algorithm", "Developers"], items: [{ label: "Smart Contracts", shape: "sheets" }] },
    { id: "protocols", name: ["Protocol", "Developers"], items: [{ label: "Quip Subnets", shape: "rects" }] },
    {
      id: "providers",
      name: ["Compute", "Providers"],
      items: [
        { label: "QPU", shape: "cube" },
        { label: "GPU", shape: "cube" },
        { label: "CPU", shape: "cube" },
      ],
    },
  ] satisfies StackLayer[],
  liquidity: { id: "liquidity", lines: ["Liquidity", "Providers"] },
  /** One line joins these three layers, and two flows meet Liquidity Providers through it. */
  bus: { id: "bus", layers: ["algorithms", "protocols", "providers"] },
  flows: [
    { id: "down-usd", from: "consumers", to: "applications", style: "block", label: ["USD"] },
    { id: "down-quip-1", from: "applications", to: "algorithms", style: "block", label: ["QUIP"] },
    { id: "down-quip-2", from: "algorithms", to: "protocols", style: "block", label: ["QUIP"] },
    { id: "down-quip-3", from: "protocols", to: "providers", style: "block", label: ["QUIP"] },
    { id: "app-usd", from: "applications", to: "liquidity", style: "thick", label: ["USD"] },
    { id: "app-quip", from: "liquidity", to: "applications", style: "thick", label: ["QUIP"] },
    { id: "bus-quip", from: "bus", to: "liquidity", style: "thick", label: ["QUIP"] },
    { id: "bus-usd", from: "liquidity", to: "bus", style: "thick", label: ["USD"] },
  ] satisfies Flow[],
};

export interface StackLayout {
  width: number;
  height: number;
  frame: { x: number; y: number; w: number };
  rowHeight: number;
  /** Baseline of a layer's name, from the top of its row. Two lines when `nameOnOneLine` is off. */
  name: { x: number; y: number };
  nameOnOneLine: boolean;
  /** Where the tags that sit on each divider are centred. */
  block: { cx: number };
  /** Where a row's items sit, from the top of its row. */
  items: { x: number; y: number; w: number; h: number; gap: number };
  liquidity: { x: number; y: number; w: number; h: number };
  bus: {
    path: string;
    ticks: Record<string, { x: number; y: number; to: number }>;
    attach: { x: number; y: number; w: number; h: number };
  };
  routes: Record<string, EdgeRoute>;
  /** Where the bus branches, marked so a join never reads as a crossing. */
  junctions: [number, number][];
}

/* Routes read best on one line. */
// prettier-ignore
export const layouts: { wide: StackLayout; narrow: StackLayout } = {
  wide: {
    width: 680,
    height: 402,
    frame: { x: 232, y: 0.5, w: 447.5 },
    rowHeight: 80,
    name: { x: 246, y: 36 },
    nameOnOneLine: false,
    block: { cx: 350 },
    items: { x: 396, y: 12, w: 272, h: 56, gap: 12 },
    liquidity: { x: 0.5, y: 234.5, w: 120, h: 92 },
    bus: {
      path: "M186 200.5 V360.5",
      ticks: {
        algorithms: { x: 186, y: 200.5, to: 232 },
        protocols: { x: 186, y: 280.5, to: 232 },
        providers: { x: 186, y: 360.5, to: 232 },
      },
      attach: { x: 186, y: 200.5, w: 0, h: 160 },
    },
    routes: {
      "app-usd": { points: [[232, 104.5], [40, 104.5], [40, 234.5]], label: { x: 196, y: 98 } },
      "app-quip": { points: [[90, 234.5], [90, 136.5], [232, 136.5]], label: { x: 196, y: 130 } },
      "bus-quip": { points: [[186, 262.5], [120.5, 262.5]], label: { x: 153, y: 256 } },
      "bus-usd": { points: [[120.5, 298.5], [186, 298.5]], label: { x: 153, y: 292 } },
    },
    junctions: [[186, 262.5], [186, 280.5], [186, 298.5]],
  },
  narrow: {
    width: 340,
    height: 611,
    frame: { x: 70, y: 0.5, w: 269.5 },
    rowHeight: 100,
    name: { x: 84, y: 20 },
    nameOnOneLine: true,
    block: { cx: 300 },
    items: { x: 84, y: 30, w: 244, h: 54, gap: 8 },
    liquidity: { x: 0.5, y: 562, w: 339, h: 48 },
    bus: {
      path: "M54 250.5 V530 H140",
      ticks: {
        algorithms: { x: 54, y: 250.5, to: 70 },
        protocols: { x: 54, y: 350.5, to: 70 },
        providers: { x: 54, y: 450.5, to: 70 },
      },
      attach: { x: 54, y: 530, w: 86, h: 0 },
    },
    routes: {
      "app-usd": { points: [[70, 130.5], [10, 130.5], [10, 562]], label: { x: 40, y: 124 } },
      "app-quip": { points: [[30, 562], [30, 170.5], [70, 170.5]], label: { x: 50, y: 164 } },
      "bus-quip": { points: [[84, 530], [84, 562]], label: { x: 90, y: 550, anchor: "start" } },
      "bus-usd": { points: [[140, 562], [140, 530]], label: { x: 146, y: 550, anchor: "start" } },
    },
    junctions: [[54, 350.5], [84, 530]],
  },
};
