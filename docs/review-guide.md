---
description: >-
  How to review this staging site, and every question that needs an answer
  before the draft notices come off.
icon: clipboard-check
---

# Review Guide (Internal)

{% hint style="danger" %}
**Internal page for the staging review. It must be removed from SUMMARY.md before this branch merges to production.** If you can read this on docs published to the public, something went wrong.
{% endhint %}

This staging site shows the restructured docs exactly as they will publish. Two kinds of markers appear on pages:

* A yellow **"Draft — pending technical review"** banner at the top of a page means the whole page is new and needs review.
* A red **"Under review (Rn)"** box above a passage means newer internal sources contradict that specific claim; the passage is unchanged pending your answer.

To review: read the drafts, then answer the questions below. Every question is written so it can be answered yes/no or in one sentence. Send answers to Brent, or edit pages directly if you have access. A page's banner comes off once its questions are answered.

### Questions on existing content (the red flags)

1. **R2, What is Quip Network?** Does mining a block actually produce the block, or do validators produce blocks while miners are rewarded on a separate track?
2. **R3, What is Quip Network?** Has the per-swap contract design been fully retired in favor of one shared settlement contract per chain, and is SHRINCS the shipped signature scheme?
3. **R4, What is Quip Network? + Token.** Emissions: is the schedule 2 to 5 years or 10 years? The two pages disagree.
4. **R5, Quickstart.** Which chains genuinely support key generation today? Is Solana still switched off, and are Arch and Midl usable?
5. **R6, Quickstart.** Should the old library paragraph point at the SDK page's install section, or will the npm dist-tags move so `latest` resolves to current builds?
6. **R7, Miners.** Is there a runnable Qiskit solver today, or is gate-model support still unbuilt?
7. **R8, whole site.** How is QUIP officially expanded? Three versions exist: "QUantum Interlock Pathway" (README card), "Quantum Unit Interlock Pathway" (pathway page), "Quantum User Interlock Protocol" (internal). Note $QUIP now denotes the token.

### Questions on the draft pages

**Quip Accounts.** Is the Chrome-to-extension routing guidance right, and is the extension publicly installable? Is SHRINCS what integrators encounter everywhere accounts are available, and does it have an official expansion? Is the ERC-1271 stays-valid-until-key-replaced description accurate? Can the remaining slot budget be read from the account or SDK at runtime? Do both clients surface the upgrade prompt?

**QuipSwap.** Is "only Quip wallet contracts can initiate" still the exact gating rule? Does the settlement contract verify no post-quantum signatures itself? Are same-chain swaps supported in the shipped contract? Is the reverse-RFQ framing of maker orders the wanted public description? Does every committed side end in exactly two terminal outcomes? Is "initiator" the right public word for the longer-deadline party?

**Quantum Randomness (QVRF).** Is the swap-rail positioning approved as public framing? Is "encrypted API plus on-chain request-and-callback" the right description of V0 delivery? Is single-operator V0 the confirmed plan? Does V0 as built publish the commitment before delivery? Should the QVRF acronym be expanded at all, given the page corrects that it is not a VRF? Is the subnet-2 positioning cleared for public docs? Is the Quantum Echoes paragraph's phrasing approved?

**Submit Your First Compute Job.** May the docs publish a public node endpoint for SolverQuip yet? Is "optimization subnet" the approved public name? Is the registered-topology subgraph constraint still current? Is xqsa 0.3.1 with the `[quip]` extra the right install path for external developers today?

**How Quip Network Fits Together.** Do Grover's and Shor's subnets from the whitepaper remain future roadmap? Is the two-subnet diagram accurate as drawn?

**Quip SDK (Install section).** Are the beta and rc tag instructions what engineering wants public, or will the tags move?

**Use These Docs with AI.** When docs.quip.network goes live, does the MCP URL follow the custom domain?

### What not to add during review

Testnet endpoints and chain identifiers, audit material, deployment dates or launch windows, partner names, contract addresses, signature-slot budget numbers, and QVRF interface signatures or parameters are all deliberately absent from these drafts. If a draft seems to be missing one of these, that is intentional; check with Brent before adding anything from internal documents.
