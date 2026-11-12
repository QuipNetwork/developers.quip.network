"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/analytics";

/*
 * The six custom events, from one delegated listener so pages and third-party components
 * need no wiring: copy, outbound, md-view, theme, search-opened and 404 (the last sent by
 * the not-found page). No query text and no personal data, ever.
 */
export function AnalyticsEvents() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target as Element | null;
      if (!target?.closest) return;

      const control = target.closest("button, [role='button']");
      if (control) {
        const name = control.getAttribute("aria-label") ?? control.textContent ?? "";
        if (control.closest("[data-theme-toggle]")) track("theme");
        else if (control.matches("[data-search], [data-search-full]")) track("search-opened");
        else if (/copy/i.test(name)) track("copy", { id: name.trim().slice(0, 80) });
      }

      const link = target.closest("a[href]") as HTMLAnchorElement | null;
      if (!link) return;
      const url = new URL(link.href, location.href);
      if (url.host !== location.host) track("outbound", { host: url.host });
      else if (url.pathname.endsWith(".md")) track("md-view");
    }
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") track("search-opened");
    }
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);
  return <GuideEvents />;
}

/*
 * Kevin's guide reader events from the old site (main 348f91f), with the same names and
 * data: guide-scroll at 25, 50, 75 and 100 percent, and guide-link for a link in the page.
 * Keyed on the path, so moving between guides without a reload counts each one.
 */
function GuideEvents() {
  const page = usePathname();
  useEffect(() => {
    if (!page.startsWith("/docs/guides/")) return;
    const sent = new Set<number>();
    function onScroll() {
      const depth = (scrollY + innerHeight) / document.documentElement.scrollHeight;
      for (const mark of [25, 50, 75, 100]) {
        if (depth * 100 >= mark && !sent.has(mark)) {
          sent.add(mark);
          track("guide-scroll", { page, depth: mark });
        }
      }
    }
    function onClick(event: MouseEvent) {
      const link = (event.target as Element | null)?.closest?.("article a, main a");
      if (link) track("guide-link", { page, href: link.getAttribute("href") ?? "" });
    }
    addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("click", onClick);
    return () => {
      removeEventListener("scroll", onScroll);
      document.removeEventListener("click", onClick);
    };
  }, [page]);
  return null;
}

/** Rendered by the not-found page. */
export function Track404() {
  useEffect(() => track("404"), []);
  return null;
}
