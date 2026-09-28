---
description: >-
  Read QuipSwap state from the Omnibus contract: the functions, events and
  errors in IOmnibus, the TypeScript SDK, and a minimal read-only example.
icon: code
---

# Integrating

This page covers reading QuipSwap from outside the order book: the contract interface, the events that record every swap, and the TypeScript SDK that wraps them. Addresses are on [Contracts and fees](contracts-and-fees.md).

## Reading offers

Open listings are stored off chain by the order book and are read through the order book app at [swap.quip.network](https://swap.quip.network). A listing reaches the chain once the maker accepts a request and commits. From then on, the swap is readable from the contract and its `Commitment` events, as shown below.

## The TypeScript SDK

`@quip.network/quip-swap-sdk` wraps the contract with Solidity-exact hashing, terms and asset builders, schedule validation, a typed client and event decoders. It is a prerelease published under the `beta` dist-tag, so install it with the tag:

```bash
npm install @quip.network/quip-swap-sdk@beta viem
```

`viem` 2.x is a peer dependency. The package is ESM only and licensed AGPL-3.0-or-later. A plain install without `@beta` resolves an older build.

The SDK never holds keys, never signs and never stores the secret. For a Quip account it prepares the exact call (`prepareCommit` returns `{to, value, data}`) and the account's own tooling signs and executes it.

## Minimal example: read the fee and recent settlements

This script reads the current commitment fee on Base and lists the swaps settled in the last 2,000 blocks. It sends no transactions and needs no key.

```ts
import { createPublicClient, http, formatEther } from 'viem'
import {
  createOmnibusClient,
  resolveDeployment,
  getClaimEvents,
} from '@quip.network/quip-swap-sdk'

const publicClient = createPublicClient({ transport: http('https://mainnet.base.org') })

// The SDK ships the deployment registry, so the address resolves by chain ID.
const { omnibusAddress } = resolveDeployment(8453n)
const omnibus = createOmnibusClient({ address: omnibusAddress, publicClient })

const fee = await omnibus.getCommitmentFee()
console.log('commitmentFee', formatEther(fee), 'ETH')

// Public RPCs cap eth_getLogs ranges; mainnet.base.org allows 2,000 blocks.
const latest = await publicClient.getBlockNumber()
const claims = await getClaimEvents({
  publicClient,
  address: omnibusAddress,
  fromBlock: latest - 1999n,
  toBlock: latest,
})
for (const c of claims) console.log(c.lock, c.recipient, c.secret)
```

For a full history scan, start at the Base deployment block, 50545260, as `fromBlock`, and page through in ranges your RPC allows.

To follow one swap, compute its ID with the SDK's `swapId(lock, party, counterparty)` and read `omnibus.getLockState(id)`. Watch for new reveals with `watchClaimEvents`.

## Contract reference

All signatures below are from `src/interfaces/IOmnibus.sol`. `Terms` and `Asset` are defined in `src/TermsLib.sol` and described on [How a swap works](how-a-swap-works.md#terms-one-struct-per-side).

### Swap functions

```solidity
function commit(bytes32 lock, Terms calldata party, Terms calldata counterparty, CommitAuth calldata auth) external payable;
function claim(bytes32 secret, Terms calldata party, Terms calldata counterparty) external;
function reclaim(bytes32 lock, Terms calldata party, Terms calldata counterparty) external;
```

In each call, `party` is the side acting and `counterparty` is the other side. The contract derives the proposer from the deadlines, so passing the sides in the other order cannot select a different window.

### Views

```solidity
function swapId(bytes32 lock, Terms calldata party, Terms calldata counterparty) external pure returns (bytes32 id);
function lockState(bytes32 swapId) external view returns (LockState state);
function termsHash(bytes32 swapId) external view returns (bytes32 canonicalDigest);
function posted(bytes32 swapId, bytes32 termsDigest) external view returns (bool isPosted);
function reclaimed(bytes32 swapId, bytes32 sideDigest) external view returns (bool isReclaimed);
function commitDigest(bytes32 lock, Terms calldata party, Terms calldata counterparty, bytes32 signerHash) external view returns (bytes32 digest);
function commitmentFee() external view returns (uint256);
function accruedFees() external view returns (uint256 fees);
function MAX_FEE() external view returns (uint256);
function verifierActive(address verifier) external view returns (bool active);
function WALLET_FACTORY() external view returns (IWalletFactory factory);
function DOMAIN_SEPARATOR() external view returns (bytes32 separator);
function COMMIT_DIGEST_TAG() external view returns (bytes32 tag);
```

State is keyed by swap ID, not by the bare lock. `lockState` returns `Unused` (0), `Free` (1), `Committed` (2) or `Spent` (3). `termsHash` is non-zero once the pairing has been committed on this chain. `commitDigest` returns the exact 32-byte digest a keyed-route signer must sign; `signerHash` is the keccak256 of the whole signer blob.

`Omnibus` also exposes `VERSION()`, which returns the deployment's salt label as a right-padded `bytes32`, and the standard `owner()` and `pendingOwner()`.

### Owner functions

```solidity
function setCommitmentFee(uint256 newFee) external;           // reverts above MAX_FEE
function withdrawFees(address to) external;                    // sends accruedFees only
function setVerifierActivity(address verifier, bool active) external;
```

### Events

```solidity
event Commitment(bytes32 indexed lock, Terms party, bytes signer, address indexed sender);
event Claim(bytes32 indexed lock, address indexed recipient, bytes32 secret);
event Reclaimed(address caller, bytes32 indexed lock, address indexed recipient);
event FeeUpdated(uint256 oldFee, uint256 newFee);
event FeesWithdrawn(address indexed to, uint256 amount);
event VerifierActivityUpdated(address indexed verifier, bool active);
```

* `Commitment` fires once per commit. `sender` is the address that submitted and funded it. `signer` is attribution only on the wallet route.
* `Claim` fires once per leg paid out: once for a cross-chain claim, twice for a same-chain claim. It carries the secret, which is public from that block on. A cross-chain taker reads the secret from this event on the other chain.
* `Reclaimed` fires once per reclaim, for the caller's own side.

When you decode receipts, filter logs by the `Omnibus` address. A settlement receipt also contains the token contracts' logs, and a raw decoder that matches by event signature alone can be fooled by another contract emitting the same signature. The SDK's `client.waitForReceipt` and `getClaimEvents` scope decoding to the `Omnibus` address. `extractSecretFromClaims` additionally checks that each revealed secret hashes back to the lock, so read secrets through it.

### Errors

| Error | Raised when |
| --- | --- |
| `TermsMismatch` | The terms passed do not match the digest stored at the first commit |
| `InvalidLockState` | The swap is not in the state the call requires |
| `InvalidLockAdvancement` | The call would make a state transition the contract does not allow |
| `IncorrectNativeAmountReceived` | `msg.value` is not exactly the leg's native total plus the fee |
| `TermsAlreadyPosted` | A second same-chain commit tries to post the side already posted |
| `TermsNotPosted` | Settlement would pay out a side that was never committed |
| `AlreadyReclaimed` | A side tries to reclaim its leg a second time |
| `MalformedSigner` | The signer blob is 20 bytes or shorter |
| `NotQuipWallet` | Wallet route, and `msg.sender` is not a Quip account |
| `VerifierNotActive` | Keyed route, and the named verifier is not active |
| `InvalidCommitSignature` | Keyed route, and the verifier rejected the signature |
| `NativeNotAccepted` | ETH was sent to the contract outside `commit` |
| `FeeExceedsMax`, `ZeroFeeRecipient`, `ZeroVerifier`, `RenounceDisabled` | Owner calls with invalid arguments, or an attempt to renounce ownership |

Validation errors from `TermsLib` include `WindowViolated`, `DisordedDeadlines`, `ChainIdMismatch`, `EmptyAssets`, `TooManyAssets`, `ZeroAmount`, `ZeroAddressRecipient`, `UnexpectedAmountReceived` and the per-type `Invalid...Asset` errors.
