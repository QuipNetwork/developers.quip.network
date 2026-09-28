---
description: >-
  How the QuipSwap order book works: listings, requests, acceptance, what each
  row shows, and when listings expire.
icon: list
---

# The order book

The QuipSwap order book at [swap.quip.network](https://swap.quip.network) is where counterparties find each other. Listings and requests live off chain and cost nothing. Assets only move once a maker accepts a request and the two sides commit on chain, through the lifecycle in [How a swap works](how-a-swap-works.md).

## Three objects

| Object | Where it lives | What it is |
| --- | --- | --- |
| Listing | Order book service | A maker's signed terms: what they give, what they want, and when the listing expires |
| Request | Order book service | A taker's ask to fill one listing |
| Swap | `Omnibus` contract | The on-chain swap, created when the maker accepts a request and commits |

## Making a listing

A maker chooses:

* the asset and amount they offer, on its chain,
* the asset and amount they want, on its chain,
* the Quip account that holds the offered asset,
* an expiry, one hour from now by default and at most seven days out,
* the gap between swap deadlines, 1,800 seconds by default.

The maker's wallet signs the listing as EIP-712 typed data. Before publishing, the order book service checks that both assets are on its supported list, that the chain pair is supported, that the expiry is valid, that the signature matches the maker, that the maker owns the offering account, and that the account holds at least the offered amount.

Publishing a listing escrows nothing. The maker's assets stay in their account until the maker accepts a request.

## Taking a listing

1. **Request.** The taker selects Take on a listing and chooses a Quip account on the chain of the asset they will pay with. This creates a request. A taker can hold one active request per listing, and a request moves no funds.
2. **Accept.** The maker is notified and picks a request to accept. The service checks the listing, the signature, the maker's account and its balance again.
3. **Maker commits.** The maker's browser generates the secret and builds the swap terms with the maker as proposer. The secret stays in the maker's browser and is never sent to the order book service. The maker approves any ERC-20 spend and commits, then the swap is shared with the taker.
4. **Taker commits.** Once the maker's commit window has closed, the taker approves and commits their leg.
5. **Settle.** The maker claims, which reveals the secret. On a same-chain swap that one claim settles both legs. On a cross-chain swap the taker then claims the maker's leg with the revealed secret.

The secret stays only in the maker's browser local storage, under the key `quip.orderbook.secret.<lock>`. If the maker clears site data or switches device before Settle, the order book reports the secret as unavailable, and the swap can then only end in reclaim.

Each on-chain step runs when the user selects its action. With the default 1,800-second gap, the maker commits within 30 minutes of accepting, the taker commits in the following 30 minutes, and the maker settles in the 30 minutes after that, so both sides need to be online for their steps. The taker should confirm the maker's commit before committing its own leg; the contract does not check it. The maker's steps are Commit, Share and Settle; the taker's are Approve, Commit and Settle. If a swap stalls, each side reclaims its own leg once its `reclaimRelease` passes.

Every commit is executed by the user's Quip account and authorized with its post-quantum signature. See [Who can commit](contracts-and-fees.md#who-can-commit).

## What each row shows

| Column | Contents |
| --- | --- |
| You receive | Amount, token and chain of the asset the maker offers |
| You pay | Amount, token and chain of the asset the maker wants |
| Rate | The listing's exchange rate |
| vs market | How the rate compares with the current market price |
| Maker | The maker's name, a Yours tag on your own listings, and the maker's count of completed swaps |
| Listed | How long ago the listing was published, and how many requests are active on it |
| (last column) | A Take button, or the reason the listing cannot be taken |

Each row also shows when the listing expires. Listings within an hour of expiry are highlighted as closing.

## Expiry

A listing expires at the time the maker set. An expired listing drops out of the board, is marked expired, and cannot be republished; the maker creates a new listing instead. Expiry applies to the listing only. Once a maker has accepted a request and committed, the swap follows its own on-chain deadlines.

## Chains and assets

| Network | Chain ID | Assets |
| --- | --- | --- |
| Base | 8453 | ETH, WETH, cbBTC, USDC, DAI, UNI, ZRO, SNX, ZRX, USDT, AUSD, COMP, TEL, DRV, EURC, VIRTUAL, SPX, RSR, XYO, TAO, AERO |
| Base Sepolia (testnet) | 84532 | ETH, USDC, WETH |
| OP Sepolia (testnet) | 11155420 | ETH, USDC, WETH |

Both legs of a swap must be on mainnets, or both on testnets. On mainnet that means same-chain swaps on Base. Cross-chain swaps are available between Base Sepolia and OP Sepolia.

This is the asset list in the order book's configuration today. It can change as assets are added or removed.

## Paper mode

Paper mode at [swap.quip.network/demo](https://swap.quip.network/demo) is a practice order book. It uses the same board and a Quip account sign-in, and each take is signed, but no assets move and nothing is sent to any chain. The paper book is generated per user and per day, paper listings last one hour, and paper data is stored apart from the live order book.

| | Live order book | Paper mode |
| --- | --- | --- |
| Assets | Real assets escrowed in `Omnibus` | None move |
| Chain transactions | Commit, claim and reclaim, paid in gas plus the commitment fee | None |
| Counterparties | Other users | A generated book |
| Points | 5 per swap, up to 75 per UTC day | 1 per paper swap |
