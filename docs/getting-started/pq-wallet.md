---
description: >-
  A post-quantum wallet extension compatible with WalletConnect and Solana
  wallet-adapter, for hosts serving clients that use QUIPs.
icon: wallet
---

# PQ-Wallet

If you are interested in hosting clients that want to use QUIPs, the Quip Network also provides a post-quantum wallet extension compatible with WalletConnect and Solana `wallet-adapter`.

The wallet provides the client with a seed phrase extension, which complements the client's existing seed phrase, and can be used for post-quantum secure transactions or remain unused for classical transactions. This seed-phrase extension is safe from quantum attackers as long as the post-quantum wallet nonce remains lower than 256, and at which point the wallet will remind you to generate a new seed phrase extension and deposit to a new QUIP vault.
