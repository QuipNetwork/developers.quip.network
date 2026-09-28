---
description: >-
  The QuipSwap settlement lifecycle as the Omnibus contract enforces it: the
  hashlock, the six-deadline schedule, lock states, and every timeout path.
icon: arrows-rotate
---

# How a swap works

Every QuipSwap trade settles through one contract, `Omnibus`. This page describes the lifecycle exactly as that contract enforces it: commit, claim and reclaim. The claim step is also called execute; the order book labels it Settle, and on chain the function is `claim`.

## The secret, the lock and the swap ID

A swap is coordinated by a hashlock. The party that proposes the swap generates a random 32-byte `secret` and publishes only its hash:

```
lock = keccak256(secret)
```

`claim` derives the lock from the secret it is given, so nobody can settle a swap without knowing the secret. The contract never checks who holds it.

Swap state is stored under a swap ID that binds the lock to the negotiated terms of both sides:

```
swapId = keccak256(lock ‖ digestTermsCanonically(party, counterparty))
```

The canonical digest hashes both sides in sorted order, so the ID is the same whichever side is passed first. An unrelated pairing that reuses an observed lock gets its own slot and cannot block or alter another swap. Read it on chain with `swapId(lock, party, counterparty)`.

## Terms: one struct per side

Each side of a swap is a `Terms` struct:

| Field | Meaning |
| --- | --- |
| `chainId` | The chain that holds this side's assets. `commit` requires it to be the local chain. |
| `reclaimRecipient` | Receives this side's own assets back on `reclaim`. |
| `recipient` | Receives the counterparty's assets on `claim`. |
| `commitmentDeadline` | This side may not commit at or after this timestamp. |
| `claimDeadline` | Closes the proposer's reveal window and opens the taker's. |
| `reclaimRelease` | From this timestamp, this side may reclaim. |
| `assets` | The assets this side gives up. |

Each `Asset` has a type (`Native`, `ERC20`, `ERC721` or `ERC1155`), a `target` contract (zero for native), an `id` (ERC-721 and ERC-1155 only) and an `amount`. The contract rejects terms that break any of these rules:

* One to 20 assets per side.
* Non-zero `recipient` and `reclaimRecipient`, and a non-zero `chainId`.
* A non-zero `amount` on every asset, ERC-721 included.
* Native assets carry a zero target and zero id. ERC-20 assets carry a non-zero target and zero id. ERC-721 and ERC-1155 assets carry a non-zero target; token id 0 is valid.
* Within a side, `commitmentDeadline < claimDeadline < reclaimRelease`, and `reclaimRelease` below the maximum `uint256`.

## Proposer and taker

The two sides are not symmetric, and nothing in the struct labels them. The side with the earlier `commitmentDeadline` is the **proposer**: it generates the secret, commits first and reveals first. The other side is the **taker**: it commits second and claims second, using the secret the proposer revealed.

In a cross-chain swap the secret holder must be the proposer. A taker who held the secret could withhold its own commitment and still claim the proposer's leg, and the contract cannot see the other chain to prevent it.

## The deadline schedule

At every commit the contract checks that the six deadlines of the two sides strictly interleave, proposer first:

```
P.commitmentDeadline < T.commitmentDeadline < P.claimDeadline
  < T.claimDeadline < P.reclaimRelease < T.reclaimRelease
```

Any other ordering reverts with `DisordedDeadlines`. The interleave produces one action window per step. Every window is half-open, `[lower, upper)`: the lower bound is included and the upper bound is excluded, so exactly one window accepts a shared boundary instant.

| Actor | Action | Window |
| --- | --- | --- |
| Proposer | `commit` | `[0, P.commitmentDeadline)` |
| Taker | `commit` | `[P.commitmentDeadline, T.commitmentDeadline)` |
| Proposer | `claim`, revealing the secret | `[T.commitmentDeadline, P.claimDeadline)` |
| Taker | `claim`, using the revealed secret (cross-chain only) | `[P.claimDeadline, P.reclaimRelease)` |
| Proposer | `reclaim` | `[P.reclaimRelease, ∞)` |
| Taker | `reclaim` | `[T.reclaimRelease, ∞)` |

Three consequences follow:

1. The taker can only commit after the proposer's commit window has closed, so it commits against a leg that can no longer change.
2. The taker can only claim after the proposer's claim deadline. The proposer reveals first, or the swap does not settle.
3. The taker's reaction window after the reveal is `P.reclaimRelease − P.claimDeadline`. The contract enforces its position in the schedule. Its width is a parameter the integrator chooses.

The contract checks the order of the deadlines and never their spacing. The QuipSwap SDK checks spacing: its presets are 300 seconds for fast-finality L2s, 1,800 seconds as the default, and 3,600 seconds for congested L1s. Cross-chain, each window is judged against the local chain's `block.timestamp`, so the reaction window also has to absorb the worst-case clock skew between the two chains. The SDK's `validateCrossChainSchedule` takes a `maxClockSkewSeconds` argument for this.

### The schedule the order book builds

The order book spaces all six deadlines one gap apart, starting from the moment the maker accepts a request. With `s` as the acceptance time and `g` as the listing's gap:

| Deadline | Timestamp |
| --- | --- |
| Proposer (maker) `commitmentDeadline` | `s + g` |
| Taker `commitmentDeadline` | `s + 2g` |
| Proposer `claimDeadline` | `s + 3g` |
| Taker `claimDeadline` | `s + 4g` |
| Proposer `reclaimRelease` | `s + 5g` |
| Taker `reclaimRelease` | `s + 6g` |

The default gap is 1,800 seconds, so a swap that nobody settles is fully reclaimable three hours after acceptance. A maker can set a gap as short as 60 seconds; anything under 1,800 seconds asks for confirmation. The longest gap keeps the last `reclaimRelease` within 14 days of acceptance.

## Lock states

A swap ID moves through four states:

| State | Meaning |
| --- | --- |
| `Unused` | Nothing has been committed under this swap ID. |
| `Free` | Same-chain only. One side has committed and the other is expected on this chain. |
| `Committed` | Same-chain: both sides have committed. Cross-chain: this chain's side has committed. |
| `Spent` | Terminal. The swap was claimed or reclaimed. |

The allowed transitions are `Unused → Free`, `Unused → Committed`, `Free → Committed`, `Free → Spent` and `Committed → Spent`. Anything else reverts with `InvalidLockAdvancement`. Settlement marks the swap `Spent` before any asset moves, so a reentrant `claim` or `reclaim` fails.

A cross-chain swap goes straight from `Unused` to `Committed` on each chain, because the counterparty's commit lives on the other chain and is not visible here.

## Commit

`commit(lock, party, counterparty, auth)` escrows one side.

1. `party.chainId` must equal the local chain. Both sides are validated, and so is their pairing.
2. The caller must be inside this side's commit window from the table above.
3. `msg.value` must equal the total native amount in `party.assets` plus the current `commitmentFee`, exactly. Overpaying and underpaying both revert with `IncorrectNativeAmountReceived`.
4. The commit is authorized through one of two routes, described in [Contracts and fees](contracts-and-fees.md#who-can-commit).
5. The first commit records the canonical terms digest. A second same-chain commit must match it and must post the other side.
6. The fee is added to `accruedFees`, the side is marked as posted, and ERC-20, ERC-721 and ERC-1155 assets are pulled from `msg.sender`. Fungible deposits are reconciled against the balance actually received.
7. The contract emits `Commitment(lock, party, signer, sender)`.

The sender funds the leg and the fee. The identity in `auth` only authorizes it.

## Claim

`claim(secret, party, counterparty)` settles. Anyone holding the secret may call it, and the transaction makes the secret public.

* The counterparty's leg must be on the local chain, since that is where the party gets paid.
* The window depends on whose assets this chain holds: the proposer's reveal window where the taker's assets are held, and the taker's window where only the proposer's assets are held.
* The swap must be `Committed` and the counterparty's side must have been posted.
* The counterparty's assets go to `party.recipient`. On a same-chain swap the party's assets go to `counterparty.recipient` in the same transaction, so one `claim` settles both legs.
* The contract emits `Claim(lock, recipient, secret)` once per leg paid out.

Claim payouts are exact or the call reverts. If a token's pooled balance shrank after commit, `claim` reverts and the swap falls through to reclaim.

## Reclaim

`reclaim(lock, party, counterparty)` returns one side's assets to that side's `reclaimRecipient` once `party.reclaimRelease` has passed. Anyone may call it; the recipient is fixed by the terms.

* Each side reclaims its own leg, once. A second attempt reverts with `AlreadyReclaimed`.
* The first reclaim moves the swap to `Spent`. The other side can still reclaim its own leg after that, but a swap that was settled by `claim` cannot be reclaimed.
* ERC-20 and ERC-1155 payouts are clamped to the balance the contract holds, so a reclaim can never be blocked by a token that shrank in place.
* The contract emits `Reclaimed(caller, lock, recipient)`.

The `commitmentFee` paid at commit is not returned by a reclaim.

## Timeouts and failure paths

| Situation | State | What happens |
| --- | --- | --- |
| Taker never commits, same chain | `Free` | The proposer reclaims after `P.reclaimRelease`. Only the proposer's leg was escrowed. |
| Taker never commits, cross-chain | `Committed` on the proposer's chain | The proposer reclaims there after `P.reclaimRelease`. The taker's chain was never touched. |
| Both committed, nobody claims, same chain | `Committed` | Each side reclaims its own leg after its own `reclaimRelease`. The proposer's opens first. |
| Proposer never reveals, cross-chain | `Committed` on both chains | Each side reclaims on its own chain after its own `reclaimRelease`. |
| Proposer reveals, taker misses its window, cross-chain | `Spent` on the taker's chain, `Committed` on the proposer's | The taker loses. The proposer has claimed the taker's leg and can reclaim its own after `P.reclaimRelease`. |
| Terms do not match the stored digest | Unchanged | Reverts with `TermsMismatch`. |
| Action outside its window | Unchanged | Reverts with `WindowViolated`. |

## Responsibilities the contract leaves to the integrator

* **Confirm the remote commit.** Cross-chain, the taker must confirm the proposer's commit on the proposer's chain before committing, at a confirmation depth it trusts. The contract checks deadlines only. The SDK's `verifyRemoteCommitment` reads the proposer chain's storage for this.
* **Keep the secret.** If the proposer loses the secret, the swap cannot settle and both sides wait for reclaim.
* **Watch for the reveal.** The taker has to claim inside `[P.claimDeadline, P.reclaimRelease)` on the proposer's chain.
* **Vet the counter-leg asset.** Fee-on-transfer and other lossy tokens are rejected at commit. Rebasing, pausable and blacklisting tokens are unsupported, as is any token or NFT contract whose transfers are dishonest. The contract enforces the order of settlement. Judging whether the counter-leg asset is sound is up to each side before it commits.

Source: `src/Omnibus.sol`, `src/TermsLib.sol` and `src/interfaces/IOmnibus.sol` in the `quip-swap-solidity` repository.
