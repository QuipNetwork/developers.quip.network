"use client";

import { useTheme } from "fumadocs-ui/provider/base";

/*
 * Text, not an icon: the brand allows four glyphs and none of them means "theme".
 * Both labels are rendered and CSS picks one off the `dark` class next-themes sets
 * before paint, so the server markup never has to guess the visitor's theme.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className={className}
    >
      <span className="sr-only">Switch to </span>
      <span className="dark:hidden">Dark</span>
      <span className="hidden dark:inline">Light</span>
      <span className="sr-only"> mode</span>
    </button>
  );
}
