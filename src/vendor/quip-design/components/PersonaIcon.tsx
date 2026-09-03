export type PersonaShape = "diamond" | "plus" | "circle" | "square";

export function PersonaIcon({ shape }: { shape: PersonaShape }) {
  switch (shape) {
    case "circle":
      return (
        <span
          aria-hidden="true"
          className="block size-2 shrink-0 rounded-full bg-current"
        />
      );
    case "diamond":
      return (
        <span
          aria-hidden="true"
          className="block size-1.5 shrink-0 rotate-45 bg-current"
        />
      );
    case "plus":
      return (
        <span aria-hidden="true" className="relative block size-2 shrink-0">
          <span className="absolute inset-x-0 top-[3px] h-[2px] bg-current" />
          <span className="absolute inset-y-0 left-[3px] w-[2px] bg-current" />
        </span>
      );
    case "square":
    default:
      return (
        <span aria-hidden="true" className="block size-2 shrink-0 bg-current" />
      );
  }
}
