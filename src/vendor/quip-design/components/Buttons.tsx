import clsx from "clsx";
import type { ButtonHTMLAttributes } from "react";
import { ArrowUpRight } from "./icons/ArrowUpRight";

const BUTTON_HEIGHT = "min-h-[44px]";

const baseClass = clsx(
  "inline-flex cursor-pointer items-center justify-center whitespace-nowrap",
  BUTTON_HEIGHT,
  `px-4 pt-3 pb-2.5 text-[14px] font-normal leading-[1.35] no-underline transition-[background-color,transform] duration-150 hover:-translate-y-px [font-feature-settings:"case"]`,
);

type ButtonProps = {
  href: string;
  children: React.ReactNode;
  external?: boolean;
};

function anchorProps(external?: boolean) {
  return external ? { target: "_blank", rel: "noopener noreferrer" } : {};
}

export function GreyButton({ href, children, external }: ButtonProps) {
  return (
    <a
      href={href}
      {...anchorProps(external)}
      className={clsx(
        baseClass,
        "bg-(--color-zinc-150) text-zinc-950 hover:bg-zinc-300 active:bg-zinc-200",
      )}
    >
      {children}
    </a>
  );
}

export function BlackButton({ href, children, external }: ButtonProps) {
  return (
    <a
      href={href}
      {...anchorProps(external)}
      className={clsx(
        baseClass,
        "hover:bg-zinc-750 active:bg-zinc-850 bg-zinc-900 text-(--color-zinc-50)",
      )}
    >
      {children}
    </a>
  );
}

const ARROW_SIZE = {
  sm: "h-3 w-3",
  xs: "h-2.5 w-2.5",
} as const;

export function ArrowAffordance({
  size = "sm",
  className,
}: {
  size?: keyof typeof ARROW_SIZE;
  className?: string;
}) {
  return (
    <ArrowUpRight
      className={clsx(
        ARROW_SIZE[size],
        "shrink-0 transition-transform duration-200 group-hover:translate-x-px group-hover:-translate-y-px",
        className,
      )}
    />
  );
}

export function ExternalLink({
  href,
  children,
  external,
  size = "sm",
  className,
}: ButtonProps & { size?: keyof typeof ARROW_SIZE; className?: string }) {
  return (
    <a
      href={href}
      {...anchorProps(external)}
      className={clsx(
        "group inline-flex cursor-pointer items-center gap-1.5 no-underline",
        className,
      )}
    >
      {children}
      <ArrowAffordance size={size} />
    </a>
  );
}

const textLinkClass =
  "cursor-pointer underline underline-offset-4 transition-colors duration-150 hover:text-(--color-accent)";

export function TextLink({
  href,
  children,
  external,
  variant = "light",
  className,
}: ButtonProps & { variant?: "light" | "dark"; className?: string }) {
  return (
    <a
      href={href}
      {...anchorProps(external)}
      className={clsx(
        textLinkClass,
        variant === "dark" && "text-zinc-50",
        className,
      )}
    >
      {children}
    </a>
  );
}

const linkBaseClass =
  "inline-flex cursor-pointer items-center justify-center whitespace-nowrap px-2 pt-1 pb-0.5 text-[14px] font-normal leading-[1.35] no-underline bg-left bg-no-repeat [background-size:0%_100%] hover:[background-size:100%_100%] transition-[background-size,color] duration-300 [font-feature-settings:'case'] max-md:pt-1.5 max-md:pb-1";

export function PrimaryLink({ href, children, external }: ButtonProps) {
  return (
    <a
      href={href}
      {...anchorProps(external)}
      className={clsx(
        linkBaseClass,
        "bg-(--color-zinc-150) bg-[linear-gradient(#09090b,#09090b)] text-zinc-950 hover:text-(--color-zinc-50)",
      )}
    >
      {children}
    </a>
  );
}

export function SecondaryLink({ href, children, external }: ButtonProps) {
  return (
    <a
      href={href}
      {...anchorProps(external)}
      className={clsx(
        linkBaseClass,
        "border border-zinc-400 bg-[linear-gradient(#9f9fa9,#9f9fa9)] text-zinc-600 hover:text-zinc-800",
      )}
    >
      {children}
    </a>
  );
}

export function GhostLink({ href, children, external }: ButtonProps) {
  return (
    <a
      href={href}
      {...anchorProps(external)}
      className="inline-flex cursor-pointer items-center justify-center border border-zinc-600 bg-transparent px-2 pt-1 pb-0.5 font-features-['case'] text-[14px] leading-[1.35] font-normal whitespace-nowrap text-(--color-zinc-50) no-underline transition-colors duration-150 hover:bg-white/5 max-md:pt-1.5 max-md:pb-1"
    >
      {children}
    </a>
  );
}

const buttonBaseClass =
  'inline-flex cursor-pointer items-center [font-feature-settings:"case"] transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60';

const filledClass = clsx(
  "justify-center gap-2.5",
  BUTTON_HEIGHT,
  "px-5 pt-3 pb-2.5 text-[14px] font-medium leading-[1.15]",
);

const chipClass =
  "max-w-full border-0 px-3 pt-2 pb-1.5 text-left text-[14px] leading-[1.2] wrap-break-word whitespace-normal max-md:pt-2.5 max-md:pb-2";

export type ButtonVariant = "primary" | "secondary" | "chip" | "chipActive";

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: clsx(
    filledClass,
    "hover:bg-zinc-750 border-0 bg-zinc-900 text-zinc-50",
  ),
  secondary: clsx(
    filledClass,
    "border border-zinc-300 bg-white text-zinc-950 hover:bg-zinc-50",
  ),
  chip: clsx(
    chipClass,
    "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-950",
  ),
  chipActive: clsx(chipClass, "bg-zinc-900 text-zinc-50"),
};

export function Button({
  variant = "primary",
  type = "button",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      type={type}
      className={clsx(buttonBaseClass, VARIANT_CLASS[variant], className)}
      {...props}
    />
  );
}
