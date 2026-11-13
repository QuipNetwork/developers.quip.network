"use client";

import { useEffect, useState } from "react";
import { useTheme } from "fumadocs-ui/provider/base";

/*
 * Light and Dark side by side, with the current one filled, so both choices and the
 * current state are visible at a glance. Text, not icons: the brand allows four glyphs
 * and none of them means "theme".
 *
 * The fill comes from CSS off the `dark` class next-themes sets before paint, so the
 * server markup never has to guess the visitor's theme. aria-pressed waits for mount
 * for the same reason.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const current = mounted ? resolvedTheme : undefined;

  return (
    <div role="group" aria-label="Theme" className={`quip-theme-switch ${className}`}>
      <button
        type="button"
        data-theme-option="light"
        aria-pressed={current === undefined ? undefined : current === "light"}
        onClick={() => setTheme("light")}
      >
        Light
      </button>
      <button
        type="button"
        data-theme-option="dark"
        aria-pressed={current === undefined ? undefined : current === "dark"}
        onClick={() => setTheme("dark")}
      >
        Dark
      </button>
    </div>
  );
}
