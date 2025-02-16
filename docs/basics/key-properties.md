---
icon: key
---

# Key Properties

In order to ensure the successful adoption of the standard, the Quip Network must exhibit four pairs of properties: post-quantum and classically secure, native and portable, transparent and composable, liquid and bondable.

1. **Post-quantum and Classically Secure**

While there are many proposed post-quantum algorithms, none have been battle-tested by actual quantum attackers, and some may even remain vulnerable to attacks via classical computing methods.

For this reason, the Quip architecture should wrap a battle-tested cryptographic primitive such as ECC with a post-quantum primitive such as WOTS, so the end user can benefit from both layers of security. Where possible, the protocol should give the user choice over the post-quantum algorithm that wraps the classical primitive.

2. **Native and Portable**

Consumers do not want to move funds to yet another transaction network, as splitting the client’s liquidity across multiple networks reduces the leverage and capabilities available to that client. Additionally, a client does not want to lose post-quantum security because they migrated their funds from one transaction network to another.

Wherever possible, the Quip architecture should empower clients to remain on the protocols where they already hold funds while still receiving the benefit of post-quantum security, even when a Turing-complete smart contract language is not available. Furthermore, once the client has locked funds on one chain, they should be able to withdraw equivalent value on another chain at the minimum shared clock cycle.

3. **Transparent and Composable**

Bridging funds between chains and executing cross-chain intents is a convoluted and error-prone process. Many oracular and bridging protocols rely on decentralized validator networks to monitor the latest state on source and destination networks, where malicious nodes can be slashed for any perfidy. Such protocols are vulnerable to cartels, require significant resources to support new network deployments, and remain opaque to the end-user in the event of defection.

In contrast, the Quip architecture should prioritize transparency for the direct participants in the transaction, who may reveal all the information required to unwrap a post-quantum signature offline if they so wish. This process should be isolated, asynchronous, and concurrent, and should support the arbitrary composition of functions on dissimilar protocols, such that the outputs of a function on one network can be coerced into the inputs of arbitrary functions on the second network.

4. **Liquid and Bondable**

Splitting liquidity is an enormous problem for consumers in the cryptocurrency industry, where clients must maintain balances on multiple chains in order to transact. Building on the difficulties of cross-chain intents, there are few resources that can bond funds on one-chain to deploy equivalent capital on another in an atomic and verifiable fashion.

Ultimately, the Quip architecture should enable a process whereby any funds on any chain can be wrapped in a post-quantum signature and used as collateral or consideration for equivalent value on any other chain.

{% hint style="info" %}
If you have multiple files, GitBook makes it easy to import full repositories too — allowing you to keep your GitBook content in sync.
{% endhint %}
