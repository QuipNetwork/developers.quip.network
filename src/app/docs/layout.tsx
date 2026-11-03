import "katex/dist/katex.min.css";
import { DocsLayout } from "fumadocs-ui/layouts/notebook";
import type { ReactNode } from "react";
import { baseOptions } from "@/lib/layout.shared";
import { source } from "@/lib/source";

export default function Layout({ children }: { children: ReactNode }) {
  const base = baseOptions();
  return (
    // The notebook layout puts the bar across the top, as on the portal home page.
    <DocsLayout tree={source.getPageTree()} {...base} nav={{ ...base.nav, mode: "top" }}>
      {children}
    </DocsLayout>
  );
}
