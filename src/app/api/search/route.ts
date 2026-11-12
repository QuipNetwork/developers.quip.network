import { rateLimit } from "@/lib/rate-limit";
import { findInDocs } from "@/lib/search";

export async function GET(request: Request) {
  const wait = rateLimit(request, "search");
  if (wait) {
    return Response.json(
      { error: `Too many searches. Try again in ${wait} s.` },
      { status: 429, headers: { "Retry-After": String(wait) } },
    );
  }
  const query = new URL(request.url).searchParams.get("query") ?? "";
  return Response.json(await findInDocs(query));
}
