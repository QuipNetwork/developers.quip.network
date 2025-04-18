---
description: >-
  The Quip client is a local software package that handles key generation,
  signing, and verification for interaction with Quip SDK endpoints.
icon: wallet
---

# Quip Client

If you are interested in hosting your own client software that interfaces with QUIPs, the Quip Network also provides a client SDK compatible with WalletConnect, Solana `wallet-adapter`, and other major cryptocurrency wallet clients.

The wallet provides the client with a method to generate a post-quantum seed, which complements the client's existing seed phrase, and can either be used for post-quantum secure transactions or remain unused to continue using classical transactions. This post-quantum seed is safe from quantum attackers as long as the post-quantum wallet nonce remains lower than 256, at which point the wallet will remind you to generate a new seed phrase extension and deposit to a new QUIP firewall contract.
