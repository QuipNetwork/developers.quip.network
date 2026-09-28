---
description: >-
  Deployed Omnibus addresses per chain, the flat commitment fee and how it
  accrues, the owner's powers, and which callers can commit.
icon: file-contract
---

# Contracts and fees

QuipSwap has one deployable contract, `Omnibus`. It holds escrowed assets, tracks the state of every swap and settles them. `TermsLib` is an internal library compiled into `Omnibus` and is never deployed on its own.

## Deployed addresses

`Omnibus` is deployed through the CreateX factory with CREATE3 and a salt that only the Quip deployer can use. The address depends on the factory, the deployer and the salt label, and not on constructor arguments, so every chain in a deployment family shares one address.

| Network | Chain ID | Omnibus | WalletFactory | Version label |
| --- | --- | --- | --- | --- |
| Base | 8453 | `0xA7955981D5759a799267063110Be0F7AeCc26F8A` | `0xA2B2F71456a799FCf4EF7A3111c4B96b3e928cc8` | `QUIP:Omnibus:v1.0.0-beta.3` |
| Base Sepolia (testnet) | 84532 | `0xA7955981D5759a799267063110Be0F7AeCc26F8A` | `0xA2B2F71456a799FCf4EF7A3111c4B96b3e928cc8` | `QUIP:Omnibus:v1.0.0-beta.3` |
| OP Sepolia (testnet) | 11155420 | `0xA7955981D5759a799267063110Be0F7AeCc26F8A` | `0xA2B2F71456a799FCf4EF7A3111c4B96b3e928cc8` | `QUIP:Omnibus:v1.0.0-beta.3` |

These rows come from the deployment registry, `sdk/src/deployments.json`, which is generated from `script/DeployConstants.sol` in the `quip-swap-solidity` repository. Base is the only mainnet in the registry. The order book only pairs mainnet with mainnet and testnet with testnet, so on mainnet today every swap is a same-chain swap on Base. Cross-chain swaps run between Base Sepolia and OP Sepolia.

Each deployment states what it is on chain. `VERSION()` returns the salt label as right-padded ASCII, and `WALLET_FACTORY()` returns the factory the wallet route trusts. Check both before you trust an address, because a CREATE3 address says nothing about the code deployed at it.

The contract has no proxy and no upgrade path. A new version is a new deployment at a new address, and existing swaps stay on the version they were committed to.

## The commitment fee

The fee is flat. It does not scale with the size of the trade and is not set in basis points.

| | Value |
| --- | --- |
| Fee on Base, read on chain on 28 September 2026 | 7,925,700,000,000 wei (0.0000079257 ETH) |
| Fee on Base Sepolia and OP Sepolia, same date | 0 |
| Maximum the owner can set | `MAX_FEE`, 0.01 ETH |

The contract owner sets the fee and can change it at any time, so read the live value with `commitmentFee()` before you build a commit. The owner changes it with `setCommitmentFee(newFee)`, up to `MAX_FEE`, and every change emits `FeeUpdated(oldFee, newFee)`.

The fee is charged on each `commit`, in native ETH, on top of the native assets in the committed leg: `msg.value` must equal the leg's native total plus `commitmentFee` exactly. A swap takes two commits, one per side, so each side pays the fee once, when it commits. The fee is not returned when a side reclaims.

Because the owner can change the fee between the moment a client reads it and the moment its commit lands, a commit can revert with `IncorrectNativeAmountReceived`. Treat that revert as retryable.

### Where fees go

Fees accrue in the contract's `accruedFees` counter, separate from escrow. Only the owner can move them, with `withdrawFees(to)`, which:

* sends exactly `accruedFees` in native ETH to `to` and resets the counter,
* reverts with `ZeroFeeRecipient` if `to` is the zero address,
* emits `FeesWithdrawn(to, amount)`.

Escrowed native assets stay owed to each side's `reclaimRecipient`, and `withdrawFees` cannot reach them. The contract also rejects plain ETH transfers with `NativeNotAccepted`, so native value only enters through `commit`, where it is accounted for.

## Owner powers

The owner is readable with `owner()`. On 28 September 2026 the Base deployment's owner was `0xc68B64770Da7914DEb0EF238b048a0Bf3B5f6A26`, an externally owned account, with no pending transfer.

The owner can activate or deactivate signature verifiers, set the fee up to `MAX_FEE`, and withdraw accrued fees. The owner cannot touch escrowed assets, change the state of a swap, or upgrade the contract. Ownership changes hands through a two-step transfer (`Ownable2Step`), and `renounceOwnership` always reverts, so the contract can never be left without an owner.

## Who can commit

`claim` and `reclaim` are open to any caller: `claim` requires the secret, and `reclaim` pays only the recipient fixed in the terms. `commit` is where authorization happens. Every commit carries a `CommitAuth`:

```solidity
struct CommitAuth {
  bytes signer;    // ERC-7913 identity: verifier (20 bytes) ‖ key
  bytes signature; // over commitDigest; empty selects the wallet route
}
```

The signer must be an ERC-7913 keyed identity. A blob of 20 bytes or fewer, a bare address included, reverts with `MalformedSigner`. The `signature` field then selects one of two routes.

| | Wallet route | Keyed route |
| --- | --- | --- |
| Selected by | Empty `signature` | Non-empty `signature` |
| Check | `msg.sender` must be a wallet deployed by the Quip `WalletFactory` (`commitmentOf(msg.sender)` is non-zero) | The verifier named in `signer` must be activated by the owner, and must accept `signature` over `commitDigest(...)` |
| What proves intent | The Quip account's own post-quantum authenticated `execute` flow | The verifier's check of the signature |
| Who sends the transaction | The Quip account itself | Any address, which then funds the leg |
| Failure | `NotQuipWallet` | `VerifierNotActive`, `InvalidCommitSignature` |

The order book commits through the wallet route only: it sends an empty signature, and the call is executed by the user's Quip account. On the wallet route, a commit can only come from a Quip account, the smart account described in [Quip Accounts](../interlock/quip-accounts.md). Each account authorizes its calls with hash-based post-quantum signatures, so every swap it commits was signed that way. On the wallet route the `signer` in the `Commitment` event is attribution only: the contract does not verify it, so never treat it as proof that a particular identity agreed to the trade. Check `Commitment.sender` against the counterparty's known account address instead.

On the keyed route, the signature binds the domain (tag, chain ID and contract address), the lock, both sides' terms and the signer, so it cannot be replayed on another chain, another deployment or the other side. The verifier `0xF2f9E6D692da41b089c3c261c41509669eEc5567` is active on all three deployments.

In short, the contract accepts a commit from a Quip account on the wallet route, or from any sender that presents a valid signature from an active verifier on the keyed route. The QuipSwap order book app uses Quip accounts.

## Source and verification

The source of the Base deployment is verified on Basescan: [read `Omnibus` on Basescan](https://basescan.org/address/0xA7955981D5759a799267063110Be0F7AeCc26F8A#code). It comprises `src/Omnibus.sol`, `src/TermsLib.sol`, `src/interfaces/IOmnibus.sol` and `src/interfaces/IWalletFactory.sol`, compiled with solc 0.8.33 and licensed AGPL-3.0-or-later.
