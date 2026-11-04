/** What a diagram says: compared with its Mermaid source by scripts/check-diagrams.mjs. */
export type EdgeStyle = "arrow" | "thick" | "both" | "line";

export interface DiagramNode {
  id: string;
  /** One entry per `<br/>`-separated line of the source label. */
  lines: string[];
  /** How many leading lines are set as the node's name. The rest are detail. Default: all. */
  nameLines?: number;
  /** The source gave this node the `quip` class. */
  emphasis?: boolean;
  /** The label is data rather than a name, as in the numbered cities of the TSP graph. */
  mono?: boolean;
}

export interface DiagramEdge {
  id: string;
  from: string;
  to: string;
  style: EdgeStyle;
  label?: string[];
}

export interface DiagramGroup {
  id: string;
  label: string;
  /** Node and group ids directly inside this group. */
  children: string[];
  /** The source gave this subgraph its own `style` line. */
  raised?: boolean;
}

export interface DiagramData {
  id: string;
  /** The file holding the Mermaid fence, relative to the repo root. */
  sourceFile: string;
  /** The page that shows it. */
  page: string;
  /** The exact chart text, the registry key. */
  source: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  groups: DiagramGroup[];
}

/** Where a diagram is drawn: positions only, so a layout cannot change what the diagram says. */
export type Point = [x: number, y: number];

export interface NodeBox {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Rewrapped lines for this layout. The words must match the label's. */
  lines?: string[];
  nameLines?: number;
  /** Start the text at the top, for side-by-side nodes whose line counts differ. */
  top?: boolean;
}

export interface GroupBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface EdgeRoute {
  /** From the `from` node's border to the `to` node's border. */
  points: Point[];
  label?: {
    x: number;
    /** Baseline of the first line. */
    y: number;
    anchor?: "start" | "middle" | "end";
    /** Rewrapped lines for this layout. The words must match the label's. */
    lines?: string[];
    /** Sits on its own line, on a background that masks the line. */
    knockout?: boolean;
  };
}

export interface DiagramLayout {
  width: number;
  height: number;
  nodes: Record<string, NodeBox>;
  groups: Record<string, GroupBox>;
  edges: Record<string, EdgeRoute>;
}

export interface DiagramLayouts {
  /** Drawn at any width when `narrow` is absent, and above the phone breakpoint otherwise. */
  wide: DiagramLayout;
  /** A stacked drawing for phone widths. */
  narrow?: DiagramLayout;
}
