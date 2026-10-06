---
description: >-
  QuipSwap is a hashlocked swap protocol and order book for trading assets
  directly between Quip accounts, with no bridge, oracle or wrapped asset.
icon: right-left
---

# QuipSwap overview

QuipSwap lets two parties trade assets directly, on one chain or across two. Each side locks its assets in the `Omnibus` settlement contract on its own chain, and one shared secret settles both sides. There is no bridge, no oracle and no wrapped asset in the path, and no third party holds the assets.

For the concepts behind the protocol, read [QuipSwap](../interlock/quipswap.md) in the Quip Interlock Protocol section. This section is the developer guide: how settlement behaves on chain, how the order book drives it, where the contracts are deployed, and how to read them.

## What it supports

* **Assets.** Native coin, ERC-20, ERC-721 and ERC-1155, in any combination on either side, up to 20 assets per side.
* **Settlement.** Commit, claim and reclaim, with a hashlock and six interleaved deadlines. A trade either settles on both sides or each side reclaims its own leg.
* **Authorization.** Swaps are committed by Quip accounts, the smart accounts that authorize every call with hash-based post-quantum signatures. See [Quip Accounts](../interlock/quip-accounts.md).
* **Fee.** A flat commitment fee in native ETH on each commit, set by the contract owner. See [Contracts and Fees](contracts-and-fees.md#the-commitment-fee) for the current value.

## Live order book and paper mode

| | Live order book | Paper mode |
| --- | --- | --- |
| Address | [swap.quip.network](https://swap.quip.network) | [swap.quip.network/demo](https://swap.quip.network/demo) |
| Assets | Real assets, escrowed in `Omnibus` | None move |
| Chain transactions | Commit, claim and reclaim on chain | None |
| Counterparties | Other users | A generated practice book |
| Networks | Base, plus Base Sepolia and OP Sepolia testnets | None |

Paper mode uses the same board and sign-in as the live order book, and is the place to learn the flow before trading real assets.

## In this section

| Page | Covers |
| --- | --- |
| [How a Swap Works](how-a-swap-works.md) | The secret, terms, the deadline schedule, lock states, commit, claim, reclaim and every timeout path |
| [The Order Book](order-book.md) | Listings, requests, acceptance, row contents, expiry, supported assets and paper mode |
| [Contracts and Fees](contracts-and-fees.md) | Deployed addresses, the commitment fee, owner powers and who can commit |
| [Integrating](integrating.md) | The TypeScript SDK, a minimal read-only example, and the full contract interface |
| [Security](security.md) | The Oak Security audit, contract protections and known limits |
