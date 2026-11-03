"use client";

import type { OpenAPIPageProps } from "fumadocs-openapi/ui";
import { lazy, Suspense } from "react";

// Every MDX page shares one route, so a static import would send the OpenAPI UI (220 KB) to all
// of them. Lazy, it reaches only the page that renders it, and it is still server-rendered.
// React.lazy rather than next/dynamic, whose manifest preloads a chunk the build never emits.
const Renderer = lazy(() => import("./faucet-api-renderer").then((mod) => ({ default: mod.FaucetApiRenderer })));

export function FaucetApiPage(props: OpenAPIPageProps) {
  return (
    <Suspense>
      <Renderer {...props} />
    </Suspense>
  );
}
