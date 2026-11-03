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
 * Inline code never breaks inside a word: wrapping "@quip.network/ethereum-" away from "sdk" is
 * what makes tables look broken. A command wraps only between its words. Copying still gives the
 * original text. Tokens too long to fit a phone screen may break, so they cannot push it sideways.
 */
function InlineCode({ children, ...props }: ComponentProps<"code">) {
  if (typeof children !== "string") return <code {...props}>{children}</code>;
  return (
    <code {...props}>
      {children.split(/(\s+)/).map((part, index) =>
        index % 2 === 1 || part.length > 44 ? part : (
          <span key={index} className="quip-nowrap">
            {part}
          </span>
        ),
      )}
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
