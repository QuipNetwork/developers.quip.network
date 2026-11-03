import { DocsBody, DocsDescription, DocsPage, DocsTitle, MarkdownCopyButton, ViewOptionsPopover } from "fumadocs-ui/layouts/notebook/page";
import { createRelativeLink } from "fumadocs-ui/mdx";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { AnchorHTMLAttributes, FC } from "react";
import { getMDXComponents } from "@/components/mdx";
import { SITE_URL, markdownUrlOf, sourceUrlOf } from "@/lib/shared";
import { source } from "@/lib/source";

type Props = { params: Promise<{ slug?: string[] }> };

// Links to other sites open in a new tab, as they did on the Astro site.
function externalAware(Base: FC<AnchorHTMLAttributes<HTMLAnchorElement>>) {
  return function Anchor(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
    const href = props.href ?? "";
    const external = /^https?:\/\//.test(href) && !href.startsWith(SITE_URL);
    return external ? <a {...props} target="_blank" rel="noopener noreferrer" /> : <Base {...props} />;
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const page = source.getPage(slug);
  if (!page) notFound();

  const MDX = page.data.body;
  const markdownUrl = markdownUrlOf(page);
  const editUrl = sourceUrlOf(page.data.source_path);
  const breadcrumbs = [
    { name: "Developers", href: "/" },
    { name: "Documentation", href: "/docs" },
    ...(page.slugs.length ? [{ name: page.data.title, href: page.url }] : []),
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

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema).replaceAll("<", "\\u003c") }}
      />
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription className="mb-0">{page.data.description}</DocsDescription>
      <div className="flex flex-row items-center gap-2 border-b border-fd-border pb-6">
        <MarkdownCopyButton markdownUrl={markdownUrl} />
        <ViewOptionsPopover markdownUrl={markdownUrl} githubUrl={editUrl} />
      </div>
      <DocsBody>
        <MDX components={getMDXComponents({ a: externalAware(createRelativeLink(source, page)) })} />
      </DocsBody>
      <footer className="quip-eyebrow mt-10 flex gap-4 border-t border-fd-border pt-4">
        <a href={markdownUrl}>View as Markdown</a>
        <a href="/docs/llms.txt">llms.txt</a>
        {editUrl ? <a href={editUrl}>Edit on GitLab</a> : null}
      </footer>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = source.getPage(slug);
  if (!page) notFound();
  return {
    title: page.data.title,
    description: page.data.description ?? `${page.data.title} — Quip Network documentation.`,
    alternates: { canonical: page.url },
  };
}
