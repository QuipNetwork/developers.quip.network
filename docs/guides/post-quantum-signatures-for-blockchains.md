---
description: >-
  Compare the post-quantum signature schemes available to blockchains by key
  size, signature size and the state a signer has to keep, then pick one for
  your wallet or chain.
icon: signature
---

# Post-quantum signature schemes for blockchains

Blockchains can move to post-quantum signatures with ML-DSA or SLH-DSA, the two schemes NIST finalized on August 13, 2024 in [FIPS 204](https://csrc.nist.gov/pubs/fips/204/final) and [FIPS 205](https://csrc.nist.gov/pubs/fips/205/final), or with Falcon once NIST finishes [its standard](https://csrc.nist.gov/projects/post-quantum-cryptography). The smallest ML-DSA signature runs to 2,420 bytes against 64 bytes for a Bitcoin Schnorr signature, so chain designers mostly weigh signature size against signer state.

NIST runs its [post-quantum cryptography project](https://csrc.nist.gov/projects/post-quantum-cryptography) because a future quantum computer could break many of the cryptographic systems in wide use now.

## Key and signature sizes

| Scheme | Built on | Status | Public key (bytes) | Signature (bytes) |
| --- | --- | --- | --- | --- |
| BIP-340 Schnorr, the classical baseline | Elliptic curve | [Bitcoin BIP-340](https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki) | 32 | 64 |
| ML-DSA-44 | Module lattices | [FIPS 204](https://csrc.nist.gov/pubs/fips/204/final), final | 1,312 | 2,420 |
| ML-DSA-65 | Module lattices | [FIPS 204](https://csrc.nist.gov/pubs/fips/204/final), final | 1,952 | 3,309 |
| Falcon-512 | Lattices | [Standardization underway](https://csrc.nist.gov/projects/post-quantum-cryptography) | 897 | 666 |
| SLH-DSA-128s | Hash functions, stateless | [FIPS 205](https://csrc.nist.gov/pubs/fips/205/final), final | 32 | 7,856 |
| SLH-DSA-128f | Hash functions, stateless | [FIPS 205](https://csrc.nist.gov/pubs/fips/205/final), final | 32 | 17,088 |
| LMS and XMSS | Hash functions, stateful | [SP 800-208](https://csrc.nist.gov/pubs/sp/800/208/final), final | Depends on parameter set | Depends on parameter set |

The sizes come from Table 2 of [FIPS 204](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.204.pdf), Table 2 of [FIPS 205](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.205.pdf), the [Falcon site](https://falcon-sign.info/) and [BIP-340](https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki). NIST places ML-DSA-44 in security category 2 and both SLH-DSA-128 sets in category 1, so the rows do not all target the same strength.

* **Falcon-512** gives the smallest post-quantum signature in the table, at 666 bytes. NIST selected Falcon but has not finalized its standard, and the [pqhybridsign README](https://github.com/QuipNetwork/pqhybridsign) lists this as a limitation. Expect to revisit Falcon code once NIST publishes the final version.
* **SLH-DSA** uses a 32-byte public key, the size of a BIP-340 key, but its signatures start at 7,856 bytes. FIPS 205 derives it from SPHINCS+, so its security rests on hash functions alone.
* **ML-DSA** is the finalized lattice option. At its smallest parameter set, an ML-DSA signature is larger than Falcon's and far smaller than SLH-DSA's.

## Stateful schemes count every signature

[SP 800-208](https://csrc.nist.gov/pubs/sp/800/208/final) approves LMS and XMSS, two stateful hash-based schemes, along with their multi-tree variants. Each private key in these schemes covers a fixed supply of one-time keys, and [RFC 8554](https://datatracker.ietf.org/doc/html/rfc8554) forbids signing a second message with a one-time key after it has signed the first.

A signer using LMS or XMSS therefore marks each one-time key as spent, and writes the mark [before broadcasting](../interlock/quip-accounts.md#if-you-build-your-own-signer-track-your-slots) the transaction. When a user restores a wallet from an old backup, the signer loses track of keys spent since the backup and can sign with one of them again.

## Hybrid signatures

A hybrid signature pairs a classical signature with a post-quantum one. Verifiers accept the pair only if both halves verify. Quip Network's open-source Rust library [pqhybridsign](https://github.com/QuipNetwork/pqhybridsign) builds these composites from ed25519 or sr25519 plus ML-DSA-44, Falcon-512 or SHRINCS. According to its README, a composite stays unforgeable as long as either half survives a break. The library's verifier evaluates both halves on every call, even after the first half fails.

Composite sizes add up from the halves. An ed25519 and ML-DSA-44 composite carries a 1,344-byte public key and a 2,484-byte signature, 64 bytes more than ML-DSA-44 alone.

## Hash-based signing in Quip Accounts

A [Quip Account](../interlock/quip-accounts.md) holds assets in a smart contract on the chain you already use and releases them only against a hash-based signature. The account signs with SHRINCS, Quip's hash-based scheme, and pqhybridsign pairs the same scheme with ed25519 or sr25519 in its hybrid suites. SHRINCS gives each account two signing paths:

1. An everyday path, where each signature consumes one slot from a fixed budget.
2. A break-glass path for recovery and key rotation, with more expensive signatures and no need for a record of used slots.

The Quip clients track slots for account holders. A team writing its own signer with [`@quip.network/hashsigs-wasm`](../getting-started/quip-sdk.md) keeps that record itself, under the same rule as LMS and XMSS.

For a Substrate-based chain, a post on the [Quip research forum](https://research.quip.network/t/post-quantum-signature-libraries-for-a-substrate-based-blockchain/14) compares liboqs, pqcrypto and other libraries for these schemes.

## Next step

Read [Quip Accounts](../interlock/quip-accounts.md) before you add post-quantum signing to a wallet or contract. It covers slot tracking, ERC-1271 signature checks and account upgrades.
