---
description: >-
  Conceptual overview of QVRF, Quip's quantum randomness service: where the
  numbers come from, what the service guarantees today, and what it does not.
icon: dice
---

# Quantum Randomness (QVRF)

{% hint style="warning" %}
**Draft — pending technical review.** This page was assembled from internal specifications on 7 August 2026 and has not been approved by engineering. Details may change before this notice is removed.
{% endhint %}

QVRF (Quantum Verifiable Random Function) is Quip's quantum randomness service. It supplies random numbers to smart contracts, and the numbers come from measurements taken on a real quantum computer rather than from a formula. Your contract asks for random values and receives them back later through a callback, the same request-and-callback shape used by existing randomness oracles. The values are delivered over an encrypted application programming interface (API) connection when requested. <!-- REVIEW: Is "an encrypted API connection plus an on-chain request-and-callback" the right one-line description of the V0 delivery surface developers will integrate? -->

This page covers concepts only. The request interface is not yet final, so no function names or parameters appear here.

### The name is historical: QVRF is not a VRF

Despite the name, QVRF is not a verifiable random function (VRF) in the cryptographic sense, and you should not reason about it as if it were one.

In the cryptographic literature, a VRF is a keyed pseudorandom function: a secret key turns an input into an output, along with a proof that anyone can check against the matching public key. QVRF is a different kind of object. It is a physical randomness source with a verification record: the randomness comes from quantum measurements, and the record lets you check where and when those measurements happened. If you are assessing QVRF for your application, do not import the standard VRF security definitions, because they do not apply. This correction comes from Quip's own security model, which keeps the project name and flags the distinction so that reviewers start from the right definitions.

### Why quantum hardware

A classical random number generator is a formula. Anyone who learns the formula and its inputs can reproduce every number it will ever produce. A measurement on a quantum computer is different: the outcome does not exist until the measurement is taken. That is the core guarantee quantum hardware adds. The number was created at a known moment, and only the party who generated it could have known it before delivery.

The certification design supports that guarantee from two sides, both described here qualitatively:

- **A timing threshold.** The challenge that decides which quantum measurements to take is derived from a public source of randomness, so nobody can know it in advance, and a valid answer must come back within a short deadline. Producing a convincing answer by classical simulation would take far longer than the deadline allows, so a fast, valid answer is evidence that a quantum computer produced it. The blockchain records both ends of that time window, a technique the design calls carbon dating, which makes the timeline publicly checkable.
- **A fidelity score.** After the fact, verifiers use classical simulation to check a sample of the returned measurements and score how closely they match what the requested quantum process should produce. A sufficiently high score is evidence that a quantum device genuinely ran the process rather than guessing.

### What V0 guarantees, and what it does not

V0 is the first version of the service, and its trust model is deliberately simple. Integrate with these three facts in mind:

- **Delivery is operator-trusted.** In V0, Quip operates both the randomness generator and the delivery service. You are trusting a single operator to run the pipeline honestly. <!-- REVIEW: V0 QVRF Components says Quip "can be" both oracle and trustee; is single-operator V0 the confirmed operating plan? -->
- **The operator can withhold values, but cannot swap them.** Before any randomness is handed out, a commitment to the generated values is published on chain. A delivered value must match that earlier commitment, so an operator could refuse to deliver, but could not substitute different numbers after the fact without detection. <!-- REVIEW: Does V0 as built publish the commitment on chain before any delivery, so this property holds for the shipped system? -->
- **Verification is asynchronous.** The checks described above run after the fact, not at the moment of delivery. A value has not yet passed the full verification pipeline when you receive it; the verification record catches up later.

If your application needs stronger guarantees than this, treat V0 as a trusted randomness feed with a public commitment trail, and revisit as the trust model evolves in later versions.

### Where QVRF fits

Randomness is the Quip Network's second subnet, alongside the optimization subnet described in [Submit Your First Compute Job](submit-a-job.md). Quantum miners produce the raw randomness by running sampling circuits, and classical miners verify the results, so the service is itself a form of the network's proof of useful work. <!-- REVIEW: is this subnet-level positioning (randomness as QPoUW subnet 2, quantum miners generate, classical miners verify) cleared for public docs at concept level? -->

QVRF is designed to be the first product sold over Quip's swap-protocol payment rail. QuipSwap, Quip's peer-to-peer swap protocol, lets two parties settle a trade directly across chains, and QVRF uses that same mechanism as its payment path. In practice, payment does not tie you to one network: you can purchase randomness from any supported chain. <!-- REVIEW: Is "the first product purchasable over the QuipSwap payment rail, from any supported chain" the approved public positioning for QVRF? -->

{% hint style="info" %}
The request interface, the fee model, and the exact certification parameters are still being finalized. Integration documentation with installable packages and code examples will follow once those details settle.
{% endhint %}

<!-- SOURCES (for reviewers, not rendered):
- Quantum Verifiable Randomness (umbrella page) — https://app.notion.com/p/387db8c6a08881f0ab16c69209aa69b6 — last edited 2026-07-30
- QVRF Security Model 1: Core Certification of Quantum Origin, Draft v0.3 (Section 1 terminology note: "not a VRF"; carbon dating; timing threshold; fidelity score; asynchronous verification) — https://app.notion.com/p/3a2db8c6a08881eaa59dc610a26bbcbd — 2026-07-30
- QVRF Security Model 2: Trustee Distribution of Certified Randomness, Draft v0.3 (encrypted delivery; commit-before-delivery; operator trust split) — https://app.notion.com/p/3a2db8c6a088815aa2c4f56d45440dbe — 2026-07-30
- V0 QVRF Components (V0 architecture; "QUIP can be both Oracle + Trustee"; on-chain commitment before fulfilment; request-and-callback shape) — https://app.notion.com/p/3addb8c6a0888005bc38fea7a80a8ca2 — last edited 2026-08-06
-->
