import { loader } from "fumadocs-core/source";
import { defineDocs } from "fumadocs-mdx/macro";
import { applyMdxPreset } from "fumadocs-mdx/config";
import { metaSchema, pageSchema } from "fumadocs-core/source/schema";
import { remarkMdxMermaid } from "fumadocs-core/mdx-plugins/remark-mdx-mermaid";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import remarkSmartypants from "remark-smartypants";
import { remarkAutoTypeTable } from "fumadocs-typescript";
import { z } from "zod";
import { quipCodeThemeDark, quipCodeThemeLight } from "./code-theme.mjs";
import { rehypeReadable } from "./rehype-readable.mjs";
import { createReferenceGenerator, typeTableOptions } from "./reference-tables.mjs";
import { docsRoute } from "./shared";
import { remarkBespokeFigures } from "../components/diagrams/remark-bespoke-figures.mjs";

const docs = defineDocs({
  dir: "content/docs",
  docs: {
    // source_path points back at docs/ for "Edit on GitLab" until the cutover.
    // noindex is the XQuad book's pre-launch gate (QUI-988), set by scripts/sync-xquad.mjs.
    schema: pageSchema.extend({ source_path: z.string().optional(), noindex: z.boolean().optional() }),
    // applyMdxPreset keeps Fumadocs' defaults (GFM, heading ids, code highlighting).
    mdxOptions: applyMdxPreset({
      rehypeCodeOptions: { themes: { light: quipCodeThemeLight, dark: quipCodeThemeDark } },
      // Type tables first, so the defaults index them for search. Only $$ opens math: the
      // Documentation pages print prices and $QUIP with a bare $.
      remarkPlugins: (defaults) => [
        [remarkAutoTypeTable, { generator: createReferenceGenerator(), options: typeTableOptions }],
        ...defaults,
        remarkMdxMermaid,
        remarkBespokeFigures,
        [remarkMath, { singleDollarTextMath: false }],
        // Curly quotes, en and em dashes, ellipses: both old renderers did this (Astro by
        // default, mdBook's smart-punctuation). Code and math are left alone.
        [remarkSmartypants, { dashes: "oldschool" }],
      ],
      rehypePlugins: (defaults) => [rehypeKatex, ...defaults, rehypeReadable],
    }),
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
  meta: {
    schema: metaSchema,
  },
});

export const source = loader({
  baseUrl: docsRoute,
  source: docs.toFumadocsSource(),
});
