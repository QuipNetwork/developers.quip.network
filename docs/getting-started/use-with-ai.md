---
description: >-
  Connect Claude Code, Cursor, VS Code, Codex or any other MCP client to these
  docs, or read any page as Markdown. No sign-in needed.
icon: robot
---

# Use These Docs with AI

Your coding assistant can search and read these docs while it works, so it answers from the current docs rather than from what it remembers. Connect it to the docs MCP server once:

* **Server URL:** `https://developers.quip.network/mcp`
* **Transport:** Streamable HTTP
* **Sign-in:** none. The server is public and read-only, with no API key.

**Which option should you use?**

| You want | Use |
| --- | --- |
| Your coding assistant to look things up as it works | [The MCP server](use-with-ai.md#connect-your-assistant) |
| To ask an assistant about one page | [The page as Markdown](use-with-ai.md#read-a-page-as-markdown) |
| The docs as data for your own tool, agent or evaluation | [The site indexes](use-with-ai.md#give-a-model-the-whole-site), never scraped HTML |

## Connect your assistant

Every assistant uses the same URL. Only the way you add it differs.

### Claude Code

```bash
claude mcp add --transport http quip-docs https://developers.quip.network/mcp
```

Keep `--transport http`: without it, Claude Code treats the URL as a program to run. Add `--scope user` to use the docs in all your projects, or `--scope project` to share the server with your team through the project's `.mcp.json`.

### Claude and Claude Desktop

Open **Connectors**, choose **Add custom connector**, and enter `quip-docs` and the server URL. Under authentication, choose **No sign in**. On Team and Enterprise plans, an Owner adds the connector for the organization first.

### Cursor

Add the server to `~/.cursor/mcp.json` for all projects, or `.cursor/mcp.json` for one:

```json
{
  "mcpServers": {
    "quip-docs": { "url": "https://developers.quip.network/mcp" }
  }
}
```

### VS Code (GitHub Copilot)

Add the server to `.vscode/mcp.json`. VS Code's top-level key is `servers`, and it needs `"type": "http"`:

```json
{
  "servers": {
    "quip-docs": { "type": "http", "url": "https://developers.quip.network/mcp" }
  }
}
```

### OpenAI Codex

Add the server to `~/.codex/config.toml`:

```toml
[mcp_servers.quip-docs]
url = "https://developers.quip.network/mcp"
```

### Gemini CLI

```bash
gemini mcp add --transport http quip-docs https://developers.quip.network/mcp
```

If you edit `settings.json` instead, use the `httpUrl` key. In Gemini CLI, `url` means the older SSE transport, which this server does not use.

### Windsurf

Add the server to Windsurf's `mcp_config.json`, using the `serverUrl` key:

```json
{
  "mcpServers": {
    "quip-docs": { "serverUrl": "https://developers.quip.network/mcp" }
  }
}
```

### Any other assistant

Give it the server URL as a remote or HTTP server. If it can only start local servers, bridge to this one with [`mcp-remote`](https://github.com/geelen/mcp-remote), which runs as a local command:

```json
{
  "mcpServers": {
    "quip-docs": { "command": "npx", "args": ["mcp-remote", "https://developers.quip.network/mcp"] }
  }
}
```

### Check that it works

In Claude Code, `/mcp` lists `quip-docs` as connected. In any assistant, ask something only the docs know, such as "Search the Quip docs for how to request testnet tokens." The answer should cite a page under `developers.quip.network/docs`.

## What the server can do

The server has three tools. All of them only read.

| Tool | What it does |
| --- | --- |
| `search_docs` | Searches the docs and returns the best-matching pages, each with its URL and a snippet |
| `get_page` | Returns one page as Markdown, by URL or path. A long page comes in parts |
| `list_pages` | Lists every page with its title, description and URL |

You don't call these yourself. Ask in your own words and the assistant picks the tool, for example:

* "Using the Quip docs, write a script that requests AGLS from the testnet faucet."
* "Check the Quip docs, then show me how to submit a compute job from Python."
* "Which Quip SDK do I install for post-quantum accounts on an EVM chain?"

## Read a page as Markdown

Every page on this site has a Markdown version: the same content with its structure and code blocks, and without the navigation.

* **Add `.md` to the page's URL.** For example, [`/docs/getting-started/quickstart.md`](https://developers.quip.network/docs/getting-started/quickstart.md).
* **Ask for Markdown.** A request with `Accept: text/markdown` gets the Markdown at the page's own URL, as in the example below.
* **Use the buttons at the top of each page.** **Copy Markdown** copies the page, and **Open** sends it to Claude, ChatGPT or Cursor.

```bash
curl -H "Accept: text/markdown" https://developers.quip.network/docs/getting-started/quickstart
```

To ask about a page in a chat assistant without the buttons, give it the page's `.md` URL:

* **Claude:** `https://claude.ai/new?q=Read <page URL>.md so I can ask questions about it.`
* **ChatGPT:** `https://chatgpt.com/?q=Read <page URL>.md so I can ask questions about it.`

## Give a model the whole site

Two indexes cover every page, including the XQuad book and the Reference section.

| URL | Contents |
| --- | --- |
| [`/docs/llms.txt`](https://developers.quip.network/docs/llms.txt) | An index of every page's Markdown URL, with a short description, for models that fetch pages as they need them |
| [`/docs/llms-full.txt`](https://developers.quip.network/docs/llms-full.txt) | Every page in one Markdown file, about 1 MB. Too large for most context windows: use it to load your own tool or search index |

Fetch these rather than scraping the HTML. They are built from the same source as the site at every deploy, so they always match it.

{% hint style="info" %}
These indexes and the MCP server reflect the published documentation. A page that is not on the live site yet is not in them.
{% endhint %}
