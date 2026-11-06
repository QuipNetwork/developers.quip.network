import type { Metadata } from "next";
import { SideNav } from "@/components/SideNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CODE, DOCS_HREF as DOCS, NETWORK, SITE } from "@/data/links";
import { EXPLORER } from "@/data/testnet";
import { BuildWithAi } from "@/sections/BuildWithAi";
import { Code } from "@/sections/Code";
import { Help } from "@/sections/Help";
import { Masthead } from "@/sections/Masthead";
import { Network } from "@/sections/Network";
import { Paths } from "@/sections/Paths";
import { Quickstart } from "@/sections/Quickstart";
import "@/styles/index.css";

const TITLE = "Quip Network for developers";
const DESCRIPTION =
  "The starting point for building on Quip Network: quickstart commands for the SDKs and compute toolchain, testnet connection details, machine-readable docs for coding agents, and every repository in one place.";
const OG_IMAGE = "/images/og/developers.png?v=1";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    url: "/",
    images: [{ url: OG_IMAGE, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
};

const SECTIONS = [
  { id: "quickstart", label: "Quickstart" },
  { id: "paths", label: "Paths" },
  { id: "ai", label: "Build with AI" },
  { id: "network", label: "Network" },
  { id: "code", label: "Code" },
  { id: "help", label: "Help" },
];

const topLinkClass =
  "[font-family:var(--font-mono)] font-features-['case'] text-[11px] leading-[1.2] font-medium tracking-[0.4px] text-(--color-text-subtle) uppercase no-underline transition-colors duration-150 hover:text-zinc-950";

export default function Home() {
  return (
    <div className="quip-home bg-(--color-bg) font-(family-name:--font-body) text-[14px] leading-[1.35] text-zinc-950 antialiased selection:bg-(--color-accent) selection:text-zinc-950">
      <div className="overflow-x-clip">
        <div className="flex min-h-screen flex-col bg-(--color-bg) text-zinc-950">
          {/* Slim application chrome. Deliberately not the marketing SiteHeader:
              this surface is operated, not read, so the top bar carries actions. */}
          <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-(--color-border) bg-(--color-bg)/95 px-4 backdrop-blur max-lg:h-12">
            <a
              href={SITE.home}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Quip Network"
              className="shrink-0 no-underline"
            >
              <img
                src="/images/quip-logo-with-icon.svg"
                alt="Quip Network"
                width={84}
                height={26}
                className="h-[26px] w-auto dark:invert"
              />
            </a>
            <span className="border border-(--color-border) px-1.5 pt-1 pb-0.5 [font-family:var(--font-mono)] font-features-['case'] text-[10px] leading-none font-medium tracking-[0.4px] text-(--color-muted) uppercase max-md:hidden">
              Developers
            </span>

            <nav className="ml-auto flex items-center gap-4 max-md:gap-3">
              <a
                href={DOCS.home}
                target="_blank"
                rel="noopener noreferrer"
                className={topLinkClass}
              >
                Docs
              </a>
              <a
                href={EXPLORER.url}
                target="_blank"
                rel="noopener noreferrer"
                className={topLinkClass}
              >
                Explorer
              </a>
              <a
                href={CODE.gitlabGroup}
                target="_blank"
                rel="noopener noreferrer"
                className={`${topLinkClass} max-md:hidden`}
              >
                GitLab
              </a>
              {/* Below 345px the bar has no room for it, and the theme still follows the system. */}
              <ThemeToggle
                className={`${topLinkClass} cursor-pointer max-[344px]:hidden`}
              />
              <a
                href={NETWORK.feedback}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:bg-zinc-750 inline-flex items-center border border-zinc-900 bg-zinc-900 px-2.5 pt-1.5 pb-1 [font-family:var(--font-mono)] font-features-['case'] text-[10.5px] leading-[1.2] font-medium tracking-[0.4px] text-zinc-50 uppercase no-underline transition-colors duration-150"
              >
                Feedback
              </a>
            </nav>
          </header>

          <div className="mx-auto flex w-full max-w-[1320px] flex-1 gap-6 px-4 py-4 max-lg:flex-col max-lg:gap-0 max-lg:px-0 max-lg:py-0">
            <div className="w-[172px] shrink-0 max-lg:w-full max-lg:px-4">
              <SideNav items={SECTIONS} />
            </div>

            <main className="flex min-w-0 flex-1 flex-col gap-3 max-lg:px-4 max-lg:py-4">
              <Masthead />
              <Quickstart />
              <Paths />
              <BuildWithAi />
              <Network />
              <Code />
              <Help />

              <footer className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 px-1 pt-1 pb-2 text-[11.5px] text-(--color-muted)">
                <span className="font-features-['case']">
                  © 2026 Quantum Unit Interlock Protocol
                </span>
                <span className="font-features-['case']">
                  Agents:{" "}
                  <a
                    href="/llms.txt"
                    className="underline underline-offset-2 transition-colors duration-150 hover:text-(--color-accent-text)"
                  >
                    /llms.txt
                  </a>
                </span>
              </footer>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
