import Link from "next/link";
import { Track404 } from "@/components/analytics-events";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-[560px] flex-1 flex-col justify-center gap-3 px-4 py-24">
      <Track404 />
      <p className="quip-eyebrow">404</p>
      <h1 className="quip-page-title m-0">This page does not exist</h1>
      <p className="m-0 text-[15px] leading-[1.6] text-fd-muted-foreground">
        It may have moved when the docs were reorganised. Search the docs or start from the index.
      </p>
      <div className="mt-2 flex gap-2">
        <Link href="/docs" className="bg-zinc-900 px-3 py-2 text-[13px] font-medium text-zinc-50 no-underline dark:bg-zinc-100 dark:text-zinc-950">
          Read the Docs
        </Link>
        <Link href="/" className="bg-fd-secondary px-3 py-2 text-[13px] font-medium text-fd-secondary-foreground no-underline">
          Go to Developers Home
        </Link>
      </div>
    </main>
  );
}
