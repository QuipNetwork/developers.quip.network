---
description: >-
  Connect these docs to Claude, ChatGPT, Cursor, or Claude Code: every page
  has a markdown mirror, the whole site is indexed for language models, and an
  MCP server lets assistants search and read it directly.
icon: robot
---

# Use These Docs with AI

These docs are built to be read by AI tools as well as people. Every page has a plain-markdown mirror, the whole site is indexed for language models, and an MCP server lets an assistant search and read the docs itself.

**Which option should you use?**

| You are | Use |
| --- | --- |
| Working in Claude Code, Cursor, or another MCP client | [Connect the MCP server](use-with-ai.md#connect-an-assistant-over-mcp) |
| Asking questions about one page | [Open the page in your assistant](use-with-ai.md#ask-an-assistant-about-one-page) |
| Feeding the docs to your own tool, agent, or evaluation | [The site indexes](use-with-ai.md#give-a-model-the-whole-site), never scrape the HTML |

## Connect an assistant over MCP

**What it does.** Gives your assistant three tools: `search_docs` finds pages, `get_page` reads one as markdown, and `list_pages` lists them all. It covers these docs, the XQuad book, and the SDK and API reference.

**When to use it.** You are working in a coding assistant and want it to look things up in the docs as it goes, rather than guess.

**How to use it.** The server is at `https://developers.quip.network/mcp`, over Streamable HTTP. It is public and read-only, so it needs no key.

In Claude Code:

```bash
claude mcp add --transport http quip-docs https://developers.quip.network/mcp
```

In Cursor, add this to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "quip-docs": { "url": "https://developers.quip.network/mcp" }
  }
}
```

In VS Code, add this to `.vscode/mcp.json`:

```json
{
  "servers": {
    "quip-docs": { "type": "http", "url": "https://developers.quip.network/mcp" }
  }
}
```

## Ask an assistant about one page

Every page on this site has a markdown mirror: add `.md` to the end of the page URL.

**What it does.** Gives an AI assistant the clean content of a page, structure and code blocks preserved, navigation noise removed.

**When to use it.** Quick questions, code generation, or a longer analysis grounded in a single page.

**How to use it.** Tell your assistant to read the page's `.md` URL:

* **Claude:** `https://claude.ai/new?q=Read <page URL>.md so I can ask questions about it.`
* **ChatGPT:** `https://chatgpt.com/?q=Read <page URL>.md so I can ask questions about it.`

For example, to work with the [QuipSwap](../interlock/quipswap.md) page, copy the page's address from your browser and add `.md` to the end. The [`/llms.txt` index](use-with-ai.md#give-a-model-the-whole-site) lists the exact mirror URL for every page.

## Give a model the whole site

**What it does.** Two standing indexes cover the entire documentation at once.

| URL | Contents |
| --- | --- |
| [`/llms.txt`](https://developers.quip.network/docs/llms.txt) | An annotated index of every page with its markdown mirror, for models that fetch pages on demand |
| [`/llms-full.txt`](https://developers.quip.network/docs/llms-full.txt) | The entire documentation in one markdown file, for pasting into a model's context window |

**When to use it.** You are building a tool, agent, or evaluation that consumes the docs as data.

**How to use it.** Fetch the index URL directly. Use these rather than scraping the HTML: they are generated from the same source as the site, so they are always current.

{% hint style="info" %}
These endpoints reflect the published documentation. If a page is not on the live site yet, it is not in the indexes.
{% endhint %}
