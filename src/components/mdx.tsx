import defaultMdxComponents from "fumadocs-ui/mdx";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import type { MDXComponents } from "mdx/types";
import type { ComponentProps, ReactNode } from "react";
import { Mermaid } from "./mermaid";

type CalloutType = "info" | "warn" | "error" | "success";
const LABEL: Record<CalloutType, string> = { info: "Note", warn: "Warning", error: "Warning", success: "Success" };

/** Brand callout: a quiet panel with a solid mono chip, like the section labels on quip.network. */
function Callout({ type = "info", title, children }: { type?: CalloutType; title?: ReactNode; children?: ReactNode }) {
  return (
    <aside className="quip-callout" data-type={type}>
      <p className="quip-callout-label">{title ?? LABEL[type]}</p>
      <div>{children}</div>
    </aside>
  );
}

/*
 * Inline code. A token with no spaces (a package name, a flag, a tag) never breaks across
 * lines; wrapping "@quip.network/ethereum-" away from "sdk" is what makes tables look broken.
 * Very long tokens still may, so they cannot push a phone screen sideways.
 */
function InlineCode({ className, children, ...props }: ComponentProps<"code">) {
  const token = typeof children === "string" && !/\s/.test(children) && children.length <= 44;
  return (
    <code {...props} className={[className, token ? "quip-token" : ""].filter(Boolean).join(" ") || undefined}>
      {children}
    </code>
  );
}

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    code: InlineCode,
    Callout,
    Tab,
    Tabs,
    Mermaid,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
