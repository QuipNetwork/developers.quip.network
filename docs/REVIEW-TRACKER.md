# Documentation Review Tracker

Generated 7 August 2026. This file is deliberately **not** listed in `SUMMARY.md`, so it never publishes to the docs site. It is the single ledger for everything in the `docs/content-updates` branch that needs a human decision before the DRAFT and UNDER REVIEW notices come off.

How to use it: work through section 3 first (each row ends in a yes/no question), then review the draft pages in section 2, then confirm the moves in section 1 read sensibly on the published site.

**Where to review.** A GitBook staging space synced to THIS branch (`docs/content-updates`) is the intended review surface: exact final rendering, published unlisted, production untouched. Reviewers with GitBook seats can edit in the visual editor and Git Sync commits their changes back to this branch; technical reviewers can equally edit the markdown here via GitLab. Note that edits made in the GitBook web editor may strip the invisible `<!-- REVIEW -->` / `<!-- SOURCES -->` comments on sync, which is why this tracker duplicates every reviewer question. Merging to `main` is what publishes to the production site, and is held until the product launch window.

---

## 1. What moved where

Nav positions only. **No file was moved on disk and no page content was changed by the restructure.** One correction discovered on the staging site (2026-08-07): GitBook builds published URLs from SUMMARY *group* slugs, so the four moved pages DO get new URLs after merge (e.g. `/basics/quip-lifecycle` becomes `/quip-interlock-protocol/quip-lifecycle`). `.gitbook.yaml` now carries a `redirects:` map covering all four old URLs; verify the redirects resolve on staging before merge. The new grouping follows the architecture described by Colton on 6 August 2026: the Interlock is the umbrella primitive, and compute is what the payment rail exists to sell.

**Staging site:** synced from this branch at `https://rdyplayerb.gitbook.io/quip-docs-staging` (user's personal GitBook org, Ultimate trial active — the "Ask" assistant chat visible there is trial-only and will not exist on the free-tier production site). Known platform annoyance: GitBook's mermaid widget captures touchpad scroll as zoom; diagrams are kept compact and horizontal to minimize it, and there is no repo-side setting to disable it. If it stays irritating, the fallback is exporting the diagrams as static images (losing theme-awareness).

| Page | Was | Now | Why |
| --- | --- | --- | --- |
| QUIP: The Quantum Unit Interlock Pathway | Basics (3rd) | Quip Interlock Protocol (2nd) | It is the protocol's core primitive, not background reading |
| QUIP Lifecycle | Basics (4th) | Quip Interlock Protocol, directly after QuipSwap | The Proposed/Approved/Claimable state machine it describes is the swap lifecycle, so it sits beside QuipSwap (placement per the coverage check, 2026-08-07) |
| Encrypt | Protocols | Quip Interlock Protocol (last) | It describes the asset-protection layer the interlock provides |
| Requesting Jobs (accelerate.md) | Protocols | Compute (1st) | It is the consumer side of the compute marketplace |
| Protocols group | existed | dissolved | Both members moved to groups matching the architecture |
| Basics group | 5 pages | 3 pages (Motivation, Key Properties, Virtues) | Keeps the philosophy/background material, loses the two protocol pages |

New groups: **Quip Interlock Protocol** (after Getting Started) and **Compute** (after it).

## 2. New draft pages

Every new page opens with a warning banner ("Draft — pending technical review") and ends with an HTML comment listing its sources. Inline `<!-- REVIEW: ... -->` comments mark specific facts a reviewer should confirm.

| # | Page | File | Written by | Status |
| --- | --- | --- | --- | --- |
| D1 | How Quip Fits Together | `interlock/how-quip-fits-together.md` | assembled from the 2026-08-06 founder walkthrough + specs | needs review |
| D2 | Install the Quip SDK | `getting-started/install-sdk.md` | package facts verified against npm/PyPI on 2026-08-07 | needs review |
| D3 | Quip Accounts | `interlock/quip-accounts.md` | research agents from Notion specs | needs review |
| D4 | QuipSwap | `interlock/quipswap.md` | research agents from Notion specs | needs review |
| D5 | Quantum Randomness (QVRF) | `compute/qvrf.md` | research agents from Notion specs, concepts only | needs review |
| D6 | Submit Your First Compute Job | `compute/submit-a-job.md` | research agents from Notion specs + PyPI | needs review |
| D7 | Use These Docs with AI | `getting-started/use-with-ai.md` | every URL verified live against quip.gitbook.io on 2026-08-07; pattern from 0x's Fern-based docs | needs review |

Deliberate omissions from every draft (embargoed or unsettled, do not add during review): testnet endpoints and chain identifiers, audit material, mainnet deployment dates, partner names, contract addresses, any signature-slot budget number, QVRF interface signatures and circuit parameters, which wallet implementation is live on mainnet, and whether the ordinary key co-signs.

### Reviewer questions embedded in the drafts

Each appears as an inline `<!-- REVIEW: ... -->` comment at the exact sentence it concerns. Summarised here so a reviewer can work from one list. **Caveat:** GitBook does not document whether HTML comments survive a round-trip through its web editor, so treat this tracker as the durable copy and the inline comments as a convenience that may be stripped if pages are edited in the GitBook UI. The same applies to the `<!-- SOURCES -->` blocks at the foot of each draft. Three prerequisites to check in the GitBook UI before merge: the free Mermaid integration must be enabled for the space (the three diagrams will not render without it), the dark-mode cover variant is set once via the page editor, and the "Page actions" toggle (Site customization, Configure) must stay ON: it powers the site's auto-generated MCP server at `/~gitbook/mcp` plus the Copy-as-Markdown and Open-in-ChatGPT/Claude actions, all verified live on 2026-08-07.

**D3 Quip Accounts:** Is the Chrome-to-extension routing guidance right, and is the extension publicly installable? Is SHRINCS what integrators actually encounter everywhere accounts are available, and does it have an official expansion? Is the ERC-1271 stays-valid-until-key-replaced description accurate? Can the remaining slot budget be read from the account/SDK at runtime? Do both clients surface the upgrade prompt?

**D4 QuipSwap:** Is "only Quip wallet contracts can initiate" still the exact gating rule after the 2026-07-27 rework? Does the settlement contract verify no post-quantum signatures itself? Are same-chain swaps supported in the shipped contract? Is the reverse-RFQ framing of maker orders the wanted public description? Exactly two terminal outcomes per committed side? Is "initiator" the right public word for the longer-deadline party?

**D5 QVRF:** Is the swap-rail positioning approved as public framing? Is "encrypted API plus on-chain request-and-callback" the right one-line description of V0 delivery? Is single-operator V0 (Quip as both oracle and trustee) the confirmed plan? Does V0 as built publish the commitment before delivery? Should the QVRF acronym be expanded at all, given the page corrects that it is not a VRF? Is the subnet-2 concept-level positioning cleared for public docs?

**D6 Submit a Job:** May the docs publish a public node endpoint for SolverQuip yet? Is "optimization subnet" the approved public name? Is the registered-topology subgraph constraint still current? Is xqsa 0.3.1 with the `[quip]` extra the install path engineering wants external developers using today?

## 3. Existing content under review (inline flags)

Each flag is a red hint block in the page itself, labeled with the ID below. Answering the question resolves the flag: either the passage stands (delete the hint) or it gets corrected (edit the passage, then delete the hint).

| ID | Where | What the docs say | What newer sources indicate | Confidence | Question for engineering |
| --- | --- | --- | --- | --- | --- |
| R1 | `getting-started/firewall.md` | Seed safe while "nonce remains lower than 256" | 256 matches no internal source; figures in play are 64 (a chain count, per the 2026-06-10 review) and a proposed warning at 32; no ticket settles it | High that 256 is wrong; the replacement is unsettled | Is 256 real, or should the number come out entirely until the budget is settled? |
| R2 | `getting-started/what-is-quip.md` §1 + §2.3 | "Nakamoto-style chain whose proof-of-work" produces blocks | PoW spec (2026-07-18): mining sits alongside BABE+GRANDPA; block production is decoupled from mining | High | Does mining produce blocks, or do validators produce blocks while miners are rewarded on a separate track? |
| R3 | `getting-started/what-is-quip.md` §2.1–2.2 | Rotating WOTS+ key chain; swaps via per-swap wallets exchanging quantum keys | SHRINCS replaced keysets (Linear QUI-744, closed 2026-07-24); one shared settlement contract per chain with hash locks (spec 2026-07-18, decided 2026-03-03) | High | Has the per-swap design been fully retired, and is SHRINCS the shipped scheme? |
| R4 | `getting-started/what-is-quip.md` §4.3 | Emissions taper over Years 2–5 | `network/token.md` says 10-year total emission duration; the two pages disagree | Certain (internal contradiction) | Which schedule is correct? |
| R5 | `getting-started/quickstart.md` | Keys on Ethereum, Solana, L2s, Arch, Midl | Solana feature-flagged off (QUI-176, closed 2026-06-03); EVM confirmed working on one network; Arch/Midl unverified | Medium-high | Which chains genuinely work today? |
| R6 | `getting-started/quickstart.md` | Points to WOTS+-era libraries | Current packages are `ethereum-sdk@beta` and `hashsigs-wasm@rc` (registry-verified 2026-08-07) | High (registry-verified) | Should this paragraph now point at the Install page, or should the npm dist-tags move instead? |
| R7 | `nodes/quantum.md` | "Publishes Qiskit and Ocean SDK solutions" | 2026-07-13 toolchain: CPU, GPU, D-Wave, no Qiskit; gate-model tickets unopened as of 2026-08-03 | Medium | Is there a runnable Qiskit solver today? |

### Tracker-only items (no clean inline anchor)

| ID | Where | Issue |
| --- | --- | --- |
| R8 | `README.md` card vs `basics/quip-the-quantum-unit-interlock-pathway.md` vs the internal QuipSwap hub | QUIP now expanded THREE ways: "QUantum Interlock Pathway" (README), "Quantum Unit Interlock Pathway" (pathway page), and "Quantum User Interlock Protocol" (internal QuipSwap hub, 2026-07-27). Pick one before the Interlock group ships; it is the project's central term |
| R9 | `getting-started/pq-wallet.md` | Orphan (not in SUMMARY.md), near-duplicate of firewall.md, carries the same 256 claim. Decide: fold into firewall.md, or delete |
| R10 | `quip_whitepaper_consensus.png` + what-is-quip.md §4.2 table | "Quip **Sinnet**" typo (image needs regeneration; table cell says "Compute (Sinnet)"). The image also shows three subnets (Optimization, Grover's, Shor's) where the current testnet story is two (optimization + randomness); the mermaid diagram on How Quip Fits Together is the proposed replacement |
| R11 | `network/token.md` vs new architecture | Token page describes QUIP as a compute credit; confirm the QuipSwap payment-rail framing on the new overview page is consistent with tokenomics before removing its draft banner |
| R12 | Compute group vs incoming XQuad docs | An XQuad documentation category will be CI-synced into THIS GitBook by the toolchain team (decision 2026-08-06; Linear QUI-980, and QUI-853 restructuring the xquad docs tree, due 2026-08-09). The Compute group here must be coordinated with that incoming category before merge, or the two will collide. Do not link the PyPI package READMEs until QUI-977 (24 dead repo-relative links) lands |
| R13 | `protocols/encrypt.md` placement | Sitting under the Interlock group is defensible only if the page is reframed as an account-layer capability; no current source ties encryption to the interlock construction itself. Alternative: move it beside Quip Accounts or back out of the group |
| R14 | Compute group, future page | Newest architecture (2026-08-06) names three job-request paths: direct off-chain (primary today), via an EVM contract, via a PVM/Rust contract. Worth one page once the XQuad category lands |
| R15 | Whole branch, urgency | `docs.quip.network` CNAME setup started 2026-08-07 (QUI-981). Once the domain goes live this GitBook becomes the canonical public docs, so the R1 to R7 answers and this branch's merge decision should land before that switch |

## 4. Blocked on release decisions (not documentation decisions)

| What | Blocked by |
| --- | --- |
| Connect-to-testnet page (the single most useful dev page; source table live-verified 2026-08-06) | Standing "do not share outside the team yet" on the endpoints page; chain identifier unregistered. When cleared, write ONLY from the live endpoints page: a 2026-08-06 ticket records stale chain-ID values in older repo references and smoke tests |
| Contract-level QuipSwap reference | Spec is behind code in three places; needs someone to read `Omnibus.sol` / `IOmnibus.sol` |
| QVRF integration reference | Interface still settling (three conflicting signatures; circuit parameters broken 2026-08-03, replacement not computed). Note: contracts ARE deployed and working end-to-end on testnet as V0/alpha per the 2026-08-07 go/no-go, so the blocker is interface stability, not implementation existence |
| Publishing the audit report | Colton (2026-08-06): make it available on the docs site once it exists |
| Docs ownership | Colton to ask Jason (and Maddie) as the people most familiar with the source documents |
| Quip Agent Skill (future product idea, from the 0x teardown) | 0x ships an installable agent skill (`npx skills add 0xProject/0x-ai`) that teaches coding agents their whole API surface, complementing their MCP server (skill = embedded knowledge for writing code; MCP = live doc lookup). Quip could ship the same once the SDK surface stabilises; it is an engineering artifact, not a docs page, so it is parked here |

## 5. Polish recommendations for existing pages (from the writing-quality pass, 2026-08-07)

**House rule 2 (set by Brent, 2026-08-07): no narrating what the reader can see, no manufactured intrigue.** Banned: prose that restates a diagram, table, or layout ("Reading the picture...", "Notice that...", "As you can see", "here's some diagrams below"), meta-commentary about the docs themselves ("this replaces the older diagram"), and rhetorical suspense or reveals ("Notice what is missing...", "The outcome?", "What a quandary."). State facts directly, ideally as comparisons ("Unlike most Web3 platforms, Quip's atomic swaps require no bridge"). The test: does the sentence add anything the figure does not show, stated plainly? Sweep before merge:

```sh
grep -rniE "reading the picture|as you can see|notice what|notice that|diagram above|diagrams below|here's some|as shown in|the following diagram|below is a" --include="*.md" .
```

**House rule 1 (set by Brent, 2026-08-07): no marketing language anywhere in the docs.** Banned: hype adjectives with no measurable claim (amazing, blazingly fast, seamless, supercharged, incredible, revolutionary, unprecedented), investor-deck framing ("immediate value to your bottom line", "turn-key", "solve the world's toughest problems"), excitement performatives ("We're excited…"), and grandiosity markers ("paradigm shift", "heretofore unseen"). The test: a developer must be able to falsify the sentence. All nine existing occurrences were rewritten on 2026-08-07 (README, virtues.md, motivation.md, quip-sdk.md), facts preserved. Re-run before any merge:

```sh
grep -rniE "amazing|blazing|seamless|supercharg|turn-?key|revolutionar|cutting[- ]edge|world[- ]class|incredibl|unprecedented|paradigm shift|heretofore|game[- ]chang|we'?re excited|excited to|immediate value|bottom line|toughest problems|best-in-class" --include="*.md" .
```

Findings only; **no existing page was edited**. Rubric: Google developer style guide, Diataxis, Write the Docs, Stripe exemplar. Full per-finding detail with exact quotes lives in the polish-pass output; the highlights below are the ones worth acting on when each page is next touched. Ratings: 4 pages need rework, 11 need light polish, 1 is fine as-is (quip-lifecycle.md), and quip-sdk.md needs task links.

| Page | Rating | Top recommendation |
| --- | --- | --- |
| `README.md` | needs rework | Intro is marketing copy: drop "amazing"/"blazingly fast"/"We're excited", replace the value-prop paragraph with what a developer does here, keep both offerings (compute AND asset security) stated plainly |
| `getting-started/quickstart.md` | light polish | Turn the run-on "not much to do other than..." sentence into a bulleted list; delete the orphan "More coming soon" line |
| `getting-started/what-is-quip.md` | light polish | Expand the telegraphic arrow/ampersand bullets in 2.1 and 2.3 into sentences; drop "The outcome?" rhetorical question |
| `getting-started/quip-sdk.md` | light polish | Link each SDK to an install/reference page (currently nothing to click); cut "supercharged"; fix "usecase" to "use case" (twice) |
| `getting-started/firewall.md` | light polish | Lead with the fact (the client SDK and what it is compatible with) instead of the "If you are interested..." conditional; gloss or link "QUIP firewall contract" at first use |
| `protocols/encrypt.md` | light polish | "are in a state of completeness" becomes "are complete"; tighten the SDK sentence |
| `protocols/accelerate.md` | light polish | Remove the sales-brochure clause; otherwise same template as Encrypt |
| `network/token.md` | needs rework | Value-accrual section reads as an investor pitch and repeats its price-pressure claim three times; state each mechanism once, neutrally |
| `basics/motivation.md` | needs rework | Long-form essay; fine as explanation content but flag it as such and tighten the most speculative passages |
| `basics/key-properties.md` | light polish | Minor tightening |
| `basics/virtues.md` | needs rework | Reads as pure marketing ("paradigm shift", "heretofore unseen applications"); either rewrite neutrally or fold into Motivation |
| `basics/quip-the-quantum-unit-interlock-pathway.md` | light polish | Minor tightening |
| `basics/quip-lifecycle.md` | fine as-is | No findings |
| `network/participants.md` | light polish | Minor tightening across tabs |
| `nodes/run-a-node-testnet.md` | needs rework | Task page that buries its steps; restructure as a numbered procedure |
| `nodes/classical.md` | light polish | Minor tightening |
| `nodes/quantum.md` | light polish | Minor tightening |

The single highest-value fix is the README intro, which is also the rubric's worked example. A rewrite that keeps BOTH halves of the product (the earlier polish research produced a version that silently dropped the compute network, which is exactly the trap):

> These docs cover building on the Quip Network: submitting real optimization jobs to a decentralized quantum and classical compute marketplace, and protecting assets on existing chains with quantum-resistant accounts and swaps. New to Quip? Start with the [Quickstart](getting-started/quickstart.md). Integrating? Go to [Install the Quip SDK](getting-started/install-sdk.md).
