---
description: >-
  A blockchain bridge audit reviews the lock and release contracts on each chain
  and the signers who attest to deposits. Compare the failure classes behind the
  largest bridge losses with the checks an audit should run for each.
icon: shield-halved
---

# Blockchain bridge audits

A blockchain bridge audit reviews the smart contracts that lock and release assets on each chain, along with the trust model for whoever attests that a deposit happened on the other chain. Several of the largest bridge losses began in that attestation step or in an upgrade, so an audit scoped to the token contracts alone leaves the riskiest code unexamined.

## Why bridges attract attackers

Many bridges keep the assets backing their wrapped tokens in a central pool on the source chain. [Chainalysis](https://www.chainalysis.com/blog/cross-chain-bridge-hacks-2022/) points to that pool as the reason bridges draw attacks. By August 2022 it counted about $2 billion taken in 13 bridge hacks, 69% of all crypto stolen in 2022 up to that point.

The [ethereum.org bridge guide](https://ethereum.org/en/developers/docs/bridges/) sorts bridges into trusted designs, which depend on external verifiers, and trustless designs, which add no trust assumptions beyond the connected chains. Its list of bridge risks includes:

1. Smart contract risk, which remains even after an audit.
2. Systemic financial risk from wrapped assets.
3. Counterparty risk in trusted designs.

## Failure classes and audit checks

Loss figures are the US dollar values given in the linked incident write-ups. Other sources value the same losses slightly differently, depending on token prices at the time.

| Failure class | Incident | Cause | Audit check |
| --- | --- | --- | --- |
| Signer threshold compromise | [Ronin, about $624M](https://rekt.news/ronin-rekt) | Five of nine validator signatures approved a withdrawal. Sky Mavis ran four validators, and the attacker obtained the fifth signature through an Axie DAO whitelist that had never been revoked. | List each key holder and its operator, count the independent operators behind the threshold, and confirm temporary signing rights get revoked. |
| Signature verification bypass | [Wormhole, $326M](https://rekt.news/wormhole-rekt) | The Solana contract accepted an account address without checking it. The attacker reused a signature set from an earlier transaction, skipped guardian approval and minted 120,000 whETH. | Validate every account passed into verification, and trace each mint path back to a checked attestation. |
| Initialization error on upgrade | [Nomad, $190M](https://rekt.news/nomad-rekt) | A June upgrade initialized the Replica contract with the zero address as a trusted root, so unproven messages passed validation. Copycats then replayed the same `process()` call from Etherscan. | Review upgrade and initialization parameters, test default values in mappings, and audit each upgrade before it goes live. |

## Scoping a bridge audit

Start the scope from the trust model, then add the code:

1. List every party able to approve a release: relayers, guardians, multisig signers and the upgrade admin.
2. Put deployment, initialization and upgrade scripts in scope next to the contracts.
3. Trace each release or mint function back to the proof it checks.
4. Record the audited commit, then compare it against the verified source of the deployed contract.

The [QuipSwap security page](/docs/quipswap/security) gives a worked example of the last step. It names the audited commit, then lists the remediation commits and a later functional change contained in the source verified on Basescan.

## Swaps without a bridge

A hashlocked swap moves assets across chains without a bridge pool. In [QuipSwap](/docs/quipswap/overview), each side locks its assets in the `Omnibus` settlement contract on its own chain, and a shared secret settles both sides. No bridge, oracle or wrapped asset takes part in settlement.

An audit of this design focuses on the settlement state machine and its deadlines. [Oak Security audited](/docs/quipswap/security) the Quip contracts, `Omnibus` included, in a report dated 24 September 2026. The security page lists the design's known limits as well. For example, each chain's contract checks only its own leg, so the taker confirms the proposer's commit on the other chain before committing.

## Where to go next

[Integrating QuipSwap](/docs/quipswap/integrating) covers the TypeScript SDK, a minimal read-only example and the full contract interface.
