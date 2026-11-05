import { source } from "@/lib/source";

// For the reverse proxy and uptime checks. 200 means the app is up and has its docs.
export const dynamic = "force-dynamic";

export function GET() {
  const pages = source.getPages().length;
  const commit = process.env.GIT_COMMIT ?? "unknown";
  return Response.json({ ok: pages > 0, pages, commit }, { status: pages > 0 ? 200 : 503 });
}
