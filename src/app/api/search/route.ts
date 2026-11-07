import { search, withProductNames } from "@/lib/search";

/* Results are shown as plain snippets, so math keeps its words and loses its $$ delimiters. */
const plain = <T,>(hit: T): T =>
  typeof (hit as { content?: unknown }).content === "string"
    ? { ...hit, content: (hit as { content: string }).content.replaceAll("$$", "") }
    : hit;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("query");
  if (query) url.searchParams.set("query", withProductNames(query));
  const response = await search.GET(new Request(url, request) as Parameters<typeof search.GET>[0]);
  if (!response.ok) return response;
  const hits: unknown = await response.json();
  return Response.json(Array.isArray(hits) ? hits.map(plain) : hits);
}
