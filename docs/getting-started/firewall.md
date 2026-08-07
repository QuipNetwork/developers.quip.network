---
description: >-
  The Quip client is a local software package that handles key generation,
  signing, and verification for interaction with Quip SDK endpoints.
icon: shield-halved
---

# Quip Client

If you are interested in hosting your own client software that interfaces with QUIPs, or which abstracts away interactions with the chain to solve business-related problems, the Quip Network also provides a client SDK compatible with WalletConnect, Solana `wallet-adapter`, and other major cryptocurrency wallet clients.

{% hint style="info" %}
There is no standalone Quip Client download. The client functionality described here ships as the [Quip SDK packages](quip-sdk.md#install) for integrators, and as the wallet at [account.quip.network](https://account.quip.network/) for end users.
{% endhint %}

<!-- REVIEW (R16): no client package exists on npm and no public client repo was found (verified 2026-08-07). Is a standalone Quip Client artifact planned, or should this page be folded into the Quip SDK and Quip Accounts pages? It is also the near-duplicate of the orphaned pq-wallet.md (R9). -->

The wallet provides the client with a method to generate a post-quantum seed, which complements the client's existing seed phrase, and can either be used for post-quantum secure transactions or remain unused to continue using classical transactions. This post-quantum seed is safe from quantum attackers as long as the post-quantum wallet nonce remains lower than 256, at which point the wallet will remind you to generate a new seed phrase extension and deposit to a new QUIP firewall contract.

{% hint style="danger" %}
**Under review (R1).** The figure of 256 in the paragraph above does not match any current internal specification, and this is a safety threshold. The correct signature budget is itself still being settled internally, so treat the specific number as unconfirmed. Pending engineering confirmation, see REVIEW-TRACKER.md.
{% endhint %}
