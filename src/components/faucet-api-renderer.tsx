"use client";

import { useResponseExamples } from "fumadocs-openapi/operation";
import { createCodeUsageGeneratorRegistry } from "fumadocs-openapi/requests/generators";
import { curl } from "fumadocs-openapi/requests/generators/curl";
import { createOpenAPIPage } from "fumadocs-openapi/ui";
import type { ReactNode } from "react";

// curl only: the faucet refuses browsers, so the fetch and other generated samples would mislead.
const codeUsages = createCodeUsageGeneratorRegistry();
codeUsages.add("curl", curl);

/** Leaves out the response panel when the spec has no body to show: it would print "Empty". */
function ExampleLayout({ usageTabs, responseTabs }: { usageTabs: ReactNode; responseTabs: ReactNode }) {
  const hasBody = useResponseExamples().some((tab) => tab.mediaType);
  return (
    <div className="prose-no-margin flex min-h-0 flex-col">
      {usageTabs}
      {hasBody ? responseTabs : null}
    </div>
  );
}

export const FaucetApiRenderer = createOpenAPIPage({
  // No "Send" button: a browser cannot complete this request.
  playground: { enabled: false },
  generateTypeScriptDefinitions: false,
  codeUsages,
  content: {
    renderAPIExampleLayout: ({ usageTabs, responseTabs }) => <ExampleLayout usageTabs={usageTabs} responseTabs={responseTabs} />,
  },
});
