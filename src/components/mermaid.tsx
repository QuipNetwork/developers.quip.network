"use client";

import { useTheme } from "next-themes";
import { useEffect, useId, useState } from "react";

/**
 * Renders a Mermaid diagram in the browser, in the brand's zinc palette for the current
 * theme. Mermaid is loaded only on pages that have a diagram.
 */
export function Mermaid({ chart }: { chart: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const { resolvedTheme } = useTheme();
  const [svg, setSvg] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { default: mermaid } = await import("mermaid");
      const dark = resolvedTheme === "dark";
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        fontFamily: '"ABC Favorit", system-ui, sans-serif',
        theme: "base",
        themeVariables: {
          background: dark ? "#09090b" : "#fafafa",
          primaryColor: dark ? "#18181b" : "#f4f4f5",
          primaryTextColor: dark ? "#fafafa" : "#09090b",
          primaryBorderColor: dark ? "#52525c" : "#a1a1aa",
          lineColor: dark ? "#9f9fa9" : "#52525c",
          secondaryColor: dark ? "#27272a" : "#e4e4e7",
          tertiaryColor: dark ? "#212124" : "#fafafa",
          clusterBkg: dark ? "#18181b" : "#f4f4f5",
          clusterBorder: dark ? "#3f3f46" : "#d4d4d8",
        },
      });
      const { svg } = await mermaid.render(`mermaid-${id}-${dark ? "d" : "l"}`, chart.replaceAll("\\n", "\n"));
      if (!cancelled) setSvg(svg);
    })();
    return () => {
      cancelled = true;
    };
  }, [chart, id, resolvedTheme]);

  if (!svg) return <pre className="text-xs">{chart}</pre>;
  return <div className="my-6 flex justify-center [&_svg]:max-w-full" dangerouslySetInnerHTML={{ __html: svg }} />;
}
