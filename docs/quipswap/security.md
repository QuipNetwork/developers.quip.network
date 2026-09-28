---
description: >-
  The Oak Security audit of QuipSwap and Quip accounts, what it covered, and
  the protections and limits built into the settlement contract.
icon: shield-halved
---

# Security

## Audit

Oak Security GmbH audited the Quip smart contracts and published its report, **Security Audit Report: Quip, v1.0**, dated 24 September 2026.

[Read the Oak Security audit report (PDF)](https://github.com/oak-security/audit-reports/blob/main/Quip/2026-09-24%20Audit%20Report%20-%20Quip%20v1.0.pdf)

The report states that the audit covered three repositories:

| Repository | Commit reviewed | What it contains |
| --- | --- | --- |
| `ethereum-sdk` | `800fa8d8d1` | The Quip account: an upgradeable smart contract wallet authenticated by SHRINCS post-quantum signatures |
| `quip-swap-solidity` | `b6af8ff2cb` | `Omnibus`, the singleton escrow contract for hashlocked same-chain and cross-chain swaps |
| `hashsigs-solidity` | `90df8e9ba7` | The hash-based signature verifiers: WOTS+, SHRINCS and SPHINCS+C |

The report lists each finding with its severity. Read the findings in the report itself; this page does not summarize them.

The source of the Base deployment is [verified on Basescan](https://basescan.org/address/0xA7955981D5759a799267063110Be0F7AeCc26F8A#code). It is not the audited commit `b6af8ff2cb`: it includes the remediation made after the audit, in the fix-review commits `bb38f2a60b`, `e8cf43cd2d` and `3f265baf98`, and one later functional change to the wallet-factory gating (commit `46fa73b`, which switched the factory membership check to `commitmentOf`).

## Protections in the contract

* **Reentrancy.** Settlement marks a swap `Spent` before it moves any asset, and the state machine rejects every transition out of `Spent`. A recipient that re-enters `claim` or `reclaim` cannot settle twice. Commit authorization is view-only.
* **Terms binding.** The first commit stores a canonical digest of both sides' terms. Every later commit, claim and reclaim must match it, or the call reverts with `TermsMismatch`.
* **No payout for an unfunded side.** Settlement checks that the side it pays out was actually posted, or reverts with `TermsNotPosted`.
* **Exact native accounting.** A commit must send exactly the leg's native total plus the fee. Accrued fees are counted separately from escrow, and the owner can only withdraw the fees.
* **Signature scope.** A keyed-route commit signature binds the chain ID, the contract address, the lock, both sides' terms and the signer. It cannot be replayed on another chain, another deployment or the other side of the swap.
* **Bounded legs.** Each side holds at most 20 assets, so settling both legs of a same-chain swap stays inside the block gas limit.
* **A shrunken balance cannot block reclaim.** Each side reclaims its own leg independently. Fungible payouts on reclaim are clamped to the balance held, so a token whose balance shrank in place cannot block a refund. An issuer freeze is different; see the token risk below.
* **Limited owner.** The owner sets the fee (capped at 0.01 ETH), manages signature verifiers and withdraws fees. It cannot move escrow, change a swap's state or upgrade the contract.

## Known limits

These are properties of the design, stated in the contract and repository documentation.

* **Cross-chain commits are not verifiable on chain.** Each chain's contract sees only its own leg. The taker must confirm the proposer's commit on the other chain before committing.
* **The taker's reaction window is a parameter.** If the proposer reveals late and the taker does not claim before `P.reclaimRelease`, the proposer can end up with both legs. The contract enforces the order of the deadlines; the width of the window, including allowance for clock skew between the two chains, is set when the terms are built.
* **Lock poisoning is possible and recoverable.** A lock is public from the first commit. Anyone can commit a different pairing under the same lock, but because state is keyed by swap ID it occupies its own slot, and it cannot redirect any payout.
* **Deactivating a verifier can stall a keyed-route swap.** The keyed route reads verifier status live on every commit. If the owner deactivates a verifier between the two commits of a same-chain swap, the second keyed commit fails and the first leg waits for its `reclaimRelease`. The wallet route does not read verifier status.
* **Issuer-controlled tokens carry freeze risk.** Fee-on-transfer and other lossy tokens are rejected at commit. Rebasing and slashable tokens are unsupported, and so is any token or NFT contract whose transfers are dishonest; use a non-rebasing wrapper where one exists, such as wstETH in place of stETH. Tokens whose issuer can pause transfers or blacklist addresses, such as USDC, USDT, EURC and AUSD, carry issuer freeze risk. On a same-chain swap, a freeze makes `claim` revert, because its payout is exact or nothing, and the swap falls back to reclaim. Cross-chain, the proposer may already have claimed the taker's leg; if a freeze then blocks the taker's claim on the proposer's chain, the taker can lose its leg once `P.reclaimRelease` passes. A leg that holds the frozen token cannot move until the issuer lifts the freeze, and if an issuer blacklists the `Omnibus` contract address itself, every escrowed leg in that token is frozen.
* **No slashing.** A side that commits and then walks away is not penalized beyond its own commitment fee. The other side waits for its `reclaimRelease` and recovers its leg, but its own commitment fee is not refunded either.

## Reporting a vulnerability

Bug bounty details will be published later. Until then, report a suspected vulnerability privately to the Quip team through its official channels, such as [Discord](https://discord.gg/quipnetwork), rather than in a public post, and read the [audit report](https://github.com/oak-security/audit-reports/blob/main/Quip/2026-09-24%20Audit%20Report%20-%20Quip%20v1.0.pdf) for issues already known.
