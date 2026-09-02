---
description: >-
  The two SDKs Quip Network publishes, which one to reach for, and the
  packages and tags to install.
icon: cube
---

# Quip SDK

Quip Network publishes two SDKs:

1. An SDK for quantum smart contracts and hybrid solvers, that helps you construct solutions for optimization and satisfiability problems, artificial intelligence tasks, or even Bitcoin mining.

This SDK is meant to help you work with quantum computers of all kinds: adiabatic quantum computers like annealers, or gate-based quantum computers that support certain operations which make it easier to reason about generalized quantum computation.

2. An SDK for existing smart contracts that lets you upgrade your contracts one ABI at a time. Import the file with your package manager and reference the SDK anytime you need to unwrap a post-quantum commitment into its associated classical public key.

The wallet SDK is compatible with WalletConnect, Solana `wallet-adapter`, and other major cryptocurrency wallet clients. Its most versatile use case is a smart account much like a Coinbase smart account or a Safe wallet, which wraps any contract with a post-quantum signature read and aborts the subsequent contract call if the read fails.

However, sometimes contracts may require token allowances, specialized permissions, or access to collateral held in the contract. For these use cases, it is necessary for the contract to implement the Quip SDK's post-quantum ABI extension directly.

## Install

The packages Quip Network publishes today, verified directly against the public registries on 7 August 2026.

### JavaScript and TypeScript (npm)

{% hint style="danger" %}
Install with the tags shown below. A plain `npm install` resolves the `latest` tag, which for these packages points at builds from 2025 that predate the current signature scheme.
{% endhint %}

| Package | Install | What it is |
| --- | --- | --- |
| `@quip.network/ethereum-sdk` | `npm install @quip.network/ethereum-sdk@beta` | The account client for EVM chains. The `beta` tag (0.3.0-beta.5, August 2026) is the current generation; `latest` still resolves to 0.1.7 from June 2025. |
| `@quip.network/hashsigs-wasm` | `npm install @quip.network/hashsigs-wasm@rc` | The current hash-based signature signer and verifier (SHRINCS), compiled from the audited Rust implementation to WebAssembly. Works in Node.js and the browser. The `rc` tag is 0.2.0-rc.2; `latest` resolves to an older release candidate. |

### Python (PyPI)

| Package | Install | What it is |
| --- | --- | --- |
| `xquad` | `pip install xquad` | Builds optimization models in the network's Ising format. |
| `xqsa` | `pip install xqsa` | Solver adapters for those models, including the backend that submits jobs to Quip Network. See [Submit Your First Compute Job](../compute/submit-a-job.md). |

### Packages that do not exist yet

There is no public `@quip.network/quip-swap` or `@quip.network/sdk` package, and no swap SDK is published today. Use the wallet for swaps.

### Previous-generation libraries

The Winternitz One-Time Signature (WOTS+) libraries remain published for the earlier account generation: [`@quip.network/hashsigs`](https://www.npmjs.com/package/@quip.network/hashsigs) (TypeScript), [`@quip.network/hashsigs-solidity`](https://www.npmjs.com/package/@quip.network/hashsigs-solidity) (Solidity), [hashsigs-cpp](https://github.com/quipnetwork/hashsigs-cpp) (C++), and the [hashsigs-rs](https://crates.io/crates/hashsigs-rs) crate (Rust). New integrations should use the packages in the tables above.

Working with an AI assistant? Every page here has a markdown mirror and the site runs an MCP server: see [Use These Docs with AI](use-with-ai.md).
