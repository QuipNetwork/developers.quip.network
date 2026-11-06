import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

// Every rule here used to live in netlify.toml. They move into the app so the site
// behaves the same on any host: the self-hosted container, a laptop, or a preview.

const markdown = [
  { key: "Content-Type", value: "text/markdown; charset=utf-8" },
  // The twins repeat the HTML pages and cannot carry a canonical link, so they stay
  // fetchable for agents but out of search indexes.
  { key: "X-Robots-Tag", value: "noindex" },
];

// Netlify answered these with 301, so they keep 301 rather than Next's default 308.
const moved = (source, destination) => ({ source, destination, statusCode: 301 });

/** @type {import('next').NextConfig} */
const config = {
  // The standalone server is what the Docker image runs. Netlify's runtime packages the app
  // itself, which matters only while netlify.toml stays as the fallback.
  output: process.env.NETLIFY ? undefined : "standalone",
  // Shown as "Updated" on the home page, as the Astro build did.
  env: { NEXT_PUBLIC_BUILD_DATE: new Date().toISOString().slice(0, 10) },
  reactStrictMode: true,
  poweredByHeader: false,
  // Trailing slashes are handled in src/proxy.ts, which strips them.
  skipTrailingSlashRedirect: true,
  async headers() {
    return [
      // Not /_next/static, whose hashed files Next marks immutable, or /mcp, which sends no-store.
      { source: "/((?!_next/static/|mcp$).*)", headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }] },
      // The same URL answers with HTML or Markdown, so a cache has to keep the two apart.
      { source: "/docs/:path*", headers: [{ key: "Vary", value: "Accept" }] },
      { source: "/fonts/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=604800, immutable" }] },
      { source: "/llms.txt", headers: [{ key: "Content-Type", value: "text/plain; charset=utf-8" }] },
      { source: "/docs/:path*.md", headers: markdown },
      { source: "/docs.md", headers: markdown },
      {
        source: "/docs/:file(llms.txt|llms-full.txt)",
        headers: [
          { key: "Content-Type", value: "text/plain; charset=utf-8" },
          { key: "X-Robots-Tag", value: "noindex" },
        ],
      },
      {
        source: "/docs/xquad/llms.txt",
        headers: [
          { key: "Content-Type", value: "text/plain; charset=utf-8" },
          { key: "X-Robots-Tag", value: "noindex" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // The toolchain page left the book's prefix (QUI-1331); both URLs were published.
      moved("/docs/xquad/toolchain", "/docs/xquad-toolchain"),
      moved("/docs/xquad/toolchain.md", "/docs/xquad-toolchain.md"),
      // GitBook-era paths.
      moved("/docs/getting-started/firewall", "/docs/getting-started/quip-sdk"),
      moved("/docs/basics/quip-the-quantum-unit-interlock-pathway", "/docs/quip-interlock-protocol/quip-the-quantum-unit-interlock-pathway"),
      moved("/docs/basics/quip-lifecycle", "/docs/quip-interlock-protocol/quip-lifecycle"),
      moved("/docs/interlock/how-quip-fits-together", "/docs/quip-interlock-protocol/how-quip-fits-together"),
      moved("/docs/interlock/quip-accounts", "/docs/quip-interlock-protocol/quip-accounts"),
      moved("/docs/interlock/quipswap", "/docs/quip-interlock-protocol/quipswap"),
      moved("/docs/protocols/encrypt", "/docs/quip-interlock-protocol/quip-accounts"),
      moved("/docs/protocols/accelerate", "/docs/compute/submit-a-job"),
      moved("/docs/basics/virtues", "/docs/quip-interlock-protocol/quip-the-quantum-unit-interlock-pathway"),
      moved("/docs/nodes/classical", "/docs/nodes/miners"),
      moved("/docs/nodes/quantum", "/docs/nodes/miners"),
      // The Quantum Day Singapore guest pass; the event has passed.
      moved("/sg", "/"),
      moved("/sg/index.html", "/"),
      // Astro's sitemap lived at /sitemap-index.xml; Next serves /sitemap.xml.
      moved("/sitemap-index.xml", "/sitemap.xml"),
    ];
  },
};

export default withMDX(config);
