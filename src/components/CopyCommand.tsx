import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import CheckIcon from "@design/components/icons/CheckIcon";

const SURFACE = {
  light: "border-(--color-border) bg-(--color-zinc-50) text-zinc-950",
  dark: "border-zinc-700 bg-zinc-950 text-zinc-50",
} as const;

const BUTTON = {
  light:
    "border-(--color-border) text-zinc-600 hover:bg-(--color-zinc-150) hover:text-zinc-950",
  dark: "border-zinc-700 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-50",
} as const;

const PROMPT = {
  light: "text-zinc-400",
  dark: "text-zinc-600",
} as const;

export function CopyCommand({
  command,
  variant = "light",
  prompt = "$",
  label,
  multiline = false,
}: {
  command: string;
  variant?: keyof typeof SURFACE;
  /** Shell sigil shown before the command. Pass null for prose payloads. */
  prompt?: string | null;
  /** Accessible name for the copy button when several sit on one page. */
  label?: string;
  multiline?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(command);
    } catch {
      return;
    }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  }, [command]);

  return (
    <div
      className={clsx(
        "flex items-stretch border",
        multiline ? "flex-col" : "gap-3",
        SURFACE[variant],
      )}
    >
      <div
        className={clsx(
          "flex min-w-0 flex-1 gap-2 overflow-x-auto px-3 py-2 [font-family:var(--font-mono)] text-[12.5px] leading-[1.55]",
          multiline ? "items-start" : "items-center",
        )}
      >
        {prompt && (
          <span
            aria-hidden="true"
            className={clsx("shrink-0 select-none", PROMPT[variant])}
          >
            {prompt}
          </span>
        )}
        <code
          className={clsx(
            "min-w-0 bg-transparent p-0",
            multiline ? "whitespace-pre-wrap" : "whitespace-pre",
          )}
        >
          {command}
        </code>
      </div>
      <button
        type="button"
        onClick={copy}
        aria-label={label ? `Copy ${label}` : "Copy to clipboard"}
        className={clsx(
          "inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 px-3 [font-family:var(--font-mono)] font-features-['case'] text-[10px] leading-[1.15] font-medium tracking-[0.4px] uppercase transition-colors duration-150",
          multiline ? "border-t py-2" : "border-l",
          BUTTON[variant],
        )}
      >
        {copied ? (
          <>
            <CheckIcon className="h-3 w-3 shrink-0" />
            Copied
          </>
        ) : (
          "Copy"
        )}
      </button>
    </div>
  );
}
