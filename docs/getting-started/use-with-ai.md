---
description: >-
  Connect these docs to Claude, ChatGPT, Cursor, or Claude Code: every page
  has a markdown mirror, and the site runs a hosted MCP server.
icon: robot
---

# Use These Docs with AI

{% hint style="warning" %}
**Draft — pending technical review.** This page was assembled from internal specifications on 7 August 2026 and has not been approved by engineering. Details may change before this notice is removed. Reviewing? Answers and feedback go on the "Quip Docs Review — Staging" page in Notion.
{% endhint %}

These docs are built to be read by AI tools as well as people. Every page has a plain-markdown mirror, the whole site is indexed for language models, and a Model Context Protocol (MCP) server lets coding agents search the docs from inside your editor. All of it is live today.

**Which option should you use?**

| You are | Use |
| --- | --- |
| Building an integration in an editor (Claude Code, Cursor, VS Code) | [Connect via MCP](use-with-ai.md#connect-via-mcp), your agent searches the docs on demand |
| Asking questions about one page | [Open the page in your assistant](use-with-ai.md#ask-an-assistant-about-one-page) |
| Feeding the docs to your own tool, agent, or evaluation | [The site indexes](use-with-ai.md#give-a-model-the-whole-site), never scrape the HTML |

### Connect via MCP

The docs run a hosted MCP server. Connect once and your agent can search and read the current documentation while you work, no copy-pasting required.

**What it does.** Exposes two tools to your agent: `searchDocumentation` (search across the site, returns content with links) and `getPage` (fetch any page as markdown).

**When to use it.** You are building in an IDE, or working through a multi-step integration where the agent needs to check details as it goes. This is the recommended approach for development.

**How to set it up.**

Claude Code, one command:

```sh
claude mcp add --transport http quip-docs https://quip.gitbook.io/docs/~gitbook/mcp
```

Cursor, one click: [Install the Quip docs MCP server in Cursor](cursor://anysphere.cursor-deeplink/mcp/install?name=quip-docs&config=eyJuYW1lIjoicXVpcC1kb2NzIiwidXJsIjoiaHR0cHM6Ly9xdWlwLmdpdGJvb2suaW8vZG9jcy9+Z2l0Ym9vay9tY3AifQ==)

Any other MCP-capable tool, add an HTTP server manually:

```json
{
  "mcpServers": {
    "quip-docs": {
      "type": "url",
      "url": "https://quip.gitbook.io/docs/~gitbook/mcp"
    }
  }
}
```

<!-- REVIEW: the MCP endpoint URL is tied to the current quip.gitbook.io/docs address. When docs.quip.network goes live (QUI-981), confirm whether the MCP URL follows the custom domain and update this section and the Cursor deeplink payload. -->

### Ask an assistant about one page

Every page on this site has a markdown mirror: add `.md` to the end of the page URL.

**What it does.** Gives an AI assistant the clean content of a page, structure and code blocks preserved, navigation noise removed.

**When to use it.** Quick questions, code generation, or a longer analysis grounded in a single page.

**How to use it.** Tell your assistant to read the page's `.md` URL:

* **Claude:** `https://claude.ai/new?q=Read <page URL>.md so I can ask questions about it.`
* **ChatGPT:** `https://chatgpt.com/?q=Read <page URL>.md so I can ask questions about it.`

For example, to work with the [QuipSwap](../interlock/quipswap.md) page, copy the page's address from your browser and add `.md` to the end. The [`/llms.txt` index](use-with-ai.md#give-a-model-the-whole-site) lists the exact mirror URL for every page.

### Give a model the whole site

**What it does.** Two standing indexes cover the entire documentation at once.

| URL | Contents |
| --- | --- |
| [`/llms.txt`](https://quip.gitbook.io/docs/llms.txt) | An annotated index of every page with its markdown mirror, for models that fetch pages on demand |
| [`/llms-full.txt`](https://quip.gitbook.io/docs/llms-full.txt) | The entire documentation in one markdown file, for pasting into a model's context window |

**When to use it.** You are building a tool, agent, or evaluation that consumes the docs as data.

**How to use it.** Fetch the index URL directly. Use these rather than scraping the HTML: they are generated from the same source as the site, so they are always current.

{% hint style="info" %}
These endpoints reflect the published documentation. If a page is not on the live site yet, it is not in the indexes or the MCP search either.
{% endhint %}

<!-- REVIEW: once the GitBook "Page actions" menu is confirmed enabled for this site, add a short section pointing readers at the on-page menu (Copy page, Open in ChatGPT, Open in Claude) so they discover these actions without visiting this page. -->

<!-- SOURCES (for reviewers, not rendered):
- All URLs on this page verified live against quip.gitbook.io/docs on 2026-08-07: llms.txt (HTTP 200), llms-full.txt (HTTP 200), per-page .md mirrors (HTTP 200), and the MCP endpoint /~gitbook/mcp (initialize handshake, tools/list returning searchDocumentation + getPage, and a live searchDocumentation call all succeeded)
- These are GitBook-native features (free tier), dependent on the site's "Page actions" setting staying enabled; see REVIEW-TRACKER.md prerequisites
- Presentation modeled on 0x's "Using AI with 0x" page (docs.0x.org, Fern platform): the what/when/how structure per option, the opinionated routing table, the manual MCP JSON block, and the prompt phrasing are their conventions, adapted
-->
