---
description: >-
  QuipSwap lets two parties trade assets directly, on the same chain or across
  two chains, with post-quantum protection and no bridge or custodian in the
  middle.
icon: right-left
---

# QuipSwap

QuipSwap is Quip Network's protocol for trading assets directly with another party. You agree on the terms of a trade, then each of you locks the assets you are giving up in a shared settlement contract on your own chain. A single secret connects the two locks. When one side reveals the secret to claim their new assets, that same reveal lets the other side claim theirs. If the trade stalls, each side takes back what they locked once a deadline passes. The trade can run across two chains or entirely on one chain, and at no point does a bridge, an exchange, or any other custodian hold your money.

## Quantum protection comes first

QuipSwap's design leads with what protects the assets. The bridgeless design is a benefit, but a secondary one.

The assets in a swap are held and moved by Quip accounts, the quantum-resistant wallet layer described in [Quip Accounts](quip-accounts.md). Every authorization above the settlement layer is protected there by post-quantum signatures. The settlement contract itself deliberately uses a simpler tool: a hash lock, a lock that opens only for whoever knows a chosen secret. Hash locks rest on hash functions, and hash functions are not weakened by the known quantum attacks that break ordinary wallet keys. The result is a trade in which no step depends on the kind of mathematics a quantum computer can break: quantum-resistant authentication in the wallet layer above, hash-based locks in the contract below.

The contract accepts the asset kinds you would expect on a smart contract chain: the chain's native coin, fungible tokens, and non-fungible tokens (NFTs), in any combination on either side of the trade.

## The swap lifecycle: commit, execute, reclaim

A swap moves through three actions.

**Commit.** Each party locks the assets they are offering into the settlement contract on their own chain. The contract records the agreed terms of the trade and the hash of the shared secret, and holds the assets in escrow. Both parties can independently check that the two commitments describe the same trade.

**Execute.** One party reveals the secret to claim the assets committed to them. On chain this step is the `claim` function. Revealing the secret is what unblocks the other side: the secret becomes publicly visible on that chain, so the counterparty can read it and use it to execute on their own chain.

**Reclaim.** If the deadline on a commitment passes without execution, the party who committed takes their own assets back.

Every committed side of a swap ends in exactly one of two terminal states: it is executed before its deadline, or it is reclaimed after. There is no outcome in which the contract keeps your assets. Taken together, the two sides give the trade its central guarantee: either both legs complete and each party receives the other's assets, or neither completes and each party recovers their own. That guarantee holds as long as each party acts inside its window. In a cross-chain swap, a taker who misses its claim window after the secret is revealed loses its leg; [How a Swap Works](../quipswap/how-a-swap-works.md#timeouts-and-failure-paths) lists every timeout path.

## Timeout windows protect each side

The two commitments do not share one deadline. Each side carries three: a commitment deadline, a claim deadline and a reclaim release. The initiator, called the proposer, is the side with the earlier commitment deadline: it generates the secret, commits first and reveals first. The counterparty, called the taker, commits second and claims second. The six deadlines must interleave, proposer first at every step, so the proposer's reclaim opens before the taker's. The span between the proposer's claim deadline and the proposer's reclaim release is what keeps the trade fair: if the proposer reveals late, the taker still has that span to read the secret and claim before the proposer can take its own assets back.

That span must be wide enough to cover cross-chain observation delays, block confirmation times, transaction inclusion delays, and clock skew between the two chains. If it is too small, a race can open in which the proposer reclaims after the secret has already been revealed.

{% hint style="info" %}
The contract checks at every commit that the two sides' deadlines interleave in the right order, but it does not check how far apart they are, and it cannot see the other chain. If you integrate QuipSwap, that margin is a safety parameter you own. Choose it deliberately for the pair of chains you are trading across, and reject schedules that are formally valid but operationally unsafe.
{% endhint %}

## Finding a counterparty: makers and takers

The settlement protocol assumes you and your counterparty have already found each other and agreed on terms. The marketplace layer on top of it is how that happens when you do not have a counterparty in mind.

A **maker** posts an order: a statement of intent to swap that says what they are offering and what they want in return. A **taker** browses the open orders and takes one. Both parties then commit on-chain, and settlement proceeds through the same commit, execute, and reclaim flow described above. The order book is a convenience layer that runs off-chain; it helps people find each other, and the protocol does not care how the negotiation happened as long as both parties agree on the terms.

The maker publishes the full terms and waits for someone to accept them. [The Order Book](../quipswap/order-book.md) describes how the live order book at swap.quip.network runs this flow.

## Who can start a swap today

The settlement contract accepts a commit on one of two routes. On the wallet route, the commit must come from a Quip account deployed by the Quip wallet factory. On the keyed route, the commit can come from any sender but must carry a valid signature over the exact swap, checked by a signature verifier the contract owner has activated. The QuipSwap order book app uses Quip accounts. See [Who can commit](../quipswap/contracts-and-fees.md#who-can-commit).

The wallet flow also does work the contract cannot: it can observe both chains, bind you to the intended swap instance, and reject unsafe timing before a commit is sent.

## What QuipSwap does not do

QuipSwap is a settlement primitive, and it keeps its scope narrow on purpose.

* **No trade discovery, matching, or broadcast in the protocol.** The contract does not find counterparties, match orders, or announce open trades. Those jobs belong to layers built on top, such as the marketplace described above, or to whatever channel you and your counterparty prefer.
* **No slashing.** The protocol does not penalize a party who commits and then walks away. The honest party waits out the deadline and reclaims, losing time but not assets. Penalizing bad behavior requires a non-spoofable proof of commitment, which is an open problem, so any deterrence beyond reclaim is left to integrators.

## Why QuipSwap exists

Quip's network sells quantum computing work. QuipSwap is the payment rail that makes that work purchasable: it lets you exchange value from the chain you are already on, without migrating your assets to a new chain first. A swap is how assets on any supported chain become buying power on the Quip network, which is why Quip built the swap protocol rather than wait for a third party to provide one.

The states a swap moves through underneath these steps are set out in [QUIP Lifecycle](../basics/quip-lifecycle.md).
