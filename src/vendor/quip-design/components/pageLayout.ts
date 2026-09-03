import clsx from "clsx";

export const PAGE_GUTTER =
  "px-[clamp(20px,5.44601vw-.422535px,78px)] max-md:px-[19px]";

export const SECTION_HEADER_MARGIN = "mb-[clamp(40px,32px+1vw,64px)]";

export const SECTION_STACK_GAP = "gap-[clamp(32px,24px+1vw,48px)]";

export const HERO_MIN_HEIGHT = "md:min-h-[432px]";

export const HERO_FRAME = clsx(
  "relative flex flex-col justify-center overflow-hidden bg-(--color-bg) pt-28 pb-[clamp(40px,32px+2vw,60px)]",
  PAGE_GUTTER,
  HERO_MIN_HEIGHT,
  "max-md:pt-24 max-md:pb-12",
);

export const BRAND_GRADIENT =
  "linear-gradient(to right, #FEF278 0%, #FFDE53 32.69%, #EEFF64 59.9%, #CAFDFB 75.42%, #BCF4FF 86.91%, #E6D7FF 100%)";
