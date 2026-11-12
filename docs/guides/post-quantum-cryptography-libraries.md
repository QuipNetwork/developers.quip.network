---
description: >-
  Compare post-quantum signature libraries for blockchain work by language,
  supported schemes, audit status and license, then choose one for your node,
  wallet or signer.
icon: book
---

# Post-quantum cryptography libraries for blockchain developers

Choose a post-quantum signature library by the language of your code: [liboqs](https://github.com/open-quantum-safe/liboqs) in C, the RustCrypto [`ml-dsa` and `slh-dsa`](https://github.com/RustCrypto/signatures) crates in Rust, Cloudflare's [CIRCL](https://pkg.go.dev/github.com/cloudflare/circl/sign) in Go, or [noble-post-quantum](https://github.com/paulmillr/noble-post-quantum) in TypeScript. Read the audit note of each one before mainnet use: the liboqs maintainers advise against production use, and the maintainers of `ml-dsa` and noble-post-quantum both state that no independent audit has taken place.

Every transaction on a chain carries a signature, so the comparison below covers signature schemes. For key and signature sizes, read [Post-quantum signature schemes for blockchains](post-quantum-signatures-for-blockchains.md).

## Libraries by language

| Library | Language | Signature schemes | Audit or status note | License |
| --- | --- | --- | --- | --- |
| [liboqs](https://github.com/open-quantum-safe/liboqs) | C | ML-DSA, SLH-DSA, Falcon, LMS, XMSS and several newer candidates | Not recommended for production by its maintainers | MIT |
| [RustCrypto `ml-dsa`](https://github.com/RustCrypto/signatures/tree/master/ml-dsa) and `slh-dsa` | Rust | ML-DSA-44, -65 and -87, SLH-DSA, with `lms` and `xmss` crates alongside | `ml-dsa` has never been independently audited | Apache-2.0 or MIT |
| [rust-fn-dsa](https://github.com/pornin/rust-fn-dsa) | Rust | FN-DSA (Falcon) | Written to a best guess at the FN-DSA draft, with no promise of backward compatibility | Unlicense |
| [CIRCL](https://pkg.go.dev/github.com/cloudflare/circl/sign/mldsa) | Go | ML-DSA-44, -65 and -87, SLH-DSA, and Ed25519 or Ed448 hybrids with Dilithium | No audit note on the package pages | BSD-3-Clause |
| [noble-post-quantum](https://github.com/paulmillr/noble-post-quantum) | TypeScript | ML-DSA, SLH-DSA, Falcon Round 3 | Self-audited at version 0.6.1 in April 2026, with no independent audit yet | MIT |
| [pqhybridsign](https://github.com/QuipNetwork/pqhybridsign) | Rust, with C, Python and WebAssembly bindings | ed25519 or sr25519 paired with ML-DSA-44, Falcon-512 or SHRINCS | Falcon-512 suites depend on a FIPS 206 standard still in progress | AGPL-3.0-or-later |

The notes come from each project's README or package page as of November 12, 2026. Maintainers revise them, so check again before you settle on a library.

## Falcon code changes once FIPS 206 is final

FIPS 206, the standard for FN-DSA, [is still in development](https://csrc.nist.gov/projects/post-quantum-cryptography/post-quantum-cryptography-standardization). Each Falcon implementation in the table predates the final standard:

* rust-fn-dsa describes its code as a best guess at the draft and warns against expecting backward compatibility.
* noble-post-quantum implements Falcon Round 3 and expects FN-DSA to be backwards-incompatible with it.
* pqhybridsign warns that a signature made under a Falcon-512 suite may fail to verify against a later conforming implementation.

Signatures on a chain stay in its history after the libraries change. If you adopt Falcon, put a version tag in your signature format so verifiers can tell a Round 3 signature from an FN-DSA one, and plan the migration before you launch.

## PQClean is archived

The [PQClean](https://github.com/PQClean/PQClean) collection of portable C implementations went read-only on August 4, 2026. Its maintainers direct new work to mldsa-native for ML-DSA, slhdsa-c for SLH-DSA, liboqs, and Thomas Pornin's implementations for Falcon. If your node or wallet vendors PQClean code, plan to move to one of those.

## Hybrid signatures

A hybrid signature pairs a classical signature with a post-quantum one, and the verifier accepts the pair only if both halves verify. Quip Network's [pqhybridsign](https://github.com/QuipNetwork/pqhybridsign) builds each of its suites this way, combining ed25519 or sr25519 with ML-DSA-44, Falcon-512 or SHRINCS.

SHRINCS is the hash-based scheme in Quip signatures, and Quip uses it only inside this hybrid construction, [paired with a classical key](post-quantum-signatures-for-blockchains.md#hybrid-signing-in-quip-accounts). Its stateful path spends a one-time key slot on every signature, so a signer has to [record each slot](post-quantum-signatures-for-blockchains.md#stateful-schemes-count-every-signature) before it broadcasts the transaction.

## Substrate chains

A [July 2026 post on the Quip research forum](https://research.quip.network/t/post-quantum-signature-libraries-for-a-substrate-based-blockchain/14) compares liboqs, CIRCL, BoringSSL and other libraries for a Substrate-based chain. The author recommends liboqs as the backend, Dilithium for consensus, and SPHINCS+ or WOTS+ for transactions, and notes that no post-quantum stack has fully matured. Weigh the liboqs recommendation against the production warning from its maintainers.

## Choosing a library

1. Start with the language of your node, wallet or contract tooling, using the table above.
2. Prefer ML-DSA or SLH-DSA, specified in [FIPS 204](https://csrc.nist.gov/pubs/fips/204/final) and [FIPS 205](https://csrc.nist.gov/pubs/fips/205/final), unless signature size forces you toward Falcon.
3. Read the audit note, and budget for your own review if the library has had no independent audit.
4. Compare the license with the way you distribute or host your software.

## Next step

Compare key and signature sizes in [Post-quantum signature schemes for blockchains](post-quantum-signatures-for-blockchains.md), then install `@quip.network/hashsigs-wasm@rc` from the [Quip SDK](../getting-started/quip-sdk.md) page.
