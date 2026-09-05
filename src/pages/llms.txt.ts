import type { APIRoute } from "astro";
import {
  DOCS,
  AI,
  CODE,
  NETWORK,
  REGISTRIES,
  SITE,
  SOCIAL,
} from "../data/links";
import { EVM, CHAIN, FAUCET, EXPLORER, SUBSCAN, PORTAL } from "../data/testnet";

/*
 * The portal's own llms.txt, in the llmstxt.org shape: an H1, a blockquote
 * summary, then H2 sections of annotated links. An agent that lands on
 * developers.quip.network gets routed without scraping the page, and the docs' own
 * llms.txt stays the deeper index.
 */

const body = `# Quip Network for developers

> Quip Network provides post-quantum protection for assets on existing chains, and an open marketplace for running optimization jobs on real quantum hardware. This is the developer entry point: quickstarts, testnet connection details, repositories, and machine-readable documentation.

## Start here

- [Quickstart](${DOCS.quickstart}): Fastest path to a working result.
- [What is Quip Network](${DOCS.whatIsQuip}): What the network does and who it is for.
- [How Quip Network fits together](${DOCS.howItFitsTogether}): The relationship between the asset-security and compute halves.
- [Documentation index](${DOCS.home}): Full documentation.

## Machine-readable documentation

- [Docs llms.txt](${AI.llmsTxt}): Annotated index of every documentation page.
- [Docs llms-full.txt](${AI.llmsFullTxt}): The entire documentation set as one markdown file.
- [MCP server](${AI.mcpEndpoint}): Hosted HTTP MCP server exposing searchDocumentation and getPage. Install with: claude mcp add --transport http quip-docs ${AI.mcpEndpoint}
- [Use These Docs with AI](${DOCS.useWithAi}): Setup for Claude Code, Cursor, and generic MCP clients. Any docs page also returns markdown if you append .md to its URL.

## Build applications

- [Quip SDK](${DOCS.sdk}): Key generation, signing, and verification. Install: npm install @quip.network/ethereum-sdk@beta
- [Quip Accounts](${DOCS.accounts}): Contract-based post-quantum lockboxes secured by hash-based signatures.
- [QuipSwap](${DOCS.quipswap}): Hash-locked atomic swaps with no bridge and no custodian.
- [ethereum-sdk on npm](${REGISTRIES.ethereumSdk}): Use the @beta tag; the latest tag is stale at 0.1.7.
- [quip-swap-sdk on npm](${REGISTRIES.quipSwapSdk}): Swap protocol SDK.

## Run compute jobs

- [Submit Your First Compute Job](${DOCS.submitAJob}): Ising-model optimization through the job mempool. Install: pip install "xqsa[quip]"
- [Quantum Randomness (QVRF)](${DOCS.qvrf}): Concepts only. Not a cryptographic VRF.
- [xquad on PyPI](${REGISTRIES.xquad}): Problem-formulation toolchain, Python 3.13 or newer.
- [xqsa on PyPI](${REGISTRIES.xqsa}): Solver adapters, local CPU and network backends.

## Run a node

- [Run a Node (TestNet)](${DOCS.runANode}): Hardware requirements and install routes.
- [Miners](${DOCS.miners}): Classical and quantum miners, and proof of useful work.
- [Node Manager releases](${CODE.nodeManager}): Desktop GUI and TUI builds.
- [Server deployment](${CODE.nodeServer}): Docker compose stack for always-on nodes.

## Testnet

- Genesis hash: ${CHAIN.genesis}. Identify the chain by THIS. Not by the EVM chain ID, which is ${EVM.chainId} on both this network and the retired one that preceded it, and not by the chain spec id, which is still "${CHAIN.specId}" because that string is the on-disk database path.
- [Explorer](${EXPLORER.url}): Blocks, transactions, and accounts on the Aglais testnet.
- [Subscan](${SUBSCAN.url}): Substrate-side explorer for the same chain.
- [Polkadot.js portal](${PORTAL.url}): Extrinsics, storage, and chain state.
- [Chain spec](${CHAIN.chainSpecUrl}): ${CHAIN.chainSpecName}, includes bootnodes. About 2.4 MB, with a .sha256 beside it.
- EVM JSON-RPC: ${EVM.rpcUrl} over HTTPS on port 443, chain ID ${EVM.chainId} (${EVM.chainIdHex}), token ${EVM.currencySymbol} with ${EVM.decimals} decimals, gas price ${EVM.gasPrice}, backend ${EVM.backend}. EVM history starts at block 0.
- Substrate JSON-RPC: ${CHAIN.rpcHttp[0]} over HTTPS POST, or ${CHAIN.rpcWss} over websocket. Open CORS, so a browser can call it directly. SS58 prefix ${CHAIN.ss58Prefix}, native token precision ${CHAIN.tokenDecimals} decimals. Locally, ${CHAIN.localRpc} once your own node is running.
- Faucet: ${FAUCET.request} to ${FAUCET.origin}, JSON body {"dest": "${FAUCET.destField}"}. Dispenses ${FAUCET.amount}, rate-limited per destination. API only: the root path 404s and there is no CORS preflight, so call it from a server or curl rather than a browser.
- Testnet tokens hold no value and balances can be reset.

## Source code

- [GitLab group](${CODE.gitlabGroup}): Canonical host. Most recent work lands here first.
- [GitHub organisation](${CODE.githubOrg}): Mirror of the GitLab group.
- [quip-validator](${CODE.validator}): Protocol node, Rust on a Substrate fork.
- [xquad](${CODE.xquad}): Problem formulation across quantum architectures.
- [hashsigs-rs](${CODE.hashsigs}): Hash-based signatures, with ports for TypeScript, Solidity, Python, and C++.
- [quip-miner](${CODE.miner}): Ising solvers for CPU, CUDA, Metal, and D-Wave.

## Community and feedback

- [Feedback board](${NETWORK.feedback}): Report documentation gaps, broken commands, and feature requests. This is the single feedback channel across every Quip Network product, so name the surface you were using. There is no developer-only channel yet.
- [Discord](${SOCIAL.discord}): Support and questions. Use the faucet above for testnet balance rather than asking here.
- [Research forum](${NETWORK.research}): Protocol proposals.

## Optional

- [Key properties](${DOCS.keyProperties}): Design principles behind the network.
- [Participants](${DOCS.participants}): The five-layer participant stack and who pays whom.
- [Token](${DOCS.token}): $QUIP as a shared compute credit.
- [Whitepaper](${SITE.whitepaper}): Full protocol paper, PDF.
- [Quip Account](${NETWORK.account}): Browser interface for generating quantum-resistant keys.
`;

export const GET: APIRoute = () =>
  new Response(body, {
    headers: {
      // Caching is handled by netlify.toml now that this is prerendered.
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
