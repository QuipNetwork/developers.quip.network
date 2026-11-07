import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { findInDocs } from "@/lib/search";
import { SITE_URL, markdownUrlOf } from "@/lib/shared";
import { source } from "@/lib/source";

/*
 * Docs MCP server: lets coding assistants search and read Quip's documentation.
 * Public, read-only and stateless, so each request gets its own server and any replica
 * can answer it. Claude Code:
 *   claude mcp add --transport http quip-docs https://developers.quip.network/mcp
 */

const PAGE_CHARS = 40_000;
const MAX_RESULTS = 10;

const text = (value: string, isError = false) => ({ content: [{ type: "text" as const, text: value }], isError });
const absolute = (url: string) => new URL(url, SITE_URL).href;

/** The Markdown twin on disk: the same bytes served at /docs/<page>.md. */
async function readTwin(page: { slugs: string[] }) {
  return readFile(path.join(process.cwd(), "public", markdownUrlOf(page)), "utf8");
}

/** Accepts a full URL, a /docs path, or a bare page path, with or without .md. */
function findPage(input: string) {
  const pathname = input.replace(/^https?:\/\/[^/]+/, "").replace(/[?#].*$/, "").replace(/\.md$/, "");
  const slugs = pathname.replace(/^\/?(docs\/?)?/, "").split("/").filter(Boolean);
  return source.getPage(slugs);
}

function createServer() {
  const server = new McpServer({ name: "quip-network-docs", version: "1.0.0" });

  server.registerTool(
    "search_docs",
    {
      title: "Search Quip docs",
      description:
        "Search the Quip Network developer documentation (SDKs, QuipSwap, compute jobs, running nodes, the testnet). Returns matching pages with their URLs and a snippet; read one with get_page.",
      inputSchema: {
        query: z.string().min(1).max(200).describe("What to look for, in a few words"),
        limit: z.number().int().min(1).max(MAX_RESULTS).default(5).describe("Maximum number of pages to return"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ query, limit }) => {
      const hits = await findInDocs(query);
      // Results come per heading and paragraph; agents want pages, best match first.
      const pages = new Map<string, { title: string; url: string; markdown_url: string; snippet: string }>();
      for (const hit of hits) {
        const url = hit.url.split("#")[0];
        const page = source.getPageByUrl?.(url) ?? findPage(url);
        if (!page) continue;
        const entry = pages.get(url);
        if (!entry) {
          if (pages.size >= limit) continue;
          pages.set(url, {
            title: page.data.title,
            url: absolute(url),
            markdown_url: absolute(markdownUrlOf(page)),
            snippet: hit.type === "page" ? (page.data.description ?? "") : String(hit.content).replace(/<\/?mark>/g, ""),
          });
        } else if (!entry.snippet && hit.type !== "page") {
          entry.snippet = String(hit.content).replace(/<\/?mark>/g, "");
        }
      }
      if (pages.size === 0) return text(`No pages match "${query}". Try fewer or different words, or use list_pages.`);
      return text(JSON.stringify([...pages.values()], null, 2));
    },
  );

  server.registerTool(
    "get_page",
    {
      title: "Read a Quip docs page",
      description: `Get one documentation page as Markdown, by URL or path (for example /docs/getting-started/quickstart). Pages longer than ${PAGE_CHARS} characters come in parts: pass the returned next_offset to continue.`,
      inputSchema: {
        path: z.string().min(1).max(300).describe("The page's URL or path"),
        offset: z.number().int().min(0).default(0).describe("Character offset to continue from"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ path: input, offset }) => {
      const page = findPage(input);
      if (!page) return text(`No docs page at "${input}". Use search_docs or list_pages to find one.`, true);
      const markdown = await readTwin(page);
      const end = offset + PAGE_CHARS;
      const header = `# ${page.data.title}\nSource: ${absolute(page.url)}\n\n`;
      const part = markdown.slice(offset, end);
      const more = end < markdown.length ? `\n\n[Truncated. Call get_page again with offset ${end} (next_offset: ${end}).]` : "";
      return text(`${offset === 0 ? header : ""}${part}${more}`);
    },
  );

  server.registerTool(
    "list_pages",
    {
      title: "List Quip docs pages",
      description: "List every documentation page with its title, description and URL.",
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () =>
      text(
        JSON.stringify(
          source.getPages().map((page) => ({
            title: page.data.title,
            description: page.data.description,
            url: absolute(page.url),
            markdown_url: absolute(markdownUrlOf(page)),
          })),
          null,
          2,
        ),
      ),
  );

  return server;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID",
  "Access-Control-Expose-Headers": "Mcp-Session-Id, Mcp-Protocol-Version",
};

async function handle(request: Request) {
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  const server = createServer();
  await server.connect(transport);
  const response = await transport.handleRequest(request);
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS)) headers.set(key, value);
  headers.set("Cache-Control", "no-store");
  headers.set("X-Robots-Tag", "noindex");
  return new Response(response.body, { status: response.status, headers });
}

export const dynamic = "force-dynamic";
export const POST = handle;
// Every answer comes back on its POST, so there is no stream to open. A GET left open would
// hold a connection on the server for as long as the client stayed.
export function GET() {
  return new Response(null, { status: 405, headers: { ...CORS, Allow: "POST, DELETE, OPTIONS" } });
}
export const DELETE = handle;

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
