import { loader } from "fumadocs-core/source";
import { defineDocs } from "fumadocs-mdx/macro";
import { applyMdxPreset } from "fumadocs-mdx/config";
import { metaSchema, pageSchema } from "fumadocs-core/source/schema";
import { remarkMdxMermaid } from "fumadocs-core/mdx-plugins/remark-mdx-mermaid";
import { remarkAutoTypeTable } from "fumadocs-typescript";
import { z } from "zod";
import { createReferenceGenerator, typeTableOptions } from "./reference-tables.mjs";
import { docsRoute } from "./shared";

const docs = defineDocs({
  dir: "content/docs",
  docs: {
    // source_path points back at docs/ for "Edit on GitLab" until the cutover.
    schema: pageSchema.extend({ source_path: z.string().optional() }),
    // applyMdxPreset keeps Fumadocs' defaults (GFM, heading ids, code highlighting).
    mdxOptions: applyMdxPreset({
      // Type tables first, so the defaults index them for search.
      remarkPlugins: (defaults) => [
        [remarkAutoTypeTable, { generator: createReferenceGenerator(), options: typeTableOptions }],
        ...defaults,
        remarkMdxMermaid,
      ],
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
