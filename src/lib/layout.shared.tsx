import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { CODE, NETWORK, SITE } from "@/data/links";
import { EXPLORER } from "@/data/testnet";

/**
 * The portal-style bar, shared by the docs: logo lockup and a mono surface label, as on
 * the developers.quip.network home header (not quip.network's marketing navbar).
 */
export function PortalTitle({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-3">
      <img src="/images/quip-logo-with-icon.svg" alt="Quip Network" width={84} height={26} className="h-[26px] w-auto dark:invert" />
      <span className="quip-eyebrow border border-fd-border px-1.5 pt-1 pb-0.5 text-[10px] leading-none max-md:hidden">
        {label}
      </span>
    </span>
  );
}

export function baseOptions(label = "Documentation"): BaseLayoutProps {
  return {
    nav: {
      title: <PortalTitle label={label} />,
      url: "/",
    },
    links: [
      { text: "Explorer", url: EXPLORER.url, external: true },
      { text: "GitLab", url: CODE.gitlabGroup, external: true },
      { text: "Feedback", url: NETWORK.feedback, external: true },
      { text: "quip.network ↗", url: SITE.home, external: true },
    ],
  };
}
