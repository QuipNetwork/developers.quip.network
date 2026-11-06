import { Panel } from "../components/Panel";
import { LinkRow } from "../components/LinkRow";
import { MonoLabel } from "@design/components/Headings";
import { GhostLink } from "@design/components/Buttons";
import { CopyCommand } from "../components/CopyCommand";
import { AI, AI_HREF, DOCS_HREF } from "../data/links";
import { CHAIN, EVM, EXPLORER } from "../data/testnet";

// Everything an agent needs to start work, in one paste.
//
// Every value here is interpolated from ../data/testnet.ts. It used to claim it
// "cannot drift" while hard-coding the explorer URL two lines below, and it did
// drift — the literal outlived the chain it pointed at. scripts/check-endpoints.mjs
// now fails the build if a bare endpoint reappears in this file.
//
// The genesis line matters more than it looks: an agent trained before the
// network reset will otherwise accept the retired chain as correct, because the
// EVM chain ID is identical on both.
const AGENT_PROMPT = [
  "You are helping me build on Quip Network.",
  `Docs index: ${AI.llmsTxt}. Any docs page returns markdown if you append .md to its URL.`,
  `Testnet EVM JSON-RPC: ${EVM.rpcUrl} (chain ID ${EVM.chainId}). Verify on-chain results against ${EXPLORER.url}.`,
  `Confirm you are on the right chain by genesis hash ${CHAIN.genesis}, not by chain ID.`,
  "TypeScript SDK: @quip.network/ethereum-sdk@beta. Python compute toolchain: xquad[quip], which installs the xqsa solvers and the Quip Network backend.",
].join("\n\n");

const SURFACES = [
  {
    label: "llms.txt",
    description: "Annotated page index",
    href: AI_HREF.llmsTxt,
  },
  {
    label: "llms-full.txt",
    description: "Whole docs, one file",
    href: AI_HREF.llmsFullTxt,
  },
  {
    label: "Markdown mirrors",
    description: "Append .md to any page",
    href: DOCS_HREF.useWithAi,
  },
  {
    label: "This portal's llms.txt",
    description: "Routing for agents landing here",
    href: "/llms.txt",
  },
];

export function BuildWithAi() {
  return (
    <Panel
      id="ai"
      eyebrow="03"
      title="Build with AI"
      hint="Agents read these docs more than people do"
      tone="dark"
    >
      <div className="grid grid-cols-12 gap-x-6 gap-y-5">
        <div className="col-span-7 flex flex-col gap-4 max-md:col-span-12">
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline gap-2.5">
              <MonoLabel size="xs" tone="dark">
                Bootstrap prompt
              </MonoLabel>
              <p className="m-0 text-[12.5px] leading-[1.45] text-zinc-400">
                Docs index, testnet endpoint, and the right package names.
              </p>
            </div>
            <CopyCommand
              command={AGENT_PROMPT}
              variant="dark"
              prompt={null}
              multiline
              label="the agent bootstrap prompt"
            />
          </div>
        </div>

        <div className="col-span-5 flex flex-col gap-2 max-md:col-span-12">
          <MonoLabel size="xs" tone="dark">
            Machine-readable docs
          </MonoLabel>
          <ul className="m-0 flex list-none flex-col p-0">
            {SURFACES.map((surface) => (
              <LinkRow
                key={surface.label}
                label={surface.label}
                description={surface.description}
                href={surface.href}
                mono
                tone="dark"
              />
            ))}
          </ul>
          <div className="mt-1">
            <GhostLink href={DOCS_HREF.useWithAi} external>
              Use Docs with AI
            </GhostLink>
          </div>
        </div>
      </div>
    </Panel>
  );
}
