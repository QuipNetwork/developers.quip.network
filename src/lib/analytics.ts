/**
 * Umami, cookie-free. The website id is not a secret. data-domains in the layout keeps
 * staging and local runs quiet.
 *
 * Self-hosted Umami: set NEXT_PUBLIC_UMAMI_SRC to https://<analytics host>/script.js.
 */
export const UMAMI = {
  src: process.env.NEXT_PUBLIC_UMAMI_SRC ?? "https://cloud.umami.is/script.js",
  // The quip.network website, which the portal has reported into since November 2026
  // (main 348f91f). Visits are told apart by hostname. Set the variable to use another.
  websiteId: process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID || "4d97cda9-1fb5-4705-aea2-cb757cae3ad8",
};

type UmamiWindow = Window & { umami?: { track: (event: string, data?: Record<string, string | number>) => void } };

/** Sends a custom event when Umami is loaded; a no-op otherwise. Never send query text. */
export function track(event: string, data?: Record<string, string | number>) {
  if (typeof window === "undefined") return;
  (window as UmamiWindow).umami?.track(event, data);
}
