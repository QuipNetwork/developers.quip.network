import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const docs = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/docs" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    group: z.string(),
    order: z.number(),
    route: z.string(),
    source_path: z.string(),
  }),
});

export const collections = { docs };
