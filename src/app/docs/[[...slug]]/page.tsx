import { DocsBody, DocsDescription, DocsPage, DocsTitle, MarkdownCopyButton, ViewOptionsPopover } from "fumadocs-ui/layouts/notebook/page";
import { createRelativeLink } from "fumadocs-ui/mdx";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { AnchorHTMLAttributes, FC } from "react";
import { getMDXComponents } from "@/components/mdx";
import { MastheadGraphic } from "@/components/MastheadGraphic";
import { BRAND_GRADIENT } from "@design/components/pageLayout";
import { SITE_URL, SOCIAL_IMAGE, markdownUrlOf, sourceUrlOf } from "@/lib/shared";
import { source } from "@/lib/source";

type Props = { params: Promise<{ slug?: string[] }> };

// The three sidebar trees, for the breadcrumb and the footer's index link.
function treeOf(slugs: string[]) {
  if (slugs[0] === "xquad") return { name: "XQuad", href: "/docs/xquad", llms: "/docs/xquad/llms.txt" };
  if (slugs[0] === "reference") return { name: "Reference", href: "/docs/reference", llms: "/docs/llms.txt" };
  return { name: "Documentation", href: "/docs", llms: "/docs/llms.txt" };
}

/*
 * Same-tab and new-tab behaviour as the old site: the docs opened other sites in a new tab,
 * the XQuad book never did, and mailto: and links back to this site stayed in the tab.
 */
function linkFor(Base: FC<AnchorHTMLAttributes<HTMLAnchorElement>>, newTab: boolean) {
  return function Anchor(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
    const href = props.href ?? "";
    if (/^mailto:/.test(href)) return <a {...props} />;
    // Links back to this site stay on the host the visitor is on.
    if (href.startsWith(SITE_URL)) return <a {...props} href={href.slice(SITE_URL.length) || "/"} />;
    if (/^https?:\/\//.test(href)) return newTab ? <a {...props} target="_blank" rel="noopener noreferrer" /> : <a {...props} />;
    return <Base {...props} />;
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const page = source.getPage(slug);
  if (!page) notFound();

  const MDX = page.data.body;
  const markdownUrl = markdownUrlOf(page);
  const editUrl = sourceUrlOf(page.data.source_path);
  const tree = treeOf(page.slugs);
  const breadcrumbs = [
    { name: "Developers", href: "/" },
    { name: tree.name, href: tree.href },
    ...(page.url !== tree.href ? [{ name: page.data.title, href: page.url }] : []),
  ];
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: new URL(crumb.href, SITE_URL).href,
    })),
  };

  // Pages from docs/ and the book carry their own H1 and no lede, as they did. The outline
  // lists h2 and h3, also as it did. Reference pages have no H1 in the body.
  const hasOwnHeading = page.data.toc.some((item) => item.depth === 1);
  const toc = page.data.toc.filter((item) => item.depth === 2 || item.depth === 3);
  const inBook = page.slugs[0] === "xquad";
  // Documentation, XQuad and Reference each open with the home page's lattice.
  const sectionHome = page.url === tree.href;

  return (
    <DocsPage toc={toc} full={page.data.full} breadcrumb={{ enabled: false }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema).replaceAll("<", "\\u003c") }}
      />
      <section className="quip-doc">
        <header className="quip-doc-head">
          <nav aria-label="Breadcrumb" className="quip-doc-crumbs">
            <ol className="flex flex-wrap gap-2">
              {/* The trail starts at the section. The logo already goes home, and a reader in
                  the docs wants the section, not the portal. Search engines still get the full
                  trail from the schema above. */}
              {breadcrumbs.slice(1).map((crumb, index) => (
                <li key={crumb.href} className="flex gap-2">
                  {index > 0 ? <span aria-hidden="true">/</span> : null}
                  {index === breadcrumbs.length - 2 ? <span aria-current="page">{crumb.name}</span> : <a href={crumb.href}>{crumb.name}</a>}
                </li>
              ))}
            </ol>
          </nav>
          <div className="quip-page-actions flex flex-row items-center gap-2">
            <MarkdownCopyButton markdownUrl={markdownUrl} />
            <ViewOptionsPopover markdownUrl={markdownUrl} githubUrl={editUrl} />
          </div>
        </header>
        {sectionHome ? <div className="quip-doc-rainbow" style={{ background: BRAND_GRADIENT }} /> : null}
        {sectionHome ? (
          <div className="quip-home quip-doc-lattice" aria-hidden="true">
            <MastheadGraphic />
          </div>
        ) : null}
        <div className="quip-doc-body">
          {hasOwnHeading ? null : (
            <>
              <DocsTitle>{page.data.title}</DocsTitle>
              <DocsDescription className="mb-0">{page.data.description}</DocsDescription>
            </>
          )}
          <DocsBody data-tree={tree.name.toLowerCase()} data-page={page.slugs.join("/")}>
            <MDX components={getMDXComponents({ a: linkFor(createRelativeLink(source, page), !inBook) })} />
          </DocsBody>
        </div>
        <footer className="quip-page-footer">
          <a href={markdownUrl}>View as Markdown</a>
          <a href={tree.llms}>llms.txt</a>
          {editUrl ? <a href={editUrl}>Edit on GitLab</a> : null}
        </footer>
      </section>
    </DocsPage>
  );
}

// Every page is built ahead of time. Anything else is a 404 straight away, so a scan of
// random URLs cannot write a cache entry for each one.
export const dynamicParams = false;

export function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = source.getPage(slug);
  if (!page) notFound();
  // The book's <title> keeps mdBook's form. Its pages have no description, as before.
  if (page.slugs[0] === "xquad") {
    const bookTitle = "XQuad Documentation";
    return {
      title: { absolute: page.slugs.length === 1 ? bookTitle : `${page.data.title} - ${bookTitle}` },
      description: "",
      alternates: { canonical: page.url },
      robots: { index: false, follow: false },
    };
  }
  return {
    title: page.data.title,
    description: page.data.description ?? `${page.data.title} — Quip Network documentation.`,
    alternates: { canonical: page.url },
    openGraph: { url: page.url, images: SOCIAL_IMAGE, type: "website" },
    ...(page.data.noindex ? { robots: { index: false, follow: false } } : {}),
  };
}
