---
description: >-
  How a QUIP moves through commit, claim, and reclaim, the four states the
  settlement contract tracks, and the timeouts that protect counterparties.
icon: arrows-rotate-reverse
---

# QUIP Lifecycle

A user creates a QUIP when they deposit funds to a QUIP-enabled smart contract or QUIP-enabled wallet. At any time, the user can transfer the QUIP to another owner using a regular cryptocurrency transaction. When two parties trade QUIPs, the settlement contract moves each side through three actions:

1. _Commit_: Each party locks the assets it is trading in the settlement contract on its own chain, bound to the agreed terms of both sides and to the hash of a secret that one party, the proposer, generated
2. _Claim_: The proposer reveals the secret to take the other party's assets, and the revealed secret lets the other party, the taker, claim the proposer's assets
3. _Reclaim_: If the swap is not claimed in time, each party takes back its own assets once its reclaim deadline passes

On chain, each swap is in one of four states:

| State | Meaning |
| --- | --- |
| `Unused` | Nothing has been committed |
| `Free` | Same-chain only: one side has committed and the other is expected |
| `Committed` | Same-chain: both sides have committed. Cross-chain: this chain's side has committed |
| `Spent` | Terminal: the swap was claimed or reclaimed |

When multiple parties exchange QUIPs, there are also two timeout cases:

1. _No counterparty commit_: If the taker never commits, the proposer reclaims its assets once its reclaim deadline passes.
2. _No claim_: If both parties committed but the swap is not claimed, each party reclaims its own assets after its own reclaim deadline. The proposer's reclaim opens first and the taker's last.

Neither timeout slashes anyone. Each party that committed pays a non-refundable commitment fee, so a party that walks away loses its fee, and the honest party loses time and its own fee. The full deadline schedule is on [How a Swap Works](../quipswap/how-a-swap-works.md).

These states are what a cross-chain trade moves through in practice; see [QuipSwap](../interlock/quipswap.md) for how two parties use them to settle without a bridge or a custodian.
