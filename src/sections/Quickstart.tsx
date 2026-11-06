import { Fragment } from "react";
import { Panel } from "../components/Panel";
import { LinkRow } from "../components/LinkRow";
import { MonoLabel } from "@design/components/Headings";
import { CopyCommand } from "../components/CopyCommand";
import { DOCS_HREF as DOCS, CODE } from "../data/links";

interface Path {
  tab: string;
  runtime: string;
  title: string;
  body: string;
  command: string;
  note?: string;
  steps: { label: string; description: string; href: string }[];
}

const PATHS: Path[] = [
  {
    tab: "Protect assets",
    runtime: "TypeScript",
    title: "Put a post-quantum lock on assets you already hold",
    body: "A Quip Account is a contract-based lockbox on a chain you already use, secured by hash-based signatures rather than elliptic curves.",
    command: "npm install @quip.network/ethereum-sdk@beta",
    note: "Install the @beta tag. The default latest tag still resolves to 0.1.7, published in 2025, and predates the current signer.",
    steps: [
      {
        label: "Quip SDK",
        description: "Keys, signing, account lifecycle",
        href: DOCS.sdk,
      },
      {
        label: "Quip Accounts",
        description: "How the lockbox works",
        href: DOCS.accounts,
      },
      {
        label: "QuipSwap",
        description: "Hash-locked swaps, no bridge",
        href: DOCS.quipswap,
      },
    ],
  },
  {
    tab: "Run compute",
    runtime: "Python",
    title: "Send an optimization problem to real quantum hardware",
    body: "XQuad expresses a problem once as an Ising model. XQSA points it at a solver: your own CPU while you iterate, then the network's miners without rewriting the model.",
    command: 'pip install "xquad[quip]"',
    note: "Requires Python 3.13 or newer. Solve locally with SolverDWaveCPU before reaching for the network backend.",
    steps: [
      {
        label: "Submit a job",
        description: "Model to settled reward",
        href: DOCS.submitAJob,
      },
      {
        label: "Quantum randomness",
        description: "QVRF, and its limits",
        href: DOCS.qvrf,
      },
      { label: "xquad", description: "Toolchain source", href: CODE.xquad },
    ],
  },
  {
    tab: "Run a node",
    runtime: "Desktop or server",
    title: "Join the testnet and earn from useful work",
    body: "Quip pays for solved optimization problems rather than discarded hashes. Run the desktop node manager on one machine, or deploy the compose stack for an always-on node.",
    command: "git clone https://gitlab.com/quip.network/nodes.quip.network",
    note: "Prefer the desktop app for a first run: it ships a GUI and a TUI for Windows, Linux, and macOS.",
    steps: [
      {
        label: "Run a node",
        description: "Requirements and install routes",
        href: DOCS.runANode,
      },
      {
        label: "Node manager",
        description: "Signed desktop builds",
        href: CODE.nodeManager,
      },
      {
        label: "Miners",
        description: "Classical and quantum",
        href: DOCS.miners,
      },
    ],
  },
];

const tabClass =
  "inline-flex cursor-pointer items-center border border-(--color-border) bg-(--color-zinc-50) px-2.5 pt-1.5 pb-1 [font-family:var(--font-mono)] font-features-['case'] text-[11px] leading-[1.2] font-medium tracking-[0.4px] text-zinc-600 uppercase transition-colors duration-150 select-none hover:bg-(--color-surface-2) hover:text-zinc-950";

/*
 * Tabs without JavaScript: a radio group drives the panels, so the section works
 * before hydration and with scripting off. The rules are the .qs-* block in
 * src/styles/index.css. `defaultChecked`, not `checked`: React would otherwise treat
 * the radios as controlled and pin the first tab.
 */
export function Quickstart() {
  return (
    <Panel
      id="quickstart"
      eyebrow="01"
      title="Quickstart"
      hint="Pick the path that matches what you need Quip for"
    >
      <div className="qs flex flex-col gap-4">
        <div className="qs-tablist flex flex-wrap gap-1.5">
          {PATHS.map((path, index) => (
            <Fragment key={path.tab}>
              <input
                type="radio"
                name="quickstart"
                id={`qs-${index}`}
                className="qs-radio"
                defaultChecked={index === 0}
              />
              <label htmlFor={`qs-${index}`} className={tabClass}>
                {path.tab}
              </label>
            </Fragment>
          ))}
        </div>

        <div className="qs-panels">
          {PATHS.map((path, index) => (
            <div
              key={path.tab}
              className="qs-panel grid grid-cols-12 gap-x-6 gap-y-4"
              data-panel={index}
            >
              <div className="col-span-7 flex flex-col gap-2.5 max-md:col-span-12">
                <div className="flex items-baseline gap-2.5">
                  <MonoLabel size="xs">{path.runtime}</MonoLabel>
                  <h3 className="m-0 text-[14px] leading-[1.35] font-semibold text-zinc-950">
                    {path.title}
                  </h3>
                </div>
                <p className="m-0 text-[13px] leading-[1.5] text-(--color-text-subtle)">
                  {path.body}
                </p>
                <CopyCommand
                  command={path.command}
                  label={`the ${path.tab.toLowerCase()} command`}
                />
                {path.note && (
                  <div className="flex gap-2.5 bg-(--color-surface-1) px-3 py-2">
                    <span className="shrink-0 [font-family:var(--font-mono)] font-features-['case'] text-[11px] leading-[18px] font-medium tracking-[0.4px] text-zinc-950 uppercase">
                      Note
                    </span>
                    <p className="m-0 text-[12px] leading-[1.5] text-(--color-text-subtle)">
                      {path.note}
                    </p>
                  </div>
                )}
              </div>

              <div className="col-span-5 flex flex-col gap-2 max-md:col-span-12">
                <MonoLabel size="xs">Then</MonoLabel>
                <ul className="m-0 flex list-none flex-col p-0">
                  {path.steps.map((step) => (
                    <LinkRow
                      key={step.label}
                      label={step.label}
                      description={step.description}
                      href={step.href}
                    />
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}
