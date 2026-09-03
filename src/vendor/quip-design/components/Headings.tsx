import clsx from "clsx";
import { ArrowAffordance } from "./Buttons";

type SectionHeadingVariant = "light" | "dark";

const sectionHeadingColor = {
  light: "text-[#18181b]",
  dark: "text-zinc-50",
} as const;

export function SectionHeading({
  children,
  className,
  variant = "light",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: SectionHeadingVariant;
}) {
  return (
    <h2
      className={clsx(
        "m-0 [font-family:var(--font-heading)] font-features-['case'] text-[clamp(32px,23.5493px+2.25352vw,56px)] leading-[1.1] font-medium tracking-[-1.12px]",
        sectionHeadingColor[variant],
        className,
      )}
    >
      {children}
    </h2>
  );
}

export function SubsectionHeading({
  children,
  className,
  variant = "light",
  as: Tag = "h2",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: SectionHeadingVariant;
  as?: "h2" | "h3";
}) {
  return (
    <Tag
      className={clsx(
        "m-0 [font-family:var(--font-heading)] text-[28px] leading-[1.1] font-medium tracking-[-0.8px] md:text-[40px]",
        sectionHeadingColor[variant],
        className,
      )}
    >
      {children}
    </Tag>
  );
}

const MONO_LABEL_SIZE = {
  xs: "text-[10px]",
  sm: "text-[11px]",
  md: "text-[12px]",
  lg: "text-[14px]",
} as const;

const MONO_LABEL_TONE = {
  muted: "text-zinc-500",
  subtle: "text-zinc-600",
  strong: "text-zinc-950",
  dark: "text-zinc-400",
  inherit: "",
} as const;

export function MonoLabel({
  children,
  className,
  as: Tag = "span",
  size = "md",
  tone = "muted",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "span" | "div" | "th" | "dt";
  size?: keyof typeof MONO_LABEL_SIZE;
  tone?: keyof typeof MONO_LABEL_TONE;
}) {
  return (
    <Tag
      className={clsx(
        "[font-family:var(--font-mono)] font-features-['case'] leading-[1.15] font-medium tracking-[0.4px] uppercase",
        MONO_LABEL_SIZE[size],
        MONO_LABEL_TONE[tone],
        className,
      )}
    >
      {children}
    </Tag>
  );
}

type BarBadgeVariant = "light" | "dark";

const barBadgeStyles = {
  light: { label: "bg-zinc-50 text-zinc-950", bar: "bg-zinc-50" },
  dark: { label: "bg-zinc-950 text-zinc-50", bar: "bg-zinc-950" },
} as const;

export function BarBadge({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant: BarBadgeVariant;
}) {
  const { label, bar } = barBadgeStyles[variant];
  return (
    <div className="inline-flex items-stretch gap-1">
      <span
        className={clsx(
          "inline-flex items-center px-2 pt-[5px] pb-1 [font-family:var(--font-mono)] [font-feature-settings:'case'] text-[14px] leading-[1.15] font-medium tracking-[0.4px] uppercase",
          label,
        )}
      >
        {children}
      </span>
      <span aria-hidden="true" className={clsx("block w-1", bar)} />
    </div>
  );
}

export function HeroBadge({
  children,
  fullWidth = false,
  href = "https://quest.quip.network/airdrop",
}: {
  children: React.ReactNode;
  fullWidth?: boolean;
  href?: string;
}) {
  const Tag = href ? "a" : "span";
  const linkProps = href
    ? { href, target: "_blank", rel: "noopener noreferrer" }
    : {};
  return (
    <Tag
      {...linkProps}
      className={clsx(
        "group relative items-center overflow-hidden bg-[linear-gradient(to_right,#FEF278_0%,#FFDE53_32.69%,#EEFF64_59.9%,#CAFDFB_75.42%,#BCF4FF_86.91%,#E6D7FF_100%)] pt-[5px] pb-1 no-underline max-md:px-1",
        fullWidth
          ? "flex w-full justify-center gap-1.5 px-6"
          : "inline-flex gap-1.5 px-3",
      )}
    >
      <span
        className={clsx(
          "relative [font-family:var(--font-mono)] [font-feature-settings:'case'] text-[14px] leading-[1.15] font-medium tracking-[0.4px] text-white uppercase mix-blend-difference",
          fullWidth ? "text-center" : "whitespace-nowrap",
        )}
      >
        {children}
      </span>
      {href && (
        <ArrowAffordance className="relative self-center text-white mix-blend-difference" />
      )}
    </Tag>
  );
}
