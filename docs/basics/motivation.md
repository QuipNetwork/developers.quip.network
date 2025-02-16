---
icon: atom
---

# Motivation

Quantum computing threat vectors are imminent. Over the past few years, there has been a steady stream of results published by quantum computing researchers demonstrating significant increases in physical qubit counts, tremendous reductions in error rates, and other substantial improvements to practical computing factors relevant to real-world deployments. These improvements taken as a whole paint a compelling picture that the first quantum computers capable of compromising widely used cryptographic algorithms, like ECC256 or RSA2048, will arrive before the end of the decade.

The incredible coherence values of superconducting qubit architectures like Google’s Willow chip and the startlingly low error rates of Riken’s fusion-based photonics platform represent significant leaps forward in the capabilities of contemporary quantum processing units. We are rapidly approaching a cost of attack of less than 4% of the value held in the largest Bitcoin wallets. Indeed, the marginal cost of an attack on RSA2048 for a well-equipped quantum computing lab is estimated to approach $20,000, and the cost of an attack on ECC256 is likely even lower.

Unfortunately, broad adoption of post-quantum cryptography has lagged behind the accelerating scale of the threat, and few agents in the world are prepared for quantum attackers. While Bitcoin’s pay-to-quantum-resistant-hash proposal has been reviewed by at least one commenter, the specification remains undecided and largely undiscussed. Similarly, the Ethereum improvement proposal offering solutions for EVM networks is likewise lacking in detail and serious discussion, with no further development on any of the EVM L2s or appchains. These approaches remain reactive rather than proactive, leaving room for grievous harm to users who might be caught unaware and unprepared.

Many skeptics point out that P2PKH transactions on Bitcoin remain secure as long as the new public key is not disclosed with a payment transaction, however these users are not protected against block reorganization attacks made possible by quantum computers, and few users maintain sufficient operational discipline to maintain the integrity of their undisclosed public key.

Advocates for delaying adoption of post-quantum commitments claim that other targets are more likely to take priority over cryptocurrency addresses, and such advocates will often proclaim that a swift upgrade will deploy upon discovery of a viable quantum attack. However, we find this argument unconvincing, as many such large targets have immense incentives to keep any compromise a secret, and the deployment of a chain upgrade closes its eyes to the possibility of a rewind attack through a chainwide block reorganization which impacts significantly more wallets than a single private key.

Exacerbating matters, traditional financial firms and certificate authorities show similar vulnerabilities to cryptocurrency networks, relying on insecure algorithms that provide guarantees sufficient only for classical computing. The Hoover Institute estimates that over $3.3 trillion in value hangs in the balance as financial contagion threatens to expand damages from the first quantum victim to the rest of the free market.

### Challenges & Opportunities in Post-quantum Readiness

Any serious attempt to rectify the lackluster adoption of these necessary upgrades must grapple with the challenges that have hindered uptake in previous post-quantum protocols:\


| Key Considerations                                                                                                                                                          | The Solution Must…                                                                                                                  |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Initial costs of a quantum computing attack filter viable targets down to very large wallets, and larger post-quantum signatures create significant negative externalities. | be adoptable in part or in whole by individuals without any requirements for change to the underlying protocols.                    |
| Clients do not wish to give up any capabilities of their assets for post-quantum security or otherwise split liquidity.                                                     | use native primitives on each network and maintain external interfaces of standard user accounts while staying post-quantum secure. |
| There is a huge risk associated with moving locked funds onto a less secure ledger.                                                                                         | provide the same security guarantees wherever the client chooses to transact.                                                       |
