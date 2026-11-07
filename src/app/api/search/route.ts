import { findInDocs } from "@/lib/search";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("query") ?? "";
  return Response.json(await findInDocs(query));
}
