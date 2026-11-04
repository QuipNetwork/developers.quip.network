import { bespokeDiagram } from "./diagrams/registry";
import { MermaidFallback } from "./diagrams/mermaid-fallback";

/**
 * Every mermaid fence lands here. A chart whose exact source has a hand-drawn diagram gets
 * that drawing; any other, including one edited since it was drawn, stays Mermaid, so the
 * site can never show a drawing of an older chart.
 */
export function Mermaid({ chart }: { chart: string }) {
  const Bespoke = bespokeDiagram(chart);
  return Bespoke ? <Bespoke /> : <MermaidFallback chart={chart} />;
}
