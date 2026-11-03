import { loader } from "fumadocs-core/source";
import { defineDocs } from "fumadocs-mdx/macro";
import { applyMdxPreset } from "fumadocs-mdx/config";
import { metaSchema, pageSchema } from "fumadocs-core/source/schema";
import { remarkMdxMermaid } from "fumadocs-core/mdx-plugins/remark-mdx-mermaid";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import { z } from "zod";
import { docsRoute } from "./shared";

const docs = defineDocs({
  dir: "content/docs",
  docs: {
    // source_path points back at docs/ for "Edit on GitLab" until the cutover.
    // noindex is the XQuad book's pre-launch gate (QUI-988), set by scripts/sync-xquad.mjs.
    schema: pageSchema.extend({ source_path: z.string().optional(), noindex: z.boolean().optional() }),
    // applyMdxPreset keeps Fumadocs' defaults (GFM, heading ids, code highlighting).
    mdxOptions: applyMdxPreset({
      // Only $$ opens math: the Documentation pages print prices and $QUIP with a bare $.
      remarkPlugins: (defaults) => [...defaults, remarkMdxMermaid, [remarkMath, { singleDollarTextMath: false }]],
      rehypePlugins: (defaults) => [rehypeKatex, ...defaults],
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
