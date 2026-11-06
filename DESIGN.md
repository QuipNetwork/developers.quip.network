# Docs design guide

How developers.quip.network looks, and when to use what. The brand itself lives in `@quip/brand`
and wins any conflict: zinc greyscale, square corners, three typefaces, no emoji. This file covers
the decisions specific to the docs. Dark values and the status colours on a read-only surface are
an extension of the brand, pending sign-off by the design-system owner.

## The frame

The docs use the home page's structure. The full guide is the Developer Portal brand guide.

- Top bar: edge to edge, logo and surface chip, mono uppercase links, Feedback as the one black button.
- Documentation, XQuad and Reference are mono tabs; the current one is filled.
- Each page is a panel: a hairline box with a tinted strip above and below the article.
- Each h2 is a strip across the panel, and stays in view under the bar as you scroll on a wide screen.
- Section homes carry the lattice, in grey, and the gradient line.

## Coral

Coral (`#FF6C78`) means "danger". On the docs it is nothing else: not the focus ring, which is ink, not links,
not active states, not headings, not decoration, not syntax. What is current or selected is ink.
Links are ink with an underline, a step darker than the text around them.

| Use | Colour |
| --- | --- |
| Danger callout | Coral chip on a `#FFEDEE` panel |

## Getting attention

Use the lowest level that fits, and use as few as you can. If everything is flagged, nothing is.

| Level | When | Looks like | Example |
| --- | --- | --- | --- |
| Inline emphasis | A detail within a sentence | Bold | "**Testnet tokens hold no value**" |
| Note | Useful context that a reader may skip | Grey panel, black `NOTE` chip | Where a value comes from |
| Warning | Skipping it costs time or causes a failure you can recover from | Amber panel and chip | A call fails from a browser |
| Danger | Skipping it can lose funds or keys, or cannot be undone | Coral panel and chip | Key handling, loss of funds |
| Success | A step has been confirmed; rarely needed | Green panel and chip | Expected final state |

Rules:

- One device: a tinted panel with a solid mono chip, as on the section labels on quip.network.
- No coloured left bars, icons or audience glyphs on callouts.
- The chip says what it is: `Note`, `Warning`, or a short specific label like `Read first`.
- Put a callout next to the step it applies to, and keep it to a few lines.
- Do not stack callouts. Two in a row usually means one is really body text.
- Write `type="error"` only for real danger. A hard rule of thumb: could someone lose money?

In MDX: `<Callout type="info|warn|error|success" title="Note">`. In `docs/`, until the cutover:
`{% hint style="info|warning|danger|success" %}`.

## Type

One scale, on every page. Nothing sits between these steps.

| Size | Use |
| --- | --- |
| 40 px, Gaisyr | Page title, fluid down to 30 px |
| 21 px, Gaisyr | Section strip (h2) |
| 18 px, Gaisyr | Subsection (h3), card title |
| 15.5 px, Favorit | Reading text and callouts at 1.65; h4 at weight 500 |
| 14 px, Favorit | Tables |
| 13 px | Rail pages, outline, code, card text |
| 12 px, mono | What you can press: bar links, tabs, rail sections, page actions, Copy |
| 11 px, mono | Labels: eyebrows, breadcrumbs, table headers, chips |

Mono is wide and set in capitals, so a mono label a size down from its neighbour looks the same size.
Never apply uppercase to code. Case is part of an identifier's name.

## Line breaks

Handled at build by `src/lib/rehype-readable.mjs` and `InlineCode` in `src/components/mdx.tsx`, so
authors need do nothing.

- No line ends on one stranded word.
- Code never breaks inside a word. A command wraps only between its words.

## Tables

Each table gets a layout at build, from its content:

| Layout | When | Below 1024 px |
| --- | --- | --- |
| `records` | Rows of text | Each row stacks as label and value |
| `compare` | Mostly short values or numbers, three or more columns | Keeps its columns and scrolls in its own box |
| `records-wide` | Long values in two or more columns, such as addresses | Label and value at every width |

Rules between rows only, no fill, no zebra stripes.

## Code

The home page's command box: the page's own ground, a hairline, and a mono Copy cell in the corner. Two
syntax palettes in `src/lib/code-theme.mjs`, with no coral. Blocks show in full, with no inner vertical
scroll, and Copy is always visible.

## Navigation

- Top row: logo, search, links, theme. Tabs below it for Documentation, XQuad and Reference.
- Sidebar: mono section names over quiet pages; the current section opens itself. The current page is
  filled, as on the home page rail.
- Outline: h2 and h3 as plain text, with no rail.

## Diagrams

Flat, in the page's own tokens: tiles with hairlines, fine lines, a small dot where one line branches,
and a mono tag for what moves. No objects, figures or 3D. Hand-drawn SVG in `src/components/diagrams/`, keyed to the exact Mermaid source. If the source
changes, the site falls back to Mermaid until someone redraws it, so a drawing can never go stale.
`npm run check:diagrams -- --base <url>` proves that every node, edge and label matches. Each has a
stacked layout for phones. Markdown twins keep the Mermaid text for AI tools.

## For AI tools

Design never removes a machine-readable surface. Every page keeps its Markdown twin, `llms.txt`
entry, Copy Markdown and Open actions, and MCP access. Stable anchors matter as much as stable URLs.

## Before shipping a visual change

`npm run check:parity` and `node scripts/check-xquad-urls.mjs` must pass. Look at light and dark, at
1440, 834 and 390 px. When a build seems to ignore a CSS change, delete `.next` first.
