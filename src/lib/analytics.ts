/**
 * Umami, cookie-free. The website id is not a secret; it is set at build time. With no
 * id the script is left out entirely. data-domains in the layout keeps staging quiet.
 *
 * Self-hosted Umami: set NEXT_PUBLIC_UMAMI_SRC to https://<analytics host>/script.js.
 */
export const UMAMI = {
  src: process.env.NEXT_PUBLIC_UMAMI_SRC ?? "https://cloud.umami.is/script.js",
  websiteId: process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID ?? "",
};

type UmamiWindow = Window & { umami?: { track: (event: string, data?: Record<string, string>) => void } };

/** Sends a custom event when Umami is loaded; a no-op otherwise. Never send query text. */
export function track(event: string, data?: Record<string, string>) {
  if (typeof window === "undefined") return;
  (window as UmamiWindow).umami?.track(event, data);
}
