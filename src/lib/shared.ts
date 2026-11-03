// Production URL. Canonicals, sitemap and Open Graph always point here, including on
// staging, which is kept out of indexes with ROBOTS_NOINDEX instead.
export const SITE_URL = "https://developers.quip.network";
export const appName = "Quip Network Docs";
export const docsRoute = "/docs";

export const gitConfig = {
  host: "https://gitlab.com",
  project: "quip.network/developers.quip.network",
  branch: "main",
};

/** The Markdown twin of a docs page, as served today: /docs/<route>.md, or /docs.md for the index. */
export function markdownUrlOf(page: { slugs: string[] }) {
  return page.slugs.length ? `${docsRoute}/${page.slugs.join("/")}.md` : `${docsRoute}.md`;
}

/** Where a page's source lives until the cutover (docs/), for "Edit on GitLab". */
export function sourceUrlOf(sourcePath: string | undefined) {
  if (!sourcePath) return undefined;
  return `${gitConfig.host}/${gitConfig.project}/-/blob/${gitConfig.branch}/docs/${sourcePath}`;
}
