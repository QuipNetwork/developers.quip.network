---
description: >-
  The packages to install today, the tags to ask for by name, and the
  packages that do not exist yet.
icon: download
---

# Install the Quip SDK

{% hint style="warning" %}
**Draft — pending technical review.** This page was assembled from internal specifications on 7 August 2026 and has not been approved by engineering. Details may change before this notice is removed.
{% endhint %}

This page lists the packages Quip publishes today, verified directly against the public registries on 7 August 2026.

### JavaScript and TypeScript (npm)

{% hint style="danger" %}
Install with the tags shown below. A plain `npm install` resolves the `latest` tag, which for these packages points at builds from 2025 that predate the current signature scheme.
{% endhint %}

| Package | Install | What it is |
| --- | --- | --- |
| `@quip.network/ethereum-sdk` | `npm install @quip.network/ethereum-sdk@beta` | The account client for EVM chains. The `beta` tag (0.3.0-beta.5, August 2026) is the current generation; `latest` still resolves to 0.1.7 from June 2025. |
| `@quip.network/hashsigs-wasm` | `npm install @quip.network/hashsigs-wasm@rc` | The current hash-based signature signer and verifier (SHRINCS), compiled from the audited Rust implementation to WebAssembly. Works in Node.js and the browser. The `rc` tag is 0.2.0-rc.2; `latest` resolves to an older release candidate. |

<!-- REVIEW: should the docs keep steering people to the beta and rc tags, or will the dist-tags be moved so that latest resolves to the current builds? If the tags move, simplify this page. -->

### Python (PyPI)

| Package | Install | What it is |
| --- | --- | --- |
| `xquad` | `pip install xquad` | Builds optimization models in the network's Ising format. |
| `xqsa` | `pip install xqsa` | Solver adapters for those models, including the backend that submits jobs to the Quip network. See [Submit Your First Compute Job](../compute/submit-a-job.md). |

### Packages that do not exist yet

There is no public `@quip.network/quip-swap` or `@quip.network/sdk` package, and no swap SDK is published today. Use the wallet for swaps.

### Previous-generation libraries

The Winternitz One-Time Signature (WOTS+) libraries remain published for the earlier account generation: [`@quip.network/hashsigs`](https://www.npmjs.com/package/@quip.network/hashsigs) (TypeScript), [`@quip.network/hashsigs-solidity`](https://www.npmjs.com/package/@quip.network/hashsigs-solidity) (Solidity), [hashsigs-cpp](https://github.com/quipnetwork/hashsigs-cpp) (C++), and the [hashsigs-rs](https://crates.io/crates/hashsigs-rs) crate (Rust). New integrations should use the packages in the tables above.

<!-- SOURCES (for reviewers, not rendered):
- npm registry, verified directly 2026-08-07: ethereum-sdk dist-tags latest=0.1.7 (2025-06-03) / beta=0.3.0-beta.5 (2026-08-03); hashsigs-wasm dist-tags latest=0.1.0-rc1 / rc=0.2.0-rc.2 (2026-07-21); quip-swap and sdk return 404
- PyPI, verified directly 2026-08-07: xqsa 0.3.1, xquad 0.3.1
- Ethereum SDK Audit, revised — https://app.notion.com/p/b62db8c6a0888270b98701882a20b6b3 — 2026-07-18
-->
