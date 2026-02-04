---
icon: atom
---

# What is Quip?

Quip is **not** a single blockchain or a single quantum computer. Think of it as two orthogonal layers that can be adopted together or separately:

1. **Compute-Consensus Layer (Quip Network)** – a new Nakamoto-style chain whose proof-of-work _is a useful optimization job_. This turns spare classical/quantum hardware into block-production while producing answers clients are willing to pay for.
2. **Asset Layer (QUIP Vault & Interlock)** – a post-quantum wrapper you deploy _on any existing chain_ to lock, move, or atomically swap value without bridges. It upgrades security today without requiring any hardware or protocol changes.

These layers share the **same token (QUIP)** and the same validator/miner economy, but either layer can function on its own:

* **Only need useful-work mining?** Point your QPU/GPU/CPU farm at the Quip Network; earn QUIP even if you never lock assets.
* **Only need PQ security?** Use Vaults on Ethereum/Solana/Bitcoin with no exposure to mining.

### 1. Mission & Scope

Quip delivers **two coupled services**:

1. **Decentralized compute marketplace** – miners solve real optimization jobs instead of wasteful hashes, proving quantum advantage under a single token economy.
2. **Post-quantum asset security** – hash-based vaults wrap ECC keys with WOTS+ keys, offering drop-in protection on any chain.

The outcome? We secure existing value, monetize idle quantum-classical hardware, and fund open-source quantum research.

### 2. Core Components

#### 2.1. QUIP Vault

* Deposit on any chain → vault ID & first WOTS+ public key.
* Each action signed with next WOTS+ key → immutable hash-chain of ownership.
* Safe through host-chain reorgs; can always withdraw back to native chain.

#### 2.2. Interlock

* Two parties can perform atomic swaps across chains by cryptographically exchanging quantum-resistant private keys
* With their single use keys, each party encrypts a new quip vault holding the assets they want to trade, and this begins a timer
* Either both execute their half of the trade, or the expired timers allow refunds
* No bridges required!

#### 2.3. Consensus – Quantum PoW (QPoW)

* **Canonical chain:** Random Ising models are generated using a block header `prevHash‖Merkle‖height‖addr‖keys` with difficulty determined by chain clock speed
* **Side-chains/uncles:** Jobs submitted by consumers can be included as an uncle block in any chain: different processors can mine same job class, and publish alternate solutions to validate quality
* Miner must output **N** low-energy, pairwise-distant solutions.
* Identity = {ECDSA, rolling WOTS+}; difficulty & streak bonuses bind to key.

#### 2.4 Subnet & Pipeline Marketplace

* Each arrow is pluggable; component authors earn royalties.
* First subnet = Optimization (QUBO -> Ising: knapsack, TSP, SVP, job scheduling…).
* Future subnets: Search, Factoring, Circuit Mapping.

User Data → Template → Graph Reduce → Embed → Algo Select → HW Select → Compute

### 3 Actors & Incentives

| Actor                                | Role                               | Earns                    |
| ------------------------------------ | ---------------------------------- | ------------------------ |
| **Compute Miner** (CPU/GPU/ASIC/QPU) | Solve jobs, broadcast blocks       | Block reward + job fees  |
| **Validator**                        | Batch QUIP tx, finalise blocks     | Network fees + emissions |
| **Canary Node**                      | Track reorgs, checkpoint vaults    | Fees + emissions         |
| **Algorithm/Pipeline Designer**      | Publish templates, reducers, algos | Royalty on every call    |
| **Nominator**                        | Delegate QUIP to validators        | Share of validator yield |

### 4 Token Economics

#### 4.1 Supply (fixed commitments)

* **Investors:** 15 %
* **Team / Ecosystem:** 15 %
* **Community / Testnet:** 10 %
* **Treasury & Emissions:** 60 %

#### 4.2 Utilities

| Layer                | Action        | Payer           | QUIP sink             |
| -------------------- | ------------- | --------------- | --------------------- |
| **Asset (Vault)**    | Vault deposit | Creator         | Flat fee + % burn     |
|                      | Transfer      | Sender          | Flat fee → validators |
|                      | Contract exec | Caller          | % routed to treasury  |
|                      | Swap open     | Both parties    | Escrow (slashable)    |
|                      | Swap claim    | Claimer         | Nominal fee           |
| **Compute (Sinnet)** | Job bid       | Consumer        | Variable fee          |
|                      | Block reward  | Protocol        | Newly-minted          |
|                      | Staking bond  | Validators/Noms | Locked collateral     |
|                      | Bounty payout | Treasury        | Stream release        |

Key points: universal denomination, predictable costs, deflationary burn, security-fee coupling.

#### 4.3 Emission Outline

* **Years 0-2:** heavy miner + validator issuance.
* **Years 2-5:** taper; rely on fees & royalties.
