import { isMarkdownPreferred } from "fumadocs-core/negotiation";
import { NextRequest, NextResponse } from "next/server";
import moved from "@/data/xquad-moved.json";

const BOOK = "/docs/xquad";

/*
 * URL behaviour that netlify.toml and Netlify's pretty URLs used to provide, so the site
 * answers the same way on any host. Runs on every request except Next's own assets.
 */
export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = route(request, pathname);
  // Staging runs the production image; this one variable keeps it out of search indexes.
  if (process.env.ROBOTS_NOINDEX === "1") response.headers.set("X-Robots-Tag", "noindex");
  return response;
}

// A plain URL, not nextUrl.clone(): with skipTrailingSlashRedirect, NextURL keeps the
// request's trailing slash when it formats, which would redirect a URL to itself.
function at(request: NextRequest, pathname: string) {
  const { search } = request.nextUrl;
  return new URL(`${pathname}${search}`, request.url);
}

function redirect(request: NextRequest, pathname: string) {
  return NextResponse.redirect(at(request, pathname), 301);
}

/*
 * Where an old URL of the XQuad book lives now. It was static mdBook output, so a page was
 * <path>.html and a folder was <dir>/ or <dir>/index.html. Print, table-of-contents and
 * 404 pages, and pages mdBook itself redirected, are in xquad-moved.json.
 */
function movedBookPage(pathname: string) {
  if (!pathname.startsWith(`${BOOK}/`)) return undefined;
  if (pathname === `${BOOK}/sitemap.xml`) return "/sitemap.xml";
  const page = pathname.slice(BOOK.length + 1).replace(/\/+$/, "").replace(/\.html$/, "").replace(/(^|\/)index$/, "");
  const now = (moved as Record<string, string>)[page] ?? page;
  const target = now ? `${BOOK}/${now}` : BOOK;
  return target === pathname ? undefined : target;
}

function route(request: NextRequest, pathname: string) {
  const book = movedBookPage(pathname);
  if (book) return redirect(request, book);

  // A trailing slash is stripped, as today.
  if (pathname.length > 1 && pathname.endsWith("/")) return redirect(request, pathname.replace(/\/+$/, ""));

  // An agent that asks for Markdown gets the page's twin at the page's own URL.
  if ((pathname === "/docs" || pathname.startsWith("/docs/")) && !/\.[a-z][a-z0-9]*$/i.test(pathname) && isMarkdownPreferred(request)) {
    return NextResponse.rewrite(at(request, `${pathname}.md`), {
      headers: { Vary: "Accept", "Content-Type": "text/markdown; charset=utf-8", "X-Robots-Tag": "noindex" },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|api/|fonts/|images/).*)"],
};
