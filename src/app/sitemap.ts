import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/shared";
import { source } from "@/lib/source";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: SITE_URL }, ...source.getPages().map((page) => ({ url: new URL(page.url, SITE_URL).href }))];
}
