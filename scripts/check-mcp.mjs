#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
/*
 * Does the docs MCP server work, for a real client? Protocol, every tool on every page, the ways
 * a client can misuse it, and load. No dependencies, so it runs anywhere with Node:
 *
 *   node scripts/check-mcp.mjs https://developers-staging.quip.network
 */
import net from "node:net";

// Node gives each address 250 ms to connect before trying the next. A hundred connections
// opened at once can take longer than that from a home line, and Node then reports
// ETIMEDOUT for a server that was fine (curl, with no such cutoff, saw 500 of 500).
net.setDefaultAutoSelectFamilyAttemptTimeout(2000);

const base = (process.argv[2] ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const JSON_RPC = { "Content-Type": "application/json", Accept: "application/json, text/event-stream" };
let failed = 0;
let id = 1;
const say = (ok, name, detail = "") => {
  if (!ok) failed += 1;
  console.log(`${ok ? "ok  " : "FAIL"}  ${name}${detail ? `: ${detail}` : ""}`);
};
const post = (body, headers = JSON_RPC) => fetch(`${base}/mcp`, { method: "POST", headers, body: typeof body === "string" ? body : JSON.stringify(body), signal: AbortSignal.timeout(30_000) });
const rpc = async (method, params) => (await (await post({ jsonrpc: "2.0", id: ++id, method, params })).json());
const call = async (name, args) => (await rpc("tools/call", { name, arguments: args })).result;
const text = (result) => result?.content?.[0]?.text ?? "";

for (const version of ["2025-06-18", "2025-03-26", "2024-11-05"]) {
  const reply = await rpc("initialize", { protocolVersion: version, capabilities: {}, clientInfo: { name: "check-mcp", version: "1" } });
  say(reply.result?.serverInfo?.name === "quip-network-docs" && !!reply.result?.capabilities?.tools, `initialize, protocol ${version}`, `answered ${reply.result?.protocolVersion}`);
}
const note = await post({ jsonrpc: "2.0", method: "notifications/initialized" });
say(note.status === 202 || note.status === 200, "initialized notification", String(note.status));
say((await rpc("ping")).result !== undefined, "ping");

const tools = (await rpc("tools/list", {})).result.tools;
say(tools.map((t) => t.name).sort().join() === "get_page,list_pages,search_docs", "tools/list", tools.map((t) => t.name).join(", "));
say(tools.every((t) => t.description && t.inputSchema?.type === "object"), "every tool has a description and input schema");

const pages = JSON.parse(text(await call("list_pages", {})));
say(pages.length > 100, "list_pages", `${pages.length} pages`);
say(pages.every((p) => p.url.startsWith("https://developers.quip.network") && p.markdown_url.endsWith(".md")), "list_pages links are public, canonical URLs");

let bad = 0, long = 0;
const queue = [...pages];
await Promise.all(Array.from({ length: 8 }, async () => {
  while (queue.length) {
    const page = queue.shift();
    const twin = await (await fetch(base + new URL(page.markdown_url).pathname)).text();
    let joined = "";
    for (let offset = 0, more = true; more; offset += 40_000) {
      const part = text(await call("get_page", { path: page.url, offset }));
      more = /next_offset: \d+/.test(part);
      if (more) long += 1;
      joined += (offset === 0 ? part.replace(/^# .*\nSource: .*\n\n/, "") : part).replace(/\n\n\[Truncated\..*\]$/, "");
    }
    if (joined !== twin) { bad += 1; console.log(`      differs: ${page.url}`); }
  }
}));
say(bad === 0, `get_page returns every page exactly, ${pages.length} pages`, `${long} continuations walked`);

for (const form of ["/docs/getting-started/quickstart", "docs/getting-started/quickstart", "getting-started/quickstart", "https://developers.quip.network/docs/getting-started/quickstart", "/docs/getting-started/quickstart.md"]) {
  say(!(await call("get_page", { path: form })).isError, `get_page accepts ${form}`);
}
const search = async (query, limit) => JSON.parse(text(await call("search_docs", { query, limit })));
for (const [query, expected] of [["QVM", "/docs/guides/what-is-a-qvm"], ["quantum virtual machine", "/docs/guides/what-is-a-qvm"], ["Solver._recompute_energy()", "/docs/xquad/solving/energy-and-precision"], ["run a validator", "/docs/nodes/run-a-validator-testnet"], ["faucet", null]]) {
  const hits = await search(query, 5);
  say(hits.length > 0 && (!expected || hits[0].url.endsWith(expected)), `search_docs "${query}"`, hits[0]?.url);
}
say((await search("validator", 2)).length === 2, "search_docs respects limit");
say(text(await call("search_docs", { query: "zzqqxxnothing" })).startsWith("No pages match"), "search_docs with no match says so");

say((await call("get_page", { path: "/docs/no-such-page" })).isError === true, "unknown page is a tool error");
for (const [name, method, params] of [["missing argument", "tools/call", { name: "get_page", arguments: {} }], ["unknown tool", "tools/call", { name: "nope", arguments: {} }], ["limit too high", "tools/call", { name: "search_docs", arguments: { query: "x", limit: 999 } }], ["unknown method", "nope/nope", {}]]) {
  const reply = await rpc(method, params);
  say(!!reply.error || reply.result?.isError === true, `${name} is refused cleanly`);
}
for (const [name, body, headers] of [["malformed JSON", "{", JSON_RPC], ["no Accept header", { jsonrpc: "2.0", id: 9, method: "ping" }, { "Content-Type": "application/json" }], ["wrong content type", "x", { ...JSON_RPC, "Content-Type": "text/plain" }]]) {
  const response = await post(body, headers);
  say(response.status >= 400 && response.status < 500, `${name} is a 4xx`, String(response.status));
}

const preflight = await fetch(`${base}/mcp`, { method: "OPTIONS", headers: { Origin: "https://claude.ai", "Access-Control-Request-Method": "POST" } });
say(preflight.status === 204 && preflight.headers.get("access-control-allow-origin") === "*", "browser clients: CORS preflight");
const open = await fetch(`${base}/mcp`, { headers: { Accept: "text/event-stream" }, signal: AbortSignal.timeout(10_000) }).catch((e) => ({ status: 0, error: e.message }));
say(open.status === 405, "GET is refused at once, so no stream can hold a connection", String(open.status));
const close = await fetch(`${base}/mcp`, { method: "DELETE" });
say(close.status < 500, "DELETE", String(close.status));
for (const path of ["/.well-known/oauth-protected-resource", "/.well-known/oauth-authorization-server"]) {
  const response = await fetch(base + path, { redirect: "manual" });
  say(response.status === 404, `no auth required: ${path}`, String(response.status));
}
const plain = await post({ jsonrpc: "2.0", id: 99, method: "tools/list", params: {} });
say(plain.headers.get("cache-control")?.includes("no-store") && !plain.headers.get("content-encoding"), "not cached, not compressed in a way that holds a stream");

const started = Date.now();
// Each request reports why it failed, so a dropped request can be traced on the host.
const once = async (query) => {
  try {
    const response = await post({ jsonrpc: "2.0", id: ++id, method: "tools/call", params: { name: "search_docs", arguments: { query, limit: 3 } } });
    if (!response.ok) return `HTTP ${response.status} ${(await response.text()).slice(0, 80)}`;
    const reply = await response.json();
    return reply.result && !reply.result.isError ? true : `tool error ${JSON.stringify(reply).slice(0, 80)}`;
  } catch (error) {
    return `${error.name}: ${error.cause?.code ?? error.message}`;
  }
};
const burst = await Promise.all(Array.from({ length: 100 }, (_, i) => once(["validator", "QVM", "faucet", "swap"][i % 4])));
const ms = Date.now() - started;
const why = {};
for (const result of burst) if (result !== true) why[result] = (why[result] ?? 0) + 1;
const reasons = Object.entries(why).map(([reason, count]) => `${count}x ${reason}`).join("; ");
say(burst.every((result) => result === true), "100 requests at once", `${burst.filter((result) => result === true).length}/100 in ${ms} ms${reasons ? `: ${reasons}` : ""}`);

console.log(failed ? `\ncheck-mcp: ${failed} failed against ${base}` : `\ncheck-mcp: all passed against ${base}`);
process.exit(failed ? 1 : 0);
