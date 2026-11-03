"use client";

import { useEffect } from "react";
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
  return null;
}

/** Rendered by the not-found page. */
export function Track404() {
  useEffect(() => track("404"), []);
  return null;
}
