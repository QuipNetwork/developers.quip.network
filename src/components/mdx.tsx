import defaultMdxComponents from "fumadocs-ui/mdx";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import type { MDXComponents } from "mdx/types";
import type { ComponentProps, ReactNode } from "react";
import { Mermaid } from "./mermaid";
import { ParticipantStack } from "./diagrams/participant-stack";

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
 * what makes tables look broken. Short code stays whole. A long command wraps only between its
 * words, and its last word keeps its neighbour. Copying still gives the original text. On phones
 * very long tokens may break, so they cannot push the page sideways.
 */
const WHOLE_UNDER = 36;

function InlineCode({ children, ...props }: ComponentProps<"code">) {
  if (typeof children !== "string") return <code {...props}>{children}</code>;
  if (children.length <= WHOLE_UNDER) {
    return (
      <code {...props}>
        <span className={children.length > 24 ? "quip-nowrap-wide" : "quip-nowrap"}>{children}</span>
      </code>
    );
  }
  return <code {...props}>{groupWords(children)}</code>;
}

function groupWords(text: string) {
  const parts = text.split(/(\s+)/);
  // Keep the last word with the one before it.
  if (parts.length >= 3 && parts[parts.length - 1].length < 12) {
    const last = parts.pop() as string;
    const gap = parts.pop() as string;
    parts[parts.length - 1] += gap + last;
  }
  return parts.map((part, index) =>
    index % 2 === 1 ? (
      part
    ) : (
      <span key={index} className="quip-nowrap-wide">
        {part}
      </span>
    ),
  );
}

/** A comparison table may scroll inside its own box, so that box must be reachable by keyboard. */
function Table(props: ComponentProps<"table"> & { "data-layout"?: string }) {
  const scrolls = props["data-layout"] === "compare";
  return (
    <div className="quip-table" {...(scrolls ? { tabIndex: 0, role: "region", "aria-label": "Comparison table" } : {})}>
      <table {...props} />
    </div>
  );
}

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    code: InlineCode,
    table: Table,
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
