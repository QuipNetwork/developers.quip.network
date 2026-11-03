import { RootProvider } from "fumadocs-ui/provider/next";
import type { Metadata } from "next";
import Script from "next/script";
import type { ReactNode } from "react";
import { SITE_URL } from "@/lib/shared";
import { UMAMI } from "@/lib/analytics";
import "./global.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Quip Network for developers", template: "%s | Quip Network Docs" },
  description:
    "The starting point for building on Quip Network: quickstart commands for the SDKs and compute toolchain, testnet connection details, machine-readable docs for coding agents, and every repository in one place.",
  icons: { icon: "/images/favicon-v2.png", apple: "/images/webclip.png" },
  openGraph: { siteName: "Quip Network", images: "/images/social-preview.png", type: "website" },
  twitter: { card: "summary_large_image" },
};

const organization = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", name: "Quip Network", url: "https://quip.network", logo: `${SITE_URL}/images/webclip.png` },
    { "@type": "WebSite", name: "Quip Network for developers", url: SITE_URL },
  ],
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Fonts are self-hosted: the Dinamo licence forbids a public CDN. */}
        <link rel="preload" href="/fonts/ABCFavoritVariable.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="preload" href="/fonts/ABCGaisyrVariable.woff2" as="font" type="font/woff2" crossOrigin="" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organization).replaceAll("<", "\\u003c") }}
        />
      </head>
      <body className="flex min-h-screen flex-col">
        <RootProvider theme={{ defaultTheme: "system", enableSystem: true }}>{children}</RootProvider>
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
