import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const docs = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/docs" }),
  // Two kinds of entry share this collection because the sidebar is built from it,
  // so grouping and ordering have one source of truth. A page carries `route` (the
  // empty string is the docs index) and `source_path`. A nav-only link carries
  // `href` and renders no page of its own.
  schema: z
    .object({
      title: z.string(),
      description: z.string().optional(),
      group: z.string(),
      order: z.number(),
      route: z.string().optional(),
      source_path: z.string().optional(),
      href: z.string().optional(),
    })
    .refine((entry) => (entry.route === undefined) !== (entry.href === undefined), {
      message: "A docs entry needs exactly one of `route` (a rendered page) or `href` (a nav link).",
    }),
});

export const collections = { docs };
