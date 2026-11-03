import clsx from "clsx";
import type { ReactNode } from "react";
import { MonoLabel } from "@design/components/Headings";

/*
 * The portal's one structural primitive. A bordered panel with a dense header
 * row: eyebrow and title on the same baseline, an optional right-aligned hint.
 *
 * This is product tier, not marketing tier: 4px radius, 13px to 14px type, and
 * padding measured in single-digit multiples of 4px. The shared `Section`
 * component is deliberately not used here, since its 80px to 128px vertical
 * padding is what makes a marketing page feel like one.
 */

export function Panel({
  id,
  eyebrow,
  title,
  hint,
  tone = "light",
  bodyClass,
  className,
  children,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  hint?: string;
  tone?: "light" | "dark";
  bodyClass?: string;
  className?: string;
  children: ReactNode;
}) {
  const isDark = tone === "dark";

  return (
    <section
      id={id}
      // Dark in both themes: src/styles/index.css keeps the real zinc scale in here.
      data-tone={isDark ? "dark" : undefined}
      className={clsx(
        "scroll-mt-16 overflow-hidden border",
        isDark
          ? "border-zinc-700 bg-zinc-900"
          : "border-(--color-border) bg-(--color-zinc-50)",
        className,
      )}
    >
      <header
        className={clsx(
          "flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b px-4 py-2.5",
          isDark
            ? "bg-zinc-850 border-zinc-700"
            : "border-(--color-border) bg-(--color-surface-1)",
        )}
      >
        <MonoLabel size="xs" tone={isDark ? "dark" : "muted"}>
          {eyebrow}
        </MonoLabel>
        <h2
          className={clsx(
            "m-0 [font-family:var(--font-heading)] text-[17px] leading-[1.2] font-medium tracking-[-0.01em]",
            isDark ? "text-zinc-50" : "text-zinc-950",
          )}
        >
          {title}
        </h2>
        {hint && (
          <span
            className={clsx(
              "ml-auto text-[12px] leading-[1.4]",
              isDark ? "text-zinc-400" : "text-(--color-muted)",
            )}
          >
            {hint}
          </span>
        )}
      </header>
      <div className={clsx("p-4", bodyClass)}>{children}</div>
    </section>
  );
}
