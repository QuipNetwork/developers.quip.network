import defaultMdxComponents from "fumadocs-ui/mdx";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import type { MDXComponents } from "mdx/types";
import type { ReactNode } from "react";
import { Mermaid } from "./mermaid";
import { ParticipantStack } from "./diagrams/participant-stack";

type CalloutType = "info" | "warn" | "error" | "success";
const LABEL: Record<CalloutType, string> = { info: "Note", warn: "Warning", error: "Warning", success: "Success" };

/** Brand callout: a left bar in the variant's colour and a mono label, no icon. */
function Callout({ type = "info", title, children }: { type?: CalloutType; title?: ReactNode; children?: ReactNode }) {
  return (
    <aside className="quip-callout not-prose-label" data-type={type}>
      <p className="quip-callout-label">{title ?? LABEL[type]}</p>
      <div>{children}</div>
    </aside>
  );
}

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    Callout,
    Tab,
    Tabs,
    Mermaid,
    ParticipantStack,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
