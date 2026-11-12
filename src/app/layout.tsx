import { RootProvider } from "fumadocs-ui/provider/next";
import type { Metadata } from "next";
import Script from "next/script";
import type { ReactNode } from "react";
import { SITE_URL, SOCIAL_IMAGE } from "@/lib/shared";
import { AnalyticsEvents } from "@/components/analytics-events";
import { UMAMI } from "@/lib/analytics";
import "./global.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Quip Network for developers", template: "%s | Quip Network Docs" },
  description:
    "The starting point for building on Quip Network: quickstart commands for the SDKs and compute toolchain, testnet connection details, machine-readable docs for coding agents, and every repository in one place.",
  icons: { shortcut: "/images/favicon-v2.png?v=2", apple: "/images/webclip.png" },
  openGraph: { images: SOCIAL_IMAGE, type: "website" },
  twitter: { card: "summary_large_image", images: SOCIAL_IMAGE.url },
};

// Same structured data as the Astro layout.
const ORG_ID = "https://quip.network/#organization";
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": ORG_ID,
  name: "Quip Network",
  url: "https://quip.network/",
  logo: "https://quip.network/images/favicon-v2.png",
  description:
    "Quip Network is the world's shared quantum computer: an open marketplace to access quantum processors on demand, get paid to contribute compute, and earn by writing quantum smart contracts.",
  sameAs: [
    "https://twitter.com/quipnetwork",
    "https://www.linkedin.com/company/postquant-labs",
    "https://github.com/quipnetwork",
    "https://discord.gg/quipnetwork",
  ],
};
const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: `${SITE_URL}/`,
  name: "Quip Network",
  publisher: { "@id": ORG_ID },
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Fonts are self-hosted: the Dinamo licence forbids a public CDN. */}
        <link rel="preload" href="/fonts/ABCFavoritVariable.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="preload" href="/fonts/ABCGaisyrVariable.woff2" as="font" type="font/woff2" crossOrigin="" />
        {[organizationSchema, websiteSchema].map((schema) => (
          <script
            key={schema["@type"]}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replaceAll("<", "\\u003c") }}
          />
        ))}
      </head>
      <body className="flex min-h-screen flex-col">
        <RootProvider theme={{ defaultTheme: "system", enableSystem: true }}>{children}</RootProvider>
        <AnalyticsEvents />
        {UMAMI.websiteId ? (
          // Cookie-free. data-domains limits reporting to production, so staging and
          // local runs of the same image send nothing.
          <Script
            src={UMAMI.src}
            data-website-id={UMAMI.websiteId}
            data-domains="developers.quip.network"
            strategy="afterInteractive"
          />
        ) : null}
      </body>
    </html>
  );
}
