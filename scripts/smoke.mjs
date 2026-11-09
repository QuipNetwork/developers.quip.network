#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
/*
 * Is this a working copy of the site? CI runs it inside each new image before the servers
 * can pick that image up, and it works against any running copy:
 *
 *   node scripts/smoke.mjs https://developers-staging.quip.network
 *
 * It covers what a host can break: the server, static files, redirects, Markdown for
 * agents, search and MCP. Comparing content is scripts/check-parity.mjs's job.
 * Set EXPECT_COMMIT to also require that commit on /api/health.
 */

import net from "node:net";

// Node gives each address 250 ms to connect; under load that cutoff reports ETIMEDOUT for
// a server that is fine. See check-mcp.mjs.
net.setDefaultAutoSelectFamilyAttemptTimeout(2000);

const base = (process.argv[2] ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const expectCommit = process.env.EXPECT_COMMIT;
const STARTUP_MS = 60_000;

const at = (path, init) => fetch(`${base}${path}`, { redirect: "manual", signal: AbortSignal.timeout(15_000), ...init });

function must(condition, detail) {
  if (!condition) throw new Error(detail);
}

async function waitForServer() {
  const deadline = Date.now() + STARTUP_MS;
  for (;;) {
    try {
      if ((await at("/api/health")).ok) return;
    } catch {
      // Still starting.
    }
    if (Date.now() > deadline) throw new Error(`/api/health did not answer within ${STARTUP_MS / 1000}s`);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

async function mcp(method, params, id) {
  const response = await at("/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
  });
  must(response.ok, `${method} answered ${response.status}`);
  must(response.headers.get("cache-control")?.includes("no-store"), "/mcp must not be cacheable");
  return response.json();
}

const checks = {
  async health() {
    const body = await (await at("/api/health")).json();
    must(body.ok === true && body.pages > 100, `health says ${JSON.stringify(body)}`);
    if (expectCommit) must(body.commit === expectCommit, `running ${body.commit}, expected ${expectCommit}`);
  },
  async "home and hashed assets"() {
    const response = await at("/");
    must(response.status === 200, `/ answered ${response.status}`);
    const asset = (await response.text()).match(/\/_next\/static\/[^"']+\.(?:css|js)/)?.[0];
    must(asset, "the home page names no static asset");
    const file = await at(asset);
    must(file.status === 200, `${asset} answered ${file.status}`);
    must(file.headers.get("cache-control")?.includes("immutable"), `${asset} is not immutable`);
  },
  async "docs page"() {
    const response = await at("/docs/getting-started/quickstart");
    must(response.status === 200, `answered ${response.status}`);
    must((await response.text()).includes("<h1"), "no heading in the page");
  },
  async "XQuad book"() {
    must((await at("/docs/xquad")).status === 200, "/docs/xquad is missing");
  },
  async "agent files"() {
    const llms = await at("/docs/llms.txt");
    must(llms.status === 200 && llms.headers.get("content-type")?.startsWith("text/plain"), "/docs/llms.txt is wrong");
    const twin = await at("/docs/getting-started/quickstart.md");
    must(twin.status === 200 && twin.headers.get("content-type")?.startsWith("text/markdown"), "the Markdown twin is wrong");
  },
  async "Markdown by Accept header"() {
    const response = await at("/docs/getting-started/quickstart", { headers: { Accept: "text/markdown" } });
    must(response.headers.get("content-type")?.startsWith("text/markdown"), "HTML came back");
    must(response.headers.get("vary")?.toLowerCase().includes("accept"), "Markdown does not declare Vary: Accept");
  },
  async redirects() {
    const slash = await at("/docs/");
    must(slash.status === 301 && slash.headers.get("location")?.endsWith("/docs"), "trailing slash not stripped");
    const moved = await at("/docs/nodes/classical");
    must(moved.status === 301 && moved.headers.get("location")?.endsWith("/docs/nodes/miners"), "old URL not redirected");
    const event = await at("/sg/");
    must(event.status === 301 && new URL(event.headers.get("location"), base).pathname === "/", "/sg/ does not go home");
  },
  async "unknown page"() {
    const response = await at("/docs/no-such-page");
    must(response.status === 404, `answered ${response.status}`);
    must((await response.text()).includes("This page does not exist"), "not the site's own 404 page");
  },
  async search() {
    const hits = await (await at("/api/search?query=quickstart")).json();
    must(Array.isArray(hits) && hits.length > 0, "search found nothing");
  },
  async "MCP server"() {
    const clientInfo = { name: "smoke", version: "1" };
    await mcp("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo }, 1);
    const { result } = await mcp("tools/list", {}, 2);
    const tools = result.tools.map((tool) => tool.name).sort().join();
    must(tools === "get_page,list_pages,search_docs", `tools are ${tools}`);
    const call = async (name, args, id) => {
      const { result: output } = await mcp("tools/call", { name, arguments: args }, id);
      must(!output.isError, `${name} failed: ${output.content[0].text}`);
      return output.content[0].text;
    };
    must(JSON.parse(await call("search_docs", { query: "quickstart", limit: 2 }, 3)).length > 0, "search_docs found nothing");
    must((await call("get_page", { path: "/docs/getting-started/quickstart" }, 4)).startsWith("# Quickstart"), "get_page is wrong");
    must(JSON.parse(await call("list_pages", {}, 5)).length > 100, "list_pages is short");
  },
};

let failed = 0;
try {
  await waitForServer();
} catch (error) {
  console.error(`smoke: ${error.message}`);
  process.exit(1);
}
for (const [name, check] of Object.entries(checks)) {
  try {
    await check();
    console.log(`ok    ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL  ${name}: ${error.message}`);
  }
}
console.log(failed ? `smoke: ${failed} failed against ${base}` : `smoke: all ${Object.keys(checks).length} passed against ${base}`);
process.exit(failed ? 1 : 0);
