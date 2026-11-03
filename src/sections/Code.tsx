import { Panel } from "../components/Panel";
import { LinkRow } from "../components/LinkRow";
import { MonoLabel } from "@design/components/Headings";
import { TextLink } from "@design/components/Buttons";
import { CODE, REGISTRIES } from "../data/links";

const REPOS = [
  {
    label: "quip-validator",
    description: "Protocol node, Rust",
    href: CODE.validator,
  },
  { label: "xquad", description: "Problem formulation", href: CODE.xquad },
  {
    label: "quip-node-manager",
    description: "Desktop node app",
    href: CODE.nodeManager,
  },
  {
    label: "nodes.quip.network",
    description: "Compose deployment",
    href: CODE.nodeServer,
  },
  {
    label: "ethereum-sdk",
    description: "PQ accounts and swaps",
    href: CODE.ethereumSdk,
  },
  {
    label: "hashsigs-rs",
    description: "Signatures, five ports",
    href: CODE.hashsigs,
  },
  {
    label: "quip-miner",
    description: "CPU, CUDA, Metal, D-Wave",
    href: CODE.miner,
  },
];

const PACKAGES = [
  {
    registry: "npm",
    install: "npm i @quip.network/ethereum-sdk@beta",
    href: REGISTRIES.ethereumSdk,
  },
  {
    registry: "npm",
    install: "npm i @quip.network/quip-swap-sdk@beta",
    href: REGISTRIES.quipSwapSdk,
  },
  {
    registry: "npm",
    install: "npm i @quip.network/hashsigs-wasm@rc",
    href: REGISTRIES.hashsigsWasm,
  },
  {
    registry: "PyPI",
    install: 'pip install "xquad[quip]"',
    href: REGISTRIES.xquad,
  },
  {
    registry: "crates",
    install: "cargo add hashsigs-rs",
    href: REGISTRIES.hashsigsRs,
  },
];

export function Code() {
  return (
    <Panel
      id="code"
      eyebrow="05"
      title="Code"
      hint="AGPL 3.0. GitLab is canonical; GitHub mirrors it."
    >
      <div className="grid grid-cols-12 gap-x-6 gap-y-5">
        <div className="col-span-6 flex flex-col gap-2 max-md:col-span-12">
          <div className="flex items-baseline justify-between gap-3">
            <MonoLabel size="xs">Repositories</MonoLabel>
            <span className="text-[12px] text-(--color-muted)">
              <TextLink href={CODE.gitlabGroup} external>
                gitlab.com/quip.network
              </TextLink>
            </span>
          </div>
          <ul className="m-0 flex list-none flex-col p-0">
            {REPOS.map((repo) => (
              <LinkRow
                key={repo.label}
                label={repo.label}
                description={repo.description}
                href={repo.href}
                mono
              />
            ))}
          </ul>
        </div>

        <div className="col-span-6 flex flex-col gap-2 max-md:col-span-12">
          <div className="flex items-baseline justify-between gap-3">
            <MonoLabel size="xs">Packages</MonoLabel>
            <span className="text-[12px] text-(--color-muted)">
              {"Always the "}
              <code className="[font-family:var(--font-mono)] text-[11.5px]">
                @quip.network
              </code>
              {" scope"}
            </span>
          </div>
          <ul className="m-0 flex list-none flex-col p-0">
            {PACKAGES.map((pkg) => (
              <li
                key={pkg.install}
                className="flex items-baseline gap-3 border-t border-(--color-border) py-1.5 last:border-b"
              >
                <a
                  href={pkg.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1 overflow-x-auto [font-family:var(--font-mono)] text-[12px] leading-[1.5] whitespace-pre text-zinc-950 no-underline transition-colors duration-150 hover:text-(--color-accent-text)"
                >
                  {/* The padding spaces show under whitespace-pre: they indent the row. */}
                  {` ${pkg.install} `}
                </a>
                <MonoLabel size="xs">{pkg.registry}</MonoLabel>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Panel>
  );
}
